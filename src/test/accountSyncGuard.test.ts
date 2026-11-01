import { describe, expect, it } from 'vitest';
import { AccountSyncGuard } from '@/shared/services/accountSyncGuard';

describe('AccountSyncGuard', () => {
  it('rejects a stale user A synchronization after switching to user B', () => {
    const guard = new AccountSyncGuard();
    const userAGeneration = guard.begin('user-a');
    const writes: string[] = [];

    guard.begin('user-b');
    guard.complete('user-a', userAGeneration);
    if (guard.canWrite('user-b')) writes.push('user-a-data');

    expect(guard.canWrite('user-a')).toBe(false);
    expect(guard.canWrite('user-b')).toBe(false);
    expect(writes).toEqual([]);
  });

  it('allows user B writes only after user B synchronization completes', () => {
    const guard = new AccountSyncGuard();
    const userBGeneration = guard.begin('user-b');

    expect(guard.canWrite('user-b')).toBe(false);
    guard.complete('user-b', userBGeneration);
    expect(guard.canWrite('user-b')).toBe(true);
  });
});
