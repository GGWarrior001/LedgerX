/**
 * AppShell – the main application shell.
 *
 * Responsibilities:
 *   1. Initialize the Firebase auth listener (once on mount)
 *   2. Cloud-sync: fetch cloud data when the user signs in and hydrate
 *      the domain Zustand stores
 *   3. Auto-lock: start an inactivity timer when encryption is enabled
 *   4. Route to the correct view based on auth & profile state:
 *        not-signed-in → AuthPage
 *        signed-in, no profile → Onboarding
 *        locked → AutoLock
 *        default → main layout (Sidebar + Topbar + active view)
 */
import { useEffect, useRef, useState } from 'react';
import { storage }           from '@/lib/storage';
import { authService }       from '@/features/auth/services/authService';
import { useAuthStore }      from '@/features/auth/store/useAuthStore';
import { useAppStore }       from '@/shared/stores/useAppStore';
import { useInvoiceStore }   from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore }   from '@/features/expenses/store/useExpenseStore';
import { useClientStore }    from '@/features/clients/store/useClientStore';
import { useVendorStore }    from '@/features/vendors/store/useVendorStore';
import {
  fetchCloudData,
  fetchLedgerEntries,
} from '@/shared/services/firestoreService';

import Sidebar    from '@/components/layout/Sidebar';
import Topbar     from '@/components/layout/Topbar';
import AuthPage   from '@/features/auth/components/AuthPage';
import Onboarding from '@/features/auth/components/Onboarding';
import AutoLock   from '@/features/auth/components/AutoLock';

import DashboardView from '@/features/dashboard/components/DashboardView';
import InvoicesView  from '@/features/invoices/components/InvoicesView';
import ExpensesView  from '@/features/expenses/components/ExpensesView';
import ClientsView   from '@/features/clients/components/ClientsView';
import VendorsView   from '@/features/vendors/components/VendorsView';
import ReportsView   from '@/features/reports/components/ReportsView';
import LedgerView    from '@/features/ledger/components/LedgerView';
import SettingsView  from '@/features/settings/components/SettingsView';

import type { ViewId } from '@/lib/types';

const VIEWS: Record<ViewId, React.ComponentType> = {
  dashboard: DashboardView,
  invoices:  InvoicesView,
  expenses:  ExpensesView,
  clients:   ClientsView,
  vendors:   VendorsView,
  reports:   ReportsView,
  ledger:    LedgerView,
  settings:  SettingsView,
};

// ── Inner component rendered after the user is authenticated ─────────────────

function AppContent() {
  const { activeView, locked, settings, lock } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-lock on inactivity
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    if (!storage.isEncryptionSetup() || locked) return;

    const timeout  = settings.sessionTimeout * 60 * 1000;
    const onAction = () => { lastActivity.current = Date.now(); };
    const events   = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

    events.forEach(e => window.addEventListener(e, onAction));
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > timeout) lock();
    }, 30_000);

    return () => {
      events.forEach(e => window.removeEventListener(e, onAction));
      clearInterval(interval);
    };
  }, [locked, settings.sessionTimeout, lock]);

  if (locked) return <AutoLock />;

  const ViewComponent = VIEWS[activeView] ?? DashboardView;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto p-3 md:p-6" style={{ scrollbarWidth: 'thin' }}>
          <ViewComponent />
        </div>
      </main>
    </div>
  );
}

// ── Root shell ────────────────────────────────────────────────────────────────

export default function AppShell() {
  const { user, loading }             = useAuthStore();
  const { profile, setProfile }       = useAppStore();
  const { hydrate: hydrateInvoices }  = useInvoiceStore();
  const { hydrate: hydrateExpenses }  = useExpenseStore();
  const { hydrate: hydrateClients }   = useClientStore();
  const { hydrate: hydrateVendors }   = useVendorStore();
  const { rebuildNotifications }      = useAppStore();

  // Attach the Firebase auth listener once
  useEffect(() => {
    const unsubscribe = authService.init();
    return unsubscribe;
  }, []);

  // Cloud hydration whenever the user changes
  const prevUid = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (user?.uid === prevUid.current) return;
    prevUid.current = user?.uid ?? null;
    if (!user) return;

    Promise.all([
      fetchCloudData(user.uid),
      fetchLedgerEntries(user.uid),
    ]).then(([cloud, ledger]) => {
      // Prefer ledger entries (append-only) over snapshot when available
      const hasLedger   = ledger.invoices.length > 0 || ledger.expenses.length > 0;
      const cloudInvoices = hasLedger ? ledger.invoices : (cloud?.invoices ?? []);
      const cloudExpenses = hasLedger ? ledger.expenses : (cloud?.expenses ?? []);

      if (!cloud && !hasLedger) return;

      hydrateInvoices(cloudInvoices, cloud?.nextInvId ?? cloudInvoices.length + 1);
      hydrateExpenses(cloudExpenses, cloud?.nextExpId ?? cloudExpenses.length + 1);

      if (cloud) {
        hydrateClients(cloud.clients, cloud.nextClientId);
        hydrateVendors(cloud.vendors, cloud.nextVendorId);
        if (cloud.profile && !profile) setProfile(cloud.profile);
      }

      rebuildNotifications(cloudInvoices);
    }).catch(err => {
      console.error('[LedgerX] Cloud sync error:', err);
    });
  }, [user]);   // store hydrate functions are stable Zustand refs; user.uid is the only meaningful dep

  // Auth loading splash
  if (loading) {
    return (
      <div className="onboarding-overlay">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-[14px]">
          LX
        </div>
      </div>
    );
  }

  if (!user)    return <AuthPage />;
  if (!profile) return <Onboarding />;

  return <AppContent />;
}
