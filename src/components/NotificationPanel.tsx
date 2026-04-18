import { useApp } from '@/contexts/AppContext';

interface Props { onClose: () => void; }

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, markNotifRead, markAllRead } = useApp();

  return (
    <>
      <div className="fixed inset-0 z-[30]" onClick={onClose} />
      <div
        className="fixed top-0 right-0 w-[320px] h-screen bg-card border-l border-border z-[40] flex flex-col overflow-hidden"
        style={{ animation: 'fadeIn 150ms ease' }}
      >
        <div className="px-5 py-[18px] border-b border-border flex items-center justify-between">
          <span className="font-semibold text-sm">Notifications</span>
          <div className="flex gap-2 items-center">
            <button
              onClick={markAllRead}
              className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-background text-foreground font-medium cursor-pointer hover:bg-muted transition-colors"
            >
              Mark all read
            </button>
            <button onClick={onClose} className="icon-btn !w-[26px] !h-[26px] !border-none text-muted-foreground cursor-pointer">✕</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-3">
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-[13px]">No notifications</div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`px-5 py-3.5 border-b border-border cursor-pointer transition-colors hover:bg-background ${n.read ? '' : 'border-l-[3px] border-l-primary'}`}
                onClick={() => markNotifRead(n.id)}
              >
                <div className={`text-[13px] font-medium mb-0.5 ${n.type === 'danger' ? 'text-destructive' : n.type === 'warning' ? 'text-warning' : ''}`}>
                  {n.title}
                </div>
                <div className="text-[11.5px] text-muted-foreground">{n.sub}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
