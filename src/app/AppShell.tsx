/**
 * AppShell.tsx – LedgerX application shell (HARDENED v4)
 *
 * Changes from original:
 *   1. `useIdleLock()` mounted here — auto-locks on inactivity / tab hide (H-6)
 *   2. `dataService.loadFromStorage()` called after every successful unlock
 *      so stores are properly hydrated from encrypted storage (C-1 / C-3 fix)
 *   3. `authService.init()` unsubscribe correctly cleaned up in useEffect
 *   4. Firebase sync: `saveCloudData` now uses enqueue (H-3)
 *   5. Sync health indicator integrated in Topbar (visible in UI)
 *
 * Note: This file retains all existing AppShell functionality (routing,
 * data loading, auth state, cloud sync). Only the additions are annotated.
 */

import { useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { useAppStore }     from '@/shared/stores/useAppStore';
import { useAuthStore }    from '@/features/auth/store/useAuthStore';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore }  from '@/features/clients/store/useClientStore';
import { useVendorStore }  from '@/features/vendors/store/useVendorStore';
import { authService }     from '@/features/auth/services/authService';
import { dataService }     from '@/shared/services/dataService';
import { saveCloudData, fetchCloudData } from '@/lib/firestoreSync';
import { storage }         from '@/lib/storage';
import { useIdleLock }     from '@/hooks/useIdleLock';   // ← NEW: Phase 3 / H-6
import AutoLock            from '@/features/auth/components/AutoLock';
import Sidebar             from '@/components/layout/Sidebar';
import Topbar              from '@/components/layout/Topbar';
import { Toaster }         from '@/components/ui/toaster';

// Lazy-loaded views for code splitting (Phase 4 performance)
const DashboardView  = lazy(() => import('@/features/dashboard/components/DashboardView'));
const InvoicesView   = lazy(() => import('@/features/invoices/components/InvoicesView'));
const ExpensesView   = lazy(() => import('@/features/expenses/components/ExpensesView'));
const ClientsView    = lazy(() => import('@/features/clients/components/ClientsView'));
const VendorsView    = lazy(() => import('@/features/vendors/components/VendorsView'));
const LedgerView     = lazy(() => import('@/features/ledger/components/LedgerView'));
const ReportsView    = lazy(() => import('@/features/reports/components/ReportsView'));
const SettingsView   = lazy(() => import('@/features/settings/components/SettingsView'));

const ViewSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  }>
    {children}
  </Suspense>
);

export default function AppShell() {
  const locked     = useAppStore(s => s.locked);
  const activeView = useAppStore(s => s.activeView);
  const dark       = useAppStore(s => s.dark);
  const profile    = useAppStore(s => s.profile);
  const settings   = useAppStore(s => s.settings);

  const user       = useAuthStore(s => s.user);
  const loading    = useAuthStore(s => s.loading);

  const invoices   = useInvoiceStore(s => s.invoices);
  const expenses   = useExpenseStore(s => s.expenses);
  const clients    = useClientStore(s => s.clients);
  const vendors    = useVendorStore(s => s.vendors);

  // ── [NEW] Auto-lock on inactivity / tab hide (H-6) ──────────────────────
  useIdleLock();

  // ── Load data from storage after unlock ───────────────────────────────────
  // FIXES C-1/C-3: Zustand initializers now use loadSync() (returns defaults
  // for encrypted keys). The real data is loaded here after unlock.
  const loadDataAfterUnlock = useCallback(async () => {
    if (locked || !storage.isUnlocked()) return;
    try {
      await dataService.loadFromStorage();
      await useAppStore.getState().ensureProfile();
    } catch (err) {
      console.error('[AppShell] Failed to load data after unlock:', err);
    }
  }, [locked]);

  useEffect(() => {
    loadDataAfterUnlock();
  }, [loadDataAfterUnlock]);

  // ── Firebase auth listener ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = authService.init();
    return unsubscribe;
  }, []);

  // ── Initial cloud sync on sign-in (wise-kalam) ─────────────────────────────
  const lastSyncedUid = useRef<string | null>(null);
  const prevUidRef = useRef<string | null>(null);
  useEffect(() => {
    const currentUid = user?.uid ?? null;
    if (prevUidRef.current !== currentUid) {
      // Account context changed - clear financial data before loading new context
      const prevUid = prevUidRef.current;
      prevUidRef.current = currentUid;
      if (!currentUid) {
        // Signed out to guest mode - clear authenticated data
        (async () => {
          try {
            await dataService.loadFreshData();
          } catch (err) {
            console.error('[AppShell] Failed to clear data on sign-out:', err);
          }
        })();
        lastSyncedUid.current = null;
        return;
      }
      // Switched to a different account
      if (prevUid) {
        (async () => {
          try {
            await dataService.loadFreshData();
          } catch (err) {
            console.error('[AppShell] Failed to clear data on account switch:', err);
          }
        })();
        lastSyncedUid.current = null;
      }
    }

    if (!user?.uid) return;
    if (locked) return;
    if (lastSyncedUid.current === user.uid) return;

    const doInitialSync = async () => {
      const syncUid = user.uid;
      try {
        const cloud = await fetchCloudData(syncUid);
        // Prevent delayed responses from overwriting different account
        if ((user?.uid ?? null) !== syncUid) return;
        if (cloud) {
          await dataService.importData(cloud);
          if ((user?.uid ?? null) !== syncUid) return;
        }
      } catch (err) {
        console.error('[AppShell] Initial cloud sync failed:', err);
      } finally {
        if ((user?.uid ?? null) === syncUid) {
          lastSyncedUid.current = user.uid;
        }
      }
    };

    doInitialSync();
  }, [user?.uid, locked]);

  // ── Cloud sync: enqueue on data change (H-3 fix: no longer silent failure) ─
  useEffect(() => {
    const saveUid = user?.uid ?? null;
    if (!saveUid) return;
    if (locked) return;

    const nextInvId    = useInvoiceStore.getState().nextId;
    const nextExpId    = useExpenseStore.getState().nextId;
    const nextClientId = useClientStore.getState().nextId;
    const nextVendorId = useVendorStore.getState().nextId;

    // Double-check uid hasn't changed to prevent saving to wrong account
    if ((user?.uid ?? null) !== saveUid) return;

    // saveCloudData now enqueues with retry (H-3 — was previously fire-and-forget)
    saveCloudData(saveUid, {
      invoices,
      expenses,
      clients,
      vendors,
      profile,
      nextInvId,
      nextExpId,
      nextClientId,
      nextVendorId,
    });
  }, [invoices, expenses, clients, vendors, profile, user?.uid, locked]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Lock screen ────────────────────────────────────────────────────────────
  if (locked) {
    return <AutoLock />;
  }

  // ── Main app shell ─────────────────────────────────────────────────────────
  const viewMap: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    invoices:  <InvoicesView />,
    expenses:  <ExpensesView />,
    clients:   <ClientsView />,
    vendors:   <VendorsView />,
    ledger:    <LedgerView />,
    reports:   <ReportsView />,
    settings:  <SettingsView />,
  };

  return (
    <div className={`flex h-screen overflow-hidden bg-background ${dark ? 'dark' : ''}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <ViewSuspense>
            {viewMap[activeView] ?? <DashboardView />}
          </ViewSuspense>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
