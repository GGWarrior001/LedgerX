import { useState } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Onboarding from '@/components/Onboarding';
import AutoLock from '@/components/AutoLock';
import AuthPage from '@/pages/Auth';
import DashboardView from '@/pages/Dashboard';
import InvoicesView from '@/pages/Invoices';
import ExpensesView from '@/pages/Expenses';
import ClientsView from '@/pages/Clients';
import VendorsView from '@/pages/Vendors';
import ReportsView from '@/pages/Reports';
import LedgerView from '@/pages/Ledger';
import SettingsView from '@/pages/Settings';

function AppContent() {
  const { profile, activeView, locked } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (locked) return <AutoLock />;
  if (!profile) return <Onboarding />;

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    invoices: <InvoicesView />,
    expenses: <ExpensesView />,
    clients: <ClientsView />,
    vendors: <VendorsView />,
    reports: <ReportsView />,
    ledger: <LedgerView />,
    settings: <SettingsView />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto p-3 md:p-6" style={{ scrollbarWidth: 'thin' }}>
          {views[activeView] || <DashboardView />}
        </div>
      </main>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

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

  return (
    <AppProvider cloudUid={user.uid}>
      <AppContent />
    </AppProvider>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
