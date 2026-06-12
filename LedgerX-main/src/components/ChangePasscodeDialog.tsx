/**
 * ChangePasscodeDialog.tsx – Passcode rotation UI (PHASE 9)
 *
 * Exposes the `changePasscode()` action from useAppStore in a modal dialog.
 * Uses the OWASP-compliant passwordValidator to enforce strong new passcodes.
 *
 * UX:
 *   1. User enters current passcode (verified by AES-GCM decrypt)
 *   2. User enters new passcode (OWASP strength enforced)
 *   3. User confirms new passcode
 *   4. On submit → useAppStore.changePasscode() → re-encrypts all data
 *   5. Success toast → dialog closes
 *   6. Error states shown inline (wrong current passcode, mismatch, weak password)
 */
import { useState } from 'react';
import { useAppStore }     from '@/shared/stores/useAppStore';
import { validatePassword, checkRequirements } from '@/features/auth/services/passwordValidator';
import { toast }           from '@/hooks/use-toast';

interface Props {
  open:     boolean;
  onClose:  () => void;
}

export function ChangePasscodeDialog({ open, onClose }: Props) {
  const changePasscode = useAppStore(s => s.changePasscode);
  const unlocking      = useAppStore(s => s.unlocking);

  const [oldPass,    setOldPass]    = useState('');
  const [newPass,    setNewPass]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error,      setError]      = useState('');

  if (!open) return null;

  const requirements = checkRequirements(newPass);
  const { valid: newPassValid } = validatePassword(newPass);

  const handleSubmit = async () => {
    setError('');

    if (!oldPass) { setError('Enter your current passcode.'); return; }
    if (!newPassValid) { setError('New passcode does not meet security requirements.'); return; }
    if (newPass !== confirmPass) { setError('New passcodes do not match.'); return; }
    if (newPass === oldPass)     { setError('New passcode must differ from the current one.'); return; }

    try {
      await changePasscode(oldPass, newPass);
      toast({ title: 'Passcode changed', description: 'All data has been re-encrypted with your new passcode.' });
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change passcode.';
      if (msg.toLowerCase().includes('incorrect')) {
        setError('Current passcode is incorrect.');
      } else {
        setError(msg);
      }
    }
  };

  const handleClose = () => {
    setOldPass(''); setNewPass(''); setConfirmPass(''); setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Change passcode"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-[420px] max-w-[95vw] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Change Passcode</h2>
          <button
            onClick={handleClose}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Changing your passcode re-encrypts all stored data with the new key.
          This may take a moment.
        </p>

        {/* Current passcode */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1.5">Current passcode</label>
          <input
            type="password"
            value={oldPass}
            onChange={e => setOldPass(e.target.value)}
            placeholder="Enter current passcode"
            disabled={unlocking}
            autoComplete="current-password"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
        </div>

        {/* New passcode */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1.5">New passcode</label>
          <input
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="Min 12 chars, uppercase, number, symbol"
            disabled={unlocking}
            autoComplete="new-password"
            aria-describedby="new-pass-requirements"
            className={`w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:border-primary transition-colors disabled:opacity-50 ${
              newPass && !newPassValid ? 'border-destructive' : 'border-border'
            }`}
          />
        </div>

        {/* Requirements checklist */}
        {newPass.length > 0 && (
          <div id="new-pass-requirements" className="mb-3 space-y-1" aria-label="Password requirements">
            {requirements.map(req => (
              <div key={req.name} className={`flex items-center gap-2 text-[11px] ${req.met ? 'text-green-600' : 'text-muted-foreground'}`}>
                <span aria-hidden="true">{req.met ? '✓' : '○'}</span>
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Confirm passcode */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5">Confirm new passcode</label>
          <input
            type="password"
            value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !unlocking && handleSubmit()}
            placeholder="Re-enter new passcode"
            disabled={unlocking}
            autoComplete="new-password"
            className={`w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:border-primary transition-colors disabled:opacity-50 ${
              confirmPass && confirmPass !== newPass ? 'border-destructive' : 'border-border'
            }`}
          />
          {confirmPass && confirmPass !== newPass && (
            <p className="text-[11px] text-destructive mt-1">Passcodes do not match</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-destructive mb-3" role="alert">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            disabled={unlocking}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={unlocking || !oldPass || !newPassValid || newPass !== confirmPass}
            aria-busy={unlocking}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {unlocking && (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            )}
            {unlocking ? 'Rotating…' : 'Change Passcode'}
          </button>
        </div>
      </div>
    </div>
  );
}
