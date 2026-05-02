/**
 * SettingsView — Application settings panel.
 *
 * Phase 3 / Phase 5 additions:
 *   - Minimum 6-character passcode enforced in UI (mirrors store validation)
 *   - Prominent ⚠️ data-loss warning before changing/disabling encryption
 *   - Backup reminder shown whenever encryption is being configured
 */
import { useState } from 'react';
import { useAppStore } from '@/shared/stores/useAppStore';
import { dataService } from '@/shared/services/dataService';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { authService } from '@/features/auth/services/authService';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore } from '@/features/clients/store/useClientStore';
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import { CURRENCY_OPTIONS, FY_OPTIONS } from '@/shared/utils/constants';
import { storage } from '@/lib/storage';

export default function SettingsView() {
  const {
    profile,
    dark,
    settings,
    toggleTheme,
    saveSettings,
    setupEncryption,
    lock,
  } = useAppStore();
  const { user } = useAuthStore();

  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const invoices = useInvoiceStore(s => s.invoices);
  const expenses = useExpenseStore(s => s.expenses);
  const clients = useClientStore(s => s.clients);
  const vendors = useVendorStore(s => s.vendors);

  const handleSetEncryption = () => {
    setPasscodeError('');
    if (passcode.length < 6) {
      setPasscodeError('Passcode must be at least 6 characters.');
      return;
    }
    try {
      setupEncryption(passcode);
      setPasscodeSuccess(true);
      setPasscode('');
      setTimeout(() => setPasscodeSuccess(false), 3000);
    } catch (err) {
      setPasscodeError(err instanceof Error ? err.message : 'Failed to set passcode.');
    }
  };

  const handleExportData = () => {
    const exportData = {
      invoices,
      expenses,
      clients,
      vendors,
      profile,
      exportedAt: new Date().toISOString(),
      version: '1.3.0',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ledgerx-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    dataService.resetData();
    setResetConfirm(false);
  };

  const handleSignOut = async () => {
    // Phase 3: Clear encryption key before signing out
    storage.clearEncryptionKey();
    if (user) await authService.logOut();
  };

  const encryptionEnabled = storage.isEncryptionSetup();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xl font-bold tracking-tight">Settings</div>
          <div className="text-[13px] text-muted-foreground mt-0.5">Manage your profile, security, and preferences</div>
        </div>
      </div>

      {/* ── Profile Section ──────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-[13.5px] font-semibold mb-3.5">Profile & Business</div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="form-field">
            <label>Your Name</label>
            <input
              type="text"
              defaultValue={profile?.name ?? ''}
              onBlur={e => saveSettings({ name: e.target.value })}
              placeholder="e.g. Arjun Kumar"
            />
          </div>
          <div className="form-field">
            <label>Role</label>
            <input
              type="text"
              defaultValue={profile?.role ?? ''}
              onBlur={e => saveSettings({ role: e.target.value })}
              placeholder="e.g. Owner, CFO"
            />
          </div>
          <div className="form-field">
            <label>Business Name</label>
            <input
              type="text"
              defaultValue={profile?.businessName ?? ''}
              onBlur={e => saveSettings({ businessName: e.target.value })}
              placeholder="e.g. Acme Pvt. Ltd."
            />
          </div>
          <div className="form-field">
            <label>City</label>
            <input
              type="text"
              defaultValue={profile?.city ?? ''}
              onBlur={e => saveSettings({ city: e.target.value })}
              placeholder="e.g. Bangalore"
            />
          </div>
          <div className="form-field">
            <label>Currency</label>
            <select
              defaultValue={profile?.currency ?? '₹'}
              onChange={e => saveSettings({ currency: e.target.value })}
            >
              {CURRENCY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Fiscal Year</label>
            <select
              defaultValue={profile?.fiscalYear ?? 'Apr-Mar'}
              onChange={e => saveSettings({ fiscalYear: e.target.value })}
            >
              {FY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-[13.5px] font-semibold mb-3.5">Appearance</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium">Dark Mode</div>
            <div className="text-[11.5px] text-muted-foreground">Toggle between light and dark themes</div>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-11 h-6 rounded-full transition-colors relative ${dark ? 'bg-primary' : 'bg-border'}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${dark ? 'left-5' : 'left-0.5'}`}
            />
          </button>
        </div>
      </section>

      {/* ── Security & Encryption ────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-[13.5px] font-semibold mb-1">Security & Encryption</div>

        {/* Phase 5: Prominent backup/recovery warning */}
        <div className="flex gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3.5 py-3 mb-4 text-[12px] text-warning-foreground">
          <span className="text-base shrink-0">⚠️</span>
          <span>
            <strong>Important:</strong> If you lose your encryption passcode, your data <em>cannot</em> be recovered.
            Always export a backup before changing or disabling encryption.
          </span>
        </div>

        {encryptionEnabled ? (
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-[13px] font-medium text-success">🔒 Encryption Enabled</div>
              <div className="text-[11.5px] text-muted-foreground">Your data is encrypted with AES-256-CBC</div>
            </div>
            <button
              onClick={() => lock()}
              className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors"
            >
              Lock Now
            </button>
          </div>
        ) : (
          <div>
            <div className="text-[13px] mb-2.5 text-muted-foreground">
              Set a passcode to encrypt your locally stored data at rest.
            </div>
            <div className={`form-field ${passcodeError ? 'error' : ''}`}>
              <label>New Passcode <span className="text-muted-foreground font-normal">(min. 6 characters)</span></label>
              <input
                type="password"
                value={passcode}
                onChange={e => { setPasscode(e.target.value); setPasscodeError(''); }}
                placeholder="Enter a secure passcode"
                minLength={6}
              />
              {passcodeError && (
                <span className="text-[11px] text-destructive">{passcodeError}</span>
              )}
              {passcodeSuccess && (
                <span className="text-[11px] text-success">✓ Encryption enabled successfully</span>
              )}
            </div>
            <button
              onClick={handleSetEncryption}
              disabled={passcode.length < 6}
              className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enable Encryption
            </button>
          </div>
        )}
      </section>

      {/* ── Data Management ─────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-[13.5px] font-semibold mb-3.5">Data Management</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportData}
            className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors"
          >
            📥 Export Backup (JSON)
          </button>
          <button
            onClick={handleReset}
            className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium cursor-pointer transition-colors ${
              resetConfirm
                ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                : 'bg-background border border-border hover:bg-muted'
            }`}
          >
            {resetConfirm ? '⚠️ Confirm Reset All Data' : 'Reset All Data'}
          </button>
          {resetConfirm && (
            <button
              onClick={() => setResetConfirm(false)}
              className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-[13.5px] font-semibold mb-3.5">Account</div>
        {user ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium">{user.email}</div>
              <div className="text-[11.5px] text-muted-foreground">Signed in via Firebase</div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-[7px] rounded-lg text-[12.5px] font-medium bg-destructive/10 text-destructive border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="text-[13px] text-muted-foreground">
            Not signed in. Enable cloud sync from the Topbar to sign in.
          </div>
        )}
      </section>
    </div>
  );
}
