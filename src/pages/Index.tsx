import { AppProvider, useApp } from '@/contexts/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Onboarding from '@/components/Onboarding';
import AutoLock from '@/components/AutoLock';
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
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          {views[activeView] || <DashboardView />}
        </div>
      </main>
    </div>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
