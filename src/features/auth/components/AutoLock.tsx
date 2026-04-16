import { useState } from 'react';
import { useAppStore } from '@/shared/stores/useAppStore';

export default function AutoLock() {
  const unlock = useAppStore(s => s.unlock);
  const [passcode, setPasscode] = useState('');
  const [error, setError]       = useState(false);

  const handleUnlock = () => {
    if (unlock(passcode)) {
      setError(false);
    } else {
      setError(true);
      setPasscode('');
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
          Enter your passcode to unlock LedgerX
        </p>
        <input
          type="password"
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          placeholder="Enter passcode"
          autoFocus
          className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-background outline-none focus:border-primary transition-colors mb-3 ${
            error ? 'border-destructive' : 'border-border'
          }`}
        />
        {error && (
          <p className="text-xs text-destructive mb-3">
            Incorrect passcode. Please try again.
          </p>
        )}
        <button
          onClick={handleUnlock}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}
