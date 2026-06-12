/**
 * useIdleLock – automatic session lock on inactivity (PHASE 3 / H-6)
 *
 * Fixes H-6: AutoLock.tsx had no idle timer; encryption was never auto-triggered.
 *
 * Behavior:
 * - Resets on `pointermove`, `keydown`, `mousedown`, `touchstart` events
 * - Locks immediately on `visibilitychange` → hidden (tab switch / app background)
 * - Respects `settings.sessionTimeout` (minutes, 0 = disabled)
 * - Cleans up all listeners on unmount
 *
 * Usage in AppShell:
 *   useIdleLock();
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/shared/stores/useAppStore';

const ACTIVITY_EVENTS = [
  'pointermove',
  'keydown',
  'mousedown',
  'touchstart',
] as const;

export function useIdleLock(): void {
  const locked      = useAppStore(s => s.locked);
  const lock        = useAppStore(s => s.lock);
  const settings    = useAppStore(s => s.settings);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeoutMs = (settings.sessionTimeout ?? 10) * 60 * 1000;
  const isEnabled = settings.encryptionEnabled && timeoutMs > 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    if (!isEnabled || locked) return;
    timerRef.current = setTimeout(() => {
      lock();
    }, timeoutMs);
  }, [clearTimer, isEnabled, locked, lock, timeoutMs]);

  // Lock immediately on tab/app hidden
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && isEnabled && !locked) {
      clearTimer();
      lock();
    }
  }, [clearTimer, isEnabled, locked, lock]);

  useEffect(() => {
    if (!isEnabled || locked) {
      clearTimer();
      return;
    }

    // Start the timer
    resetTimer();

    // Register activity listeners
    const onActivity = () => resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEnabled, locked, resetTimer, clearTimer, handleVisibilityChange]);
}
