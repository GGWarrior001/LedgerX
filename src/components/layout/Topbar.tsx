import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import NotificationPanel from '@/components/NotificationPanel';

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', invoices: 'Invoices', expenses: 'Expenses',
  clients: 'Clients & Vendors', vendors: 'Vendors', reports: 'Reports',
  ledger: 'Chart of Accounts', settings: 'Settings',
};

export default function Topbar() {
  const { activeView, toggleTheme, dark, notifications, togglePrivacy, privacyMode } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState('');
  const unread = notifications.filter(n => !n.read).length;

  return (
    <>
      <div className="h-[58px] bg-card border-b border-border flex items-center px-6 gap-3.5 shrink-0">
        <span className="text-[15px] font-semibold flex-1">{VIEW_TITLES[activeView] || activeView}</span>

        {/* Search */}
        <div className="flex items-center bg-background border border-border rounded-lg px-2.5 gap-1.5 h-[33px] w-[210px] focus-within:border-primary transition-colors">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-muted-foreground shrink-0">
            <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.099zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border-none bg-transparent outline-none text-foreground text-[13px] w-full placeholder:text-muted-foreground font-sans"
          />
        </div>

        {/* Privacy toggle */}
        <div className="icon-btn" onClick={togglePrivacy} title={privacyMode ? 'Show Balances' : 'Hide Balances'}>
          {privacyMode ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 00-2.79.588l.77.771A5.944 5.944 0 018 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 00-4.474-4.474l.823.823a2.5 2.5 0 012.829 2.829l.822.822zm-2.943 1.299l.822.822a3.5 3.5 0 01-4.474-4.474l.823.823a2.5 2.5 0 002.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 001.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 018 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709z"/><path d="M13.646 14.354l-12-12 .708-.708 12 12-.708.708z"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 011.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 011.172 8z"/><path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4.5 8a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"/></svg>
          )}
        </div>

        {/* Notifications */}
        <div className="icon-btn" onClick={() => setNotifOpen(true)} title="Notifications">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16a2 2 0 002-2H6a2 2 0 002 2zm.995-14.901a1 1 0 10-1.99 0A5.002 5.002 0 003 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
          </svg>
          {unread > 0 && (
            <div className="absolute top-[5px] right-[5px] w-1.5 h-1.5 bg-destructive rounded-full" style={{ border: '1.5px solid hsl(var(--card))' }} />
          )}
        </div>

        {/* Theme Toggle */}
        <div className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {dark ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 0a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 0zm0 13a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 13zm8-5a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zM3 8a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2A.5.5 0 013 8z"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 .278a.768.768 0 01.08.858 7.208 7.208 0 00-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 01.81.316.733.733 0 01-.031.893A8.349 8.349 0 018.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 016 .278z"/></svg>
          )}
        </div>
      </div>

      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </>
  );
}
