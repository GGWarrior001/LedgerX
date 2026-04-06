import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Mode = 'sign-in' | 'sign-up';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = () => {
    setMode(m => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email.trim(), password);
        toast.success('Welcome back!');
      } else {
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await signUp(email.trim(), password);
        toast.success('Account created! Welcome to LedgerX');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
      };
      toast.error(messages[code] ?? 'Something went wrong. Please try again.');
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
        {/* Hero */}
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
          {/* Email */}
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

          {/* Password */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-[10px] rounded-lg text-[13px] font-semibold bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? mode === 'sign-in'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'sign-in'
              ? 'Sign In'
              : 'Sign Up'}
          </button>

          {/* Toggle */}
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
