import { useState } from 'react';
import { useAppStore } from '@/shared/stores/useAppStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore } from '@/features/clients/store/useClientStore';
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import { FY_OPTIONS, CURRENCY_OPTIONS } from '@/shared/utils/constants';
import { storage } from '@/shared/services/storageService';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile, saveSettings, setupEncryption } = useAppStore();
  const user = useAuthStore(s => s.user);
  const logOut = useAuthStore(s => s.logOut);
  const p = profile || { name: '', role: 'Admin', city: '', businessName: 'LedgerX', fiscalYear: 'Apr-Mar', currency: '₹', dataChoice: '' };

  const [name, setName] = useState(p.name);
  const [role, setRole] = useState(p.role);
  const [city, setCity] = useState(p.city);
  const [biz, setBiz] = useState(p.businessName);
  const [fy, setFy] = useState(p.fiscalYear);
  const [currency, setCurrency] = useState(p.currency);
  const [passcode, setPasscode] = useState('');

  const handleSave = () => {
    saveSettings({ name, role, city, businessName: biz, fiscalYear: fy, currency });
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    if (!confirm('Are you sure you want to reset ALL application data? This will delete all invoices, expenses, clients, vendors, and notifications. Your profile settings will be preserved. This action cannot be undone.')) return;
    storage.clearAppData();
    useInvoiceStore.getState().reset();
    useExpenseStore.getState().reset();
    useClientStore.getState().reset();
    useVendorStore.getState().reset();
    toast.success('Application data has been reset');
  };

  const handleSetupEncryption = () => {
    if (passcode.length < 4) { toast.error('Passcode must be at least 4 characters'); return; }
    setupEncryption(passcode);
    setPasscode('');
    toast.success('Encryption enabled. Your data is now secured.');
  };

  const handleLogout = async () => {
    if (!confirm('Sign out of your account? Your data will remain synced in the cloud.')) return;
    try {
      await logOut();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const exportData = () => {
    const data = {
      invoices: useInvoiceStore.getState().invoices,
      expenses: useExpenseStore.getState().expenses,
      clients: useClientStore.getState().clients,
      vendors: useVendorStore.getState().vendors,
      profile,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'ledgerx-backup.json'; a.click();
    toast.success('Data exported successfully');
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xl font-bold tracking-tight">Settings</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">Manage your profile and application preferences</div>
        </div>
        <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">Save Changes</button>
      </div>

      {/* Profile */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Profile</div>
        <div className="space-y-3">
          {[
            { label: 'Full Name', sub: 'Shown in greetings and the sidebar', value: name, onChange: setName, placeholder: 'e.g. Arjun Kumar' },
            { label: 'Role / Title', sub: 'Your position in the business', value: role, onChange: setRole, placeholder: 'e.g. Owner, Admin' },
            { label: 'City / Location', sub: 'Shown in the sidebar footer', value: city, onChange: setCity, placeholder: 'e.g. Bangalore' },
          ].map(f => (
            <div key={f.label} className="grid grid-cols-[180px_1fr] items-center gap-3.5 py-3 border-b border-border last:border-0">
              <div><label className="text-[13px] font-medium">{f.label}</label><div className="text-[11.5px] text-muted-foreground mt-0.5">{f.sub}</div></div>
              <input value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder} className="border border-border rounded-lg px-3 py-[7px] text-[13px] bg-background outline-none focus:border-primary transition-colors w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Business */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Business Details</div>
        <div className="space-y-3">
          <div className="grid grid-cols-[180px_1fr] items-center gap-3.5 py-3 border-b border-border">
            <div><label className="text-[13px] font-medium">Business Name</label><div className="text-[11.5px] text-muted-foreground mt-0.5">Used in invoices and reports</div></div>
            <input value={biz} onChange={e => setBiz(e.target.value)} placeholder="e.g. Acme Pvt. Ltd." className="border border-border rounded-lg px-3 py-[7px] text-[13px] bg-background outline-none focus:border-primary transition-colors w-full" />
          </div>
          <div className="grid grid-cols-[180px_1fr] items-center gap-3.5 py-3 border-b border-border">
            <div><label className="text-[13px] font-medium">Fiscal Year</label></div>
            <select value={fy} onChange={e => setFy(e.target.value)} className="border border-border rounded-lg px-3 py-[7px] text-[13px] bg-background outline-none focus:border-primary transition-colors w-full">
              {FY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-[180px_1fr] items-center gap-3.5 py-3">
            <div><label className="text-[13px] font-medium">Currency Symbol</label></div>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="border border-border rounded-lg px-3 py-[7px] text-[13px] bg-background outline-none focus:border-primary transition-colors w-full">
              {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Security & Encryption</div>
        <div className="grid grid-cols-[180px_1fr] items-center gap-3.5 py-3 border-b border-border">
          <div><label className="text-[13px] font-medium">Encryption Passcode</label><div className="text-[11.5px] text-muted-foreground mt-0.5">Encrypts all data in localStorage</div></div>
          <div className="flex gap-2">
            <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="Set a passcode (min 4 chars)" className="border border-border rounded-lg px-3 py-[7px] text-[13px] bg-background outline-none focus:border-primary transition-colors flex-1" />
            <button onClick={handleSetupEncryption} className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap">Enable Encryption</button>
          </div>
        </div>
        <div className="grid grid-cols-[180px_1fr] items-center gap-3.5 py-3">
          <div><label className="text-[13px] font-medium">Export Data</label><div className="text-[11.5px] text-muted-foreground mt-0.5">Download a JSON backup</div></div>
          <button onClick={exportData} className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors w-fit">Export All Data</button>
        </div>
      </div>

      {/* Account */}
      {user && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account</div>
          <div className="grid grid-cols-[180px_1fr] items-center gap-3.5 py-3">
            <div>
              <label className="text-[13px] font-medium">Signed in as</label>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors w-fit"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Data Management</div>
        <div className="rounded-xl p-5" style={{ background: 'hsl(var(--destructive) / 0.08)', border: '1px solid hsl(var(--destructive) / 0.15)' }}>
          <div className="text-[13px] font-semibold text-destructive mb-1.5">⚠ Reset All Data</div>
          <div className="text-xs text-destructive/80 mb-3.5">This will permanently delete all invoices, expenses, clients, vendors, and notifications. Your profile settings will be kept.</div>
          <button onClick={handleReset} className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-destructive text-destructive-foreground cursor-pointer hover:opacity-90 transition-opacity">Reset Application Data</button>
        </div>
      </div>
    </div>
  );
}
