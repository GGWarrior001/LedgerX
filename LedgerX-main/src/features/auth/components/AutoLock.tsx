/**
 * AutoLock.tsx – Session lock screen (HARDENED v4)
 *
 * Additions:
 * - Displays remaining lockout time when brute-force backoff is active
 * - Shows attempt count warning after 3 failed attempts
 * - Lockout countdown auto-refreshes via useEffect interval
 * - `changePasscode` deep-link via URL hash (future: `#change-passcode`)
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '@/shared/stores/useAppStore';
import { StorageLockedOutError } from '@/lib/storage';

export default function AutoLock() {
  const unlock            = useAppStore(s => s.unlock);
  const unlocking         = useAppStore(s => s.unlocking);
  const unlockAttempts    = useAppStore(s => s.unlockAttempts);
  const lockoutRemainingMs = useAppStore(s => s.lockoutRemainingMs);
  const refreshLockout    = useAppStore(s => s.refreshLockoutState);

  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Refresh lockout countdown every second
  useEffect(() => {
    if (lockoutRemainingMs <= 0) {
      setCountdown(0);
      return;
    }
    setCountdown(Math.ceil(lockoutRemainingMs / 1000));
    const interval = setInterval(() => {
      refreshLockout();
      const remaining = useAppStore.getState().lockoutRemainingMs;
      if (remaining <= 0) {
        setCountdown(0);
        clearInterval(interval);
      } else {
        setCountdown(Math.ceil(remaining / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemainingMs, refreshLockout]);

  const isLockedOut = countdown > 0;

  const handleUnlock = async () => {
    if (!passcode) {
      setErrorMsg('Enter your passcode');
      return;
    }
    if (isLockedOut) return;

    setErrorMsg('');
    try {
      await unlock(passcode);
    } catch (err) {
      setPasscode('');
      if (err instanceof StorageLockedOutError) {
        refreshLockout();
        return;
      }
      const attempts = useAppStore.getState().unlockAttempts;
      if (attempts >= 5) {
        setErrorMsg(`Too many attempts. Wait ${Math.ceil(useAppStore.getState().lockoutRemainingMs / 1000)}s`);
      } else if (attempts >= 3) {
        setErrorMsg(`Incorrect passcode. ${5 - attempts} attempt${5 - attempts !== 1 ? 's' : ''} remaining before lockout.`);
      } else {
        setErrorMsg('Incorrect passcode. Please try again.');
      }
    }
  };

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="auto-lock-overlay">
      <div
        className="bg-card rounded-2xl p-8 w-[380px] max-w-[95vw] text-center"
        style={{ animation: 'fadeIn 300ms ease' }}
        role="dialog"
        aria-modal="true"
        aria-label="Session locked"
      >
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-lg font-bold mx-auto mb-4">
          LX
        </div>
        <h2 className="text-lg font-bold mb-1">Session Locked</h2>
        <p className="text-sm text-muted-foreground mb-5">
          {unlocking
            ? 'Deriving encryption key… please wait'
            : isLockedOut
            ? `Too many failed attempts.`
            : 'Enter your passcode to unlock LedgerX'}
        </p>

        {isLockedOut ? (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 mb-4 text-sm text-destructive">
            Wait <span className="font-mono font-bold">{formatCountdown(countdown)}</span> before trying again
          </div>
        ) : (
          <>
            <input
              type="password"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !unlocking && handleUnlock()}
              placeholder="Enter passcode"
              autoFocus
              disabled={unlocking}
              aria-label="Passcode"
              aria-invalid={errorMsg !== ''}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:border-primary transition-colors mb-3 disabled:opacity-50 ${
                errorMsg ? 'border-destructive' : 'border-border'
              }`}
            />
            {errorMsg && (
              <p className="text-xs text-destructive mb-3" role="alert">
                {errorMsg}
              </p>
            )}
            {unlockAttempts >= 3 && !errorMsg && (
              <p className="text-xs text-amber-500 mb-3">
                {5 - unlockAttempts} attempt{5 - unlockAttempts !== 1 ? 's' : ''} remaining before temporary lockout
              </p>
            )}
          </>
        )}

        {!isLockedOut && (
          <button
            onClick={handleUnlock}
            disabled={unlocking || isLockedOut}
            aria-busy={unlocking}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {unlocking && (
              <div
                className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
            )}
            {unlocking ? 'Unlocking…' : 'Unlock'}
          </button>
        )}
      </div>
    </div>
  );
}
