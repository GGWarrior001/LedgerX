/**
 * App shell — orchestrates auth, hydration, cloud sync, and routing.
 *
 * This replaces the old Index.tsx + App.tsx + context wiring.
 */
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useAppStore } from '@/shared/stores/useAppStore';
import { useInvoiceStore } from '@/features/invoices/store/useInvoiceStore';
import { useExpenseStore } from '@/features/expenses/store/useExpenseStore';
import { useClientStore } from '@/features/clients/store/useClientStore';
import { useVendorStore } from '@/features/vendors/store/useVendorStore';
import { useCloudSync } from '@/shared/hooks/useCloudSync';
import type { ViewId } from '@/shared/types';

// Shared components
import Sidebar from '@/shared/components/layout/Sidebar';
import Topbar from '@/shared/components/layout/Topbar';
import Onboarding from '@/shared/components/Onboarding';
import AutoLock from '@/shared/components/AutoLock';
import AuthPage from '@/features/auth/components/AuthPage';

// Feature pages
import DashboardPage from '@/features/dashboard/components/DashboardPage';
import InvoicesPage from '@/features/invoices/components/InvoicesPage';
import ExpensesPage from '@/features/expenses/components/ExpensesPage';
import ClientsPage from '@/features/clients/components/ClientsPage';
import VendorsPage from '@/features/vendors/components/VendorsPage';
import ReportsPage from '@/features/reports/components/ReportsPage';
import LedgerPage from '@/features/ledger/components/LedgerPage';
import SettingsPage from '@/features/settings/components/SettingsPage';

// ─── Inner app (authed + hydrated) ──────────────────────────────────────────

function AppContent() {
  const profile = useAppStore(s => s.profile);
  const locked = useAppStore(s => s.locked);
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Start cloud sync (pulls data on mount if signed in)
  useCloudSync();

  if (locked) return <AutoLock />;
  if (!profile) return <Onboarding />;

  const views: Record<ViewId, React.ReactNode> = {
    dashboard: <DashboardPage onNavigate={setActiveView} />,
    invoices: <InvoicesPage />,
    expenses: <ExpensesPage />,
    clients: <ClientsPage />,
    vendors: <VendorsPage />,
    reports: <ReportsPage />,
    ledger: <LedgerPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar activeView={activeView} onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto p-3 md:p-6" style={{ scrollbarWidth: 'thin' }}>
          {views[activeView] || <DashboardPage onNavigate={setActiveView} />}
        </div>
      </main>
    </div>
  );
}

// ─── Auth gate ───────────────────────────────────────────────────────────────

function AuthGate() {
  const { user, loading } = useAuthStore();
  const hydrate = useAppStore(s => s.hydrate);
  const hydrateInvoices = useInvoiceStore(s => s.hydrate);
  const hydrateExpenses = useExpenseStore(s => s.hydrate);
  const hydrateClients = useClientStore(s => s.hydrate);
  const hydrateVendors = useVendorStore(s => s.hydrate);

  // Hydrate local stores once auth is resolved and user is available
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    hydrateInvoices();
    hydrateExpenses();
    hydrateClients();
    hydrateVendors();
    // Hydrate app UI state (dark mode, profile, notifications)
    const invoices = useInvoiceStore.getState().invoices;
    hydrate(invoices);
  }, [loading, user, hydrate, hydrateInvoices, hydrateExpenses, hydrateClients, hydrateVendors]);

  if (loading) {
    return (
      <div className="onboarding-overlay">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-[14px]">
          LX
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return <AppContent />;
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function AppShell() {
  const initAuth = useAuthStore(s => s.init);

  // Subscribe to auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth]);

  return <AuthGate />;
}
