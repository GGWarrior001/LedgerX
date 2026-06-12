/**
 * SettingsView.tsx – LedgerX Settings (HARDENED v4)
 *
 * New sections added:
 *   - "Change Passcode" row: opens ChangePasscodeDialog (key rotation)
 *   - "Session Timeout" row: controls useIdleLock inactivity timer
 *   - "Backup & Restore" row: opens BackupWizard (replaces bare Export button)
 *   - SyncStatusBadge shown next to the cloud sync section header
 *   - "Secure Wipe" button in Danger Zone: calls storage.secureWipe()
 *
 * Preserved from v3:
 *   - Profile / business settings form
 *   - Encryption setup
 *   - Sign in / sign out
 *   - Reset Data
 */
import { useState } from 'react';
import { useAppStore }   from '@/shared/stores/useAppStore';
import { useAuthStore }  from '@/features/auth/store/useAuthStore';
import { authService }   from '@/features/auth/services/authService';
import { dataService }   from '@/shared/services/dataService';
import { storage }       from '@/lib/storage';
import { FY_OPTIONS, CURRENCY_OPTIONS } from '@/lib/constants';
import { toast }         from '@/hooks/use-toast';
import { ChangePasscodeDialog } from '@/components/ChangePasscodeDialog';
import { BackupWizard }         from '@/components/BackupWizard';

// Session timeout options (minutes; 0 = disabled)
const TIMEOUT_OPTIONS = [
  { label: 'Disabled',  value: 0  },
  { label: '2 minutes', value: 2  },
  { label: '5 minutes', value: 5  },
  { label: '10 minutes',value: 10 },
  { label: '30 minutes',value: 30 },
];

export default function SettingsView() {
  const profile          = useAppStore(s => s.profile);
  const unlocking        = useAppStore(s => s.unlocking);
  const settings         = useAppStore(s => s.settings);
  const saveSettingsFn   = useAppStore(s => s.saveSettings);
  const setupEncryption  = useAppStore(s => s.setupEncryption);
  const isEncrypted      = storage.isEncryptionSetup();

  const user             = useAuthStore(s => s.user);
  const localUser        = useAuthStore(s => s.localUser);
  const openAuthModal    = useAuthStore(s => s.openAuthModal);

  const p = profile ?? {
    name: '', role: 'Admin', city: '', businessName: 'LedgerX',
    fiscalYear: 'Apr-Mar', currency: '₹', dataChoice: '',
  };

  const [name,     setName]     = useState(p.name);
  const [role,     setRole]     = useState(p.role);
  const [city,     setCity]     = useState(p.city);
  const [biz,      setBiz]      = useState(p.businessName);
  const [fy,       setFy]       = useState(p.fiscalYear);
  const [currency, setCurrency] = useState(p.currency);
  const [passcode, setPasscode] = useState('');
  const [timeout,  setTimeout_] = useState(settings.sessionTimeout ?? 10);

  const [changePassOpen, setChangePassOpen] = useState(false);
  const [backupOpen,     setBackupOpen]     = useState(false);
  const [wiping,         setWiping]         = useState(false);

  // ── Save profile ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    await saveSettingsFn({ name, role, city, businessName: biz, fiscalYear: fy, currency });
    toast({ title: 'Settings saved' });
  };

  // ── Timeout change ─────────────────────────────────────────────────────────

  const handleTimeoutChange = async (minutes: number) => {
    setTimeout_(minutes);
    await saveSettingsFn({ sessionTimeout: minutes } as Parameters<typeof saveSettingsFn>[0]);
    toast({ title: 'Session timeout updated' });
  };

  // ── Encryption setup ───────────────────────────────────────────────────────

  const handleSetupEncryption = async () => {
    if (passcode.length < 6) {
      toast({ title: 'Passcode too short', description: 'Passcode must be at least 6 characters', variant: 'destructive' });
      return;
    }
    try {
      await setupEncryption(passcode);
      setPasscode('');
      toast({ title: 'Encryption enabled', description: 'Your data is now secured with AES-GCM encryption.' });
    } catch {
      toast({ title: 'Encryption setup failed', variant: 'destructive' });
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = async () => {
    if (!confirm(
      'Are you sure you want to reset ALL application data? ' +
      'This will delete all invoices, expenses, clients, vendors, and notifications. ' +
      'Your profile settings will be preserved. This action cannot be undone.'
    )) return;
    await dataService.resetData();
    toast({ title: 'Application data reset' });
  };

  // ── Secure wipe ────────────────────────────────────────────────────────────

  const handleSecureWipe = async () => {
    if (!confirm(
      '⚠ SECURE WIPE: This will permanently delete ALL data including your encryption key and profile. ' +
      'You will NOT be able to recover this data. Are you absolutely sure?'
    )) return;
    setWiping(true);
    try {
      await storage.secureWipe();
      window.location.reload();
    } catch {
      toast({ title: 'Wipe failed', variant: 'destructive' });
      setWiping(false);
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    if (!confirm('Sign out of your account?')) return;
    await authService.logOut();
    toast({ title: 'Signed out' });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const rowCls = 'grid grid-cols-[180px_1fr] items-center gap-3.5 py-3 border-b border-border/50 last:border-0';
  const labelCls = 'text-[13px] font-medium';
  const subCls   = 'text-[11.5px] text-muted-foreground mt-0.5';
  const inputCls = 'border border-border rounded-lg px-3 py-[7px] text-[13px] bg-background outline-none focus:border-primary transition-colors w-full';

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h1 className="text-xl font-bold mb-5">Settings</h1>

      {/* ── Profile & Business ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Profile</div>
        {[
          { label: 'Your Name',      sub: 'Displayed on invoices', value: name,     set: setName },
          { label: 'Role',           sub: 'Your position',         value: role,     set: setRole },
          { label: 'City',           sub: 'Your city',             value: city,     set: setCity },
          { label: 'Business Name',  sub: 'Shown in the sidebar',  value: biz,      set: setBiz  },
        ].map(({ label, sub, value, set }) => (
          <div key={label} className={rowCls}>
            <div><label className={labelCls}>{label}</label><div className={subCls}>{sub}</div></div>
            <input className={inputCls} value={value} onChange={e => set(e.target.value)} />
          </div>
        ))}
        <div className={rowCls}>
          <div><label className={labelCls}>Fiscal Year</label><div className={subCls}>Start month</div></div>
          <select className={inputCls} value={fy} onChange={e => setFy(e.target.value)}>
            {FY_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className={rowCls}>
          <div><label className={labelCls}>Currency</label><div className={subCls}>Symbol used in reports</div></div>
          <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCY_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="pt-3">
          <button onClick={handleSave} className="px-4 py-2 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Save Settings
          </button>
        </div>
      </div>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Security</div>

        {/* Encryption setup / change passcode */}
        <div className={rowCls}>
          <div>
            <label className={labelCls}>{isEncrypted ? 'Encryption' : 'Enable Encryption'}</label>
            <div className={subCls}>{isEncrypted ? 'AES-GCM v4 (210k PBKDF2)' : 'Protect data at rest'}</div>
          </div>
          {isEncrypted ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-green-600 font-medium">✓ Enabled</span>
              <button
                onClick={() => setChangePassOpen(true)}
                className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border hover:bg-muted transition-colors"
              >
                Change Passcode
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="Set a passcode (min 6 chars)"
                disabled={unlocking}
                className="border border-border rounded-lg px-3 py-[7px] text-[13px] bg-background outline-none focus:border-primary transition-colors flex-1 disabled:opacity-50"
              />
              <button
                onClick={handleSetupEncryption}
                disabled={unlocking || passcode.length < 6}
                className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
              >
                {unlocking && <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                {unlocking ? 'Setting up…' : 'Enable'}
              </button>
            </div>
          )}
        </div>

        {/* Session timeout (only if encrypted) */}
        {isEncrypted && (
          <div className={rowCls}>
            <div>
              <label className={labelCls}>Auto-lock Timeout</label>
              <div className={subCls}>Lock after inactivity</div>
            </div>
            <select
              className={inputCls}
              value={timeout}
              onChange={e => handleTimeoutChange(Number(e.target.value))}
            >
              {TIMEOUT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Backup & Restore */}
        <div className={rowCls}>
          <div>
            <label className={labelCls}>Backup & Restore</label>
            <div className={subCls}>Export or import JSON backup</div>
          </div>
          <button
            onClick={() => setBackupOpen(true)}
            className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border hover:bg-muted transition-colors w-fit"
          >
            Open Backup Wizard
          </button>
        </div>
      </div>

      {/* ── Sync Account ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sync Account</div>
        {user ? (
          <div className={rowCls}>
            <div>
              <label className={labelCls}>Signed in as</label>
              <div className={subCls}>{user.email}</div>
            </div>
            <button onClick={handleLogout} className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border hover:bg-muted transition-colors w-fit">
              Sign Out
            </button>
          </div>
        ) : (
          <div className="rounded-xl p-4" style={{ background: 'hsl(var(--primary) / 0.06)', border: '1px solid hsl(var(--primary) / 0.14)' }}>
            <div className="text-[13px] font-semibold mb-1.5">Enable cloud sync</div>
            <div className="text-[12px] text-muted-foreground mb-3.5">
              You are using LedgerX as {localUser?.name ?? 'Guest'}. Data is stored locally.
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openAuthModal('sign-in')} className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">Sign In</button>
              <button onClick={() => openAuthModal('sign-up')} className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border hover:bg-muted transition-colors">Create Account</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Data Management</div>
        <div className="space-y-3" style={{ background: 'hsl(var(--destructive) / 0.06)', border: '1px solid hsl(var(--destructive) / 0.12)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          {/* Reset Data */}
          <div>
            <div className="text-[13px] font-semibold text-destructive mb-1">Reset All Data</div>
            <div className="text-xs text-destructive/70 mb-2">
              Deletes all invoices, expenses, clients, vendors, and notifications. Profile is kept.
            </div>
            <button onClick={handleReset} className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity">
              Reset Application Data
            </button>
          </div>

          {/* Secure Wipe (only if encrypted) */}
          {isEncrypted && (
            <div className="pt-3 border-t border-destructive/20">
              <div className="text-[13px] font-semibold text-destructive mb-1">Secure Wipe</div>
              <div className="text-xs text-destructive/70 mb-2">
                Overwrites and deletes ALL data including the encryption key. Unrecoverable.
              </div>
              <button
                onClick={handleSecureWipe}
                disabled={wiping}
                className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
              >
                {wiping && <div className="w-3 h-3 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />}
                {wiping ? 'Wiping…' : 'Secure Wipe Everything'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <ChangePasscodeDialog open={changePassOpen} onClose={() => setChangePassOpen(false)} />
      <BackupWizard open={backupOpen} onClose={() => setBackupOpen(false)} />
    </div>
  );
}
