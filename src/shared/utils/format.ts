/** Format number with Indian locale separators */
export function fmt(n: number): string {
  return n.toLocaleString('en-IN');
}

/** Format ISO date string to readable date */
export function fmtDate(s: string): string {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Get initials from a name (max 2 chars) */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

/** Get current fiscal year label based on preference */
export function currentFY(fyPref: string): string {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1;

  if (fyPref === 'Apr-Mar') return mo >= 4 ? `${yr}-${(yr + 1).toString().slice(2)}` : `${yr - 1}-${yr.toString().slice(2)}`;
  if (fyPref === 'Jul-Jun') return mo >= 7 ? `${yr}-${(yr + 1).toString().slice(2)}` : `${yr - 1}-${yr.toString().slice(2)}`;
  if (fyPref === 'Oct-Sep') return mo >= 10 ? `${yr}-${(yr + 1).toString().slice(2)}` : `${yr - 1}-${yr.toString().slice(2)}`;
  return yr.toString();
}

/** Greeting based on time of day */
export function getGreeting(name: string): string {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${time}${name ? ', ' + name : ''} ✦`;
}
