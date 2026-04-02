import { useApp } from '@/contexts/AppContext';
import { ViewId } from '@/lib/types';
import { currentFY, getInitials } from '@/lib/constants';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard' as ViewId, label: 'Dashboard', icon: <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
      { id: 'reports' as ViewId, label: 'Reports', icon: <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h3v12H2V2zm5 4h3v8H7V6zm5-3h3v11h-3V3z"/></svg> },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { id: 'invoices' as ViewId, label: 'Invoices', icon: <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5.414L10.586 1H3zm0 1h7v4h4v8H3V2zm2 6h6v1H5V8zm0 2h6v1H5v-1zm0 2h4v1H5v-1z"/></svg>, badge: true },
      { id: 'expenses' as ViewId, label: 'Expenses', icon: <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.5 10.5h-1v-5h1v5zm0-6.5h-1V4h1v1z"/></svg> },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'clients' as ViewId, label: 'Clients', icon: <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 1110 0H3z"/></svg> },
      { id: 'vendors' as ViewId, label: 'Vendors', icon: <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 100-6 3 3 0 000 6zM5.216 14A2.238 2.238 0 015 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 005 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/></svg> },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { id: 'ledger' as ViewId, label: 'Chart of Accounts', icon: <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm1 0v10h10V3H3zm1 2h8v1H4V5zm0 2h8v1H4V7zm0 2h5v1H4V9z"/></svg> },
    ],
  },
];

export default function Sidebar() {
  const { activeView, setActiveView, dark, toggleTheme, profile, invoices } = useApp();

  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const p = profile;
  const ini = getInitials(p?.name || p?.businessName || 'LX');
  const fyLabel = `${p?.businessName || 'LedgerX'} · FY ${currentFY(p?.fiscalYear || 'Apr-Mar')}`;

  return (
    <aside className="ledger-sidebar w-[242px] min-w-[242px] flex flex-col overflow-y-auto h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-[22px] border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-[13px] font-bold tracking-tight shrink-0">LX</div>
        <div>
          <div className="font-semibold text-[15px] tracking-tight" style={{ color: '#F9FAFB' }}>LedgerX</div>
          <div className="text-[10px] tracking-wider uppercase" style={{ color: '#6B7280' }}>{fyLabel}</div>
        </div>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 px-3 mt-1.5">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="mb-0.5">
            <div className="text-[10px] font-semibold tracking-widest uppercase px-2 pt-2.5 pb-1.5" style={{ color: '#4B5563' }}>{section.label}</div>
            {section.items.map(item => (
              <div
                key={item.id}
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
              >
                {item.icon}
                {item.label}
                {item.badge && overdueCount > 0 && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-px rounded-full" style={{ background: 'rgba(99,102,241,0.25)', color: '#A5B4FC' }}>
                    {overdueCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="px-3 mb-2">
        <div
          className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.892-1.64-.901-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 00-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 003.06 9.377l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 004.175 4.82l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.115l.094-.319z"/></svg>
          Settings
        </div>
        <div
          className="nav-item"
          style={{ marginLeft: 0, borderRadius: 'var(--radius)', paddingLeft: 10 }}
          onClick={toggleTheme}
        >
          {dark ? (
            <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 0a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 0zm0 13a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 13zm8-5a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zM3 8a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2A.5.5 0 013 8zm10.657-5.657a.5.5 0 010 .707l-1.414 1.415a.5.5 0 11-.707-.708l1.414-1.414a.5.5 0 01.707 0zm-9.193 9.193a.5.5 0 010 .707L3.05 13.657a.5.5 0 01-.707-.707l1.414-1.414a.5.5 0 01.707 0zm9.193 2.121a.5.5 0 01-.707 0l-1.414-1.414a.5.5 0 01.707-.707l1.414 1.414a.5.5 0 010 .707zM4.464 4.465a.5.5 0 01-.707 0L2.343 3.05a.5.5 0 11.707-.707l1.414 1.414a.5.5 0 010 .708z"/></svg>
          ) : (
            <svg className="w-[15px] h-[15px] opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M6 .278a.768.768 0 01.08.858 7.208 7.208 0 00-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 01.81.316.733.733 0 01-.031.893A8.349 8.349 0 018.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 016 .278z"/></svg>
          )}
          <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </div>
      </div>

      {/* User Footer */}
      <div className="mt-auto px-4 py-3.5 flex items-center gap-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-semibold shrink-0">{ini}</div>
        <div>
          <div className="text-[12.5px] font-medium" style={{ color: '#D1D5DB' }}>{p?.name || 'Your Name'}</div>
          <div className="text-[11px]" style={{ color: '#6B7280' }}>{p?.role || 'Admin'}{p?.city ? ` · ${p.city}` : ''}</div>
        </div>
      </div>
    </aside>
  );
}
