/**
 * Index – entry-point page.
 *
 * Delegates entirely to AppShell which manages auth, cloud-sync,
 * routing, and layout in the new feature-based architecture.
 * The legacy AuthProvider / AppProvider wrappers are kept as no-ops
 * so any reference to them elsewhere compiles cleanly.
 */
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider }  from '@/contexts/AppContext';
import AppShell         from '@/app/AppShell';

export default function Index() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AuthProvider>
  );
}
