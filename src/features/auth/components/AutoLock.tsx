import { useState } from 'react';
import { useAppStore } from '@/shared/stores/useAppStore';
import { toast } from 'sonner';

export default function AutoLock() {
  const unlock = useAppStore(s => s.unlock);
  const unlocking = useAppStore(s => s.unlocking);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUnlock = async () => {
    if (!passcode) {
      setError(true);
      setErrorMsg('Enter your passcode');
      return;
    }
    setError(false);
    setErrorMsg('');

    try {
      await unlock(passcode);
    } catch (err) {
      setError(true);
      setErrorMsg('Incorrect passcode. Please try again.');
      setPasscode('');
      console.error('[LedgerX]', err);
    }
  };

  return (
    <div className="auto-lock-overlay">
      <div
        className="bg-card rounded-2xl p-8 w-[380px] max-w-[95vw] text-center"
        style={{ animation: 'fadeIn 300ms ease' }}
      >
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-lg font-bold mx-auto mb-4">
          LX
        </div>
        <h2 className="text-lg font-bold mb-1">Session Locked</h2>
        <p className="text-sm text-muted-foreground mb-5">
          {unlocking ? 'Deriving encryption key... please wait' : 'Enter your passcode to unlock LedgerX'}
        </p>
        <input
          type="password"
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !unlocking && handleUnlock()}
          placeholder="Enter passcode"
          autoFocus
          disabled={unlocking}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:border-primary transition-colors mb-3 disabled:opacity-50 ${
            error ? 'border-destructive' : 'border-border'
          }`}
        />
        {error && (
          <p className="text-xs text-destructive mb-3">
            {errorMsg}
          </p>
        )}
        <button
          onClick={handleUnlock}
          disabled={unlocking}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {unlocking && (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          )}
          {unlocking ? 'Unlocking...' : 'Unlock'}
        </button>
      </div>
    </div>
  );
}
