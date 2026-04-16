import { useState } from 'react';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

type Mode = 'sign-in' | 'sign-up';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential':    'Invalid email or password.',
  'auth/user-not-found':        'No account found with this email.',
  'auth/wrong-password':        'Incorrect password.',
  'auth/email-already-in-use':  'An account with this email already exists.',
  'auth/invalid-email':         'Please enter a valid email address.',
  'auth/too-many-requests':     'Too many attempts. Please try again later.',
  'auth/network-request-failed':'Network error. Please check your connection.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled.',
  'auth/weak-password':         'Password is too weak. Please choose a stronger password.',
  'auth/invalid-api-key':       'Authentication configuration error. Please contact support.',
  'auth/app-not-authorized':    'This app is not authorized to use Firebase Authentication.',
};

export default function AuthPage() {
  const [mode, setMode]         = useState<Mode>('sign-in');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { setError } = useAuthStore();

  const toggle = () => {
    setMode(m => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
    setEmail('');
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    // Validate before touching loading state so the button is never stuck
    if (mode === 'sign-up' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('[LedgerX] AuthPage – handleSubmit, mode:', mode);

    try {
      if (mode === 'sign-in') {
        const result = await authService.signIn(email.trim(), password);
        if (result.success) {
          console.log('[LedgerX] AuthPage – signIn success, uid:', result.user?.uid);
          toast.success('Welcome back!');
        } else {
          const msg = ERROR_MESSAGES[result.error ?? ''] ?? 'Something went wrong. Please try again.';
          console.warn('[LedgerX] AuthPage – signIn failed:', result.error);
          setError(msg);
          toast.error(msg);
        }
      } else {
        const result = await authService.signUp(email.trim(), password);
        if (result.success) {
          console.log('[LedgerX] AuthPage – signUp success, uid:', result.user?.uid);
          toast.success('Account created! Welcome to LedgerX');
        } else {
          const msg = ERROR_MESSAGES[result.error ?? ''] ?? 'Something went wrong. Please try again.';
          console.warn('[LedgerX] AuthPage – signUp failed:', result.error);
          setError(msg);
          toast.error(msg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div
        className="bg-card rounded-2xl w-[440px] max-w-[95vw] overflow-hidden shadow-2xl"
        style={{ animation: 'fadeIn 300ms ease' }}
      >
        <div
          className="px-8 pt-[30px] pb-6"
          style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(243 75% 59%))' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-base mb-4"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            LX
          </div>
          <h1 className="text-[22px] font-bold tracking-tight mb-1.5" style={{ color: '#fff' }}>
            {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {mode === 'sign-in'
              ? 'Sign in to sync your ledger across devices.'
              : 'Sign up to keep your data safe in the cloud.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div className="form-field">
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="form-field !mb-0">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'sign-up' ? 'At least 6 characters' : '••••••••'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[10px] rounded-lg text-[13px] font-semibold bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? mode === 'sign-in' ? 'Signing in…' : 'Creating account…'
              : mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </button>

          <div className="text-center text-[12.5px] text-muted-foreground pt-1">
            {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={toggle}
              className="text-primary font-medium hover:underline cursor-pointer"
            >
              {mode === 'sign-in' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
