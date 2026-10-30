export class AccountSyncGuard {
  private activeUid: string | null = null;
  private readyUid: string | null = null;
  private generation = 0;

  begin(uid: string): number {
    this.activeUid = uid;
    this.readyUid = null;
    this.generation += 1;
    return this.generation;
  }

  complete(uid: string, generation: number): void {
    if (generation === this.generation && this.activeUid === uid) {
      this.readyUid = uid;
    }
  }

  canWrite(uid: string): boolean {
    return this.activeUid === uid && this.readyUid === uid;
  }
}
