import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ALLOWED_DOMAIN = 'mitratech.com';

interface LoginPageProps {
  onSwitchToSignUp: () => void;
  onForgotPassword: () => void;
}

export default function LoginPage({ onSwitchToSignUp, onForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain !== ALLOWED_DOMAIN) {
      setError(`Access restricted to @${ALLOWED_DOMAIN} email addresses only.`);
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setLoading(false);
      setError('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
      return;
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d3b8c 0%, #1a5abf 30%, #0ea5e9 70%, #06b6d4 100%)' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 80% at 50% 110%, rgba(6,182,212,0.35) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 50% 100%, rgba(14,165,233,0.2) 0%, transparent 60%)
          `,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none flex items-end justify-center"
        style={{ bottom: 0 }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '520px solid transparent',
            borderRight: '520px solid transparent',
            borderBottom: '780px solid rgba(255,255,255,0.07)',
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '320px solid transparent',
            borderRight: '320px solid transparent',
            borderBottom: '600px solid rgba(255,255,255,0.05)',
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full px-9 py-10">
          <div className="flex justify-center mb-8">
            <img src="/MitratechUXsvg.svg" alt="Mitratech UX" className="h-9 w-auto" />
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@mitratech.com"
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-medium transition-colors hover:underline"
                  style={{ color: '#1a56db' }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-2.5 pr-11 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-sm text-slate-600 cursor-pointer select-none">
                Remember Me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              style={{ background: loading ? '#93c5fd' : '#1a56db' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Log in'
              )}
            </button>

          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="font-semibold transition-colors hover:underline"
                style={{ color: '#1a56db' }}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">Help Center</a>
            <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">About</a>
            <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">Terms</a>
          </div>
          <p className="text-xs text-white/50">
            Copyright &copy; 2016&ndash;{new Date().getFullYear()} Mitratech Holdings, Inc. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
