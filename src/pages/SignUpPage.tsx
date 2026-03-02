import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Mail, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ALLOWED_DOMAIN = 'mitratech.com';

interface SignUpPageProps {
  onSwitchToLogin: () => void;
}

function AuthBackground() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 80% at 50% 110%, rgba(6,182,212,0.35) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 50% 100%, rgba(14,165,233,0.2) 0%, transparent 60%)
          `,
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
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
    </>
  );
}

function MitratechLogo() {
  return (
    <div className="flex justify-center mb-8">
      <img src="/MitratechUXsvg.svg" alt="Mitratech UX" className="h-9 w-auto" />
    </div>
  );
}

function PageFooter({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  return (
    <div className="mt-8 text-center space-y-3">
      <div className="flex items-center justify-center gap-6 flex-wrap">
        <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">Help Center</a>
        <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">About</a>
        <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">Terms</a>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sm font-semibold text-white hover:text-white/80 transition-colors"
        >
          Sign In
        </button>
      </div>
      <p className="text-xs text-white/50">
        Copyright &copy; 2016&ndash;{new Date().getFullYear()} Mitratech Holdings, Inc. All Rights Reserved.
      </p>
    </div>
  );
}

export default function SignUpPage({ onSwitchToLogin }: SignUpPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain !== ALLOWED_DOMAIN) {
      setError(`Access restricted to @${ALLOWED_DOMAIN} email addresses only.`);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email ?? email,
        full_name: fullName,
      });
    }

    setSuccess(true);
  }

  async function handleResend() {
    setResendLoading(true);
    setResendSuccess(false);
    await supabase.auth.resend({ type: 'signup', email });
    setResendLoading(false);
    setResendSuccess(true);
  }

  const bgStyle = { background: 'linear-gradient(135deg, #0d3b8c 0%, #1a5abf 30%, #0ea5e9 70%, #06b6d4 100%)' };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={bgStyle}>
        <AuthBackground />
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full px-9 py-10 text-center">
            <MitratechLogo />
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-5">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-500 text-sm mb-1">
              We sent a confirmation link to
            </p>
            <p className="text-slate-800 font-semibold text-sm mb-5 break-all">{email}</p>
            <p className="text-slate-400 text-xs mb-6">
              Click the link in the email to confirm your account, then come back here to log in.
            </p>

            {resendSuccess ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm mb-4">
                <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                Email resent successfully
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2.5 px-4 hover:bg-slate-50 transition-colors mb-4 disabled:opacity-60"
              >
                {resendLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Resend confirmation email
              </button>
            )}

            <button
              onClick={onSwitchToLogin}
              className="w-full text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
              style={{ background: '#1a56db' }}
            >
              Go to Log In
            </button>
          </div>
          <PageFooter onSwitchToLogin={onSwitchToLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={bgStyle}>
      <AuthBackground />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full px-9 py-10">
          <MitratechLogo />

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
              />
            </div>

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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              style={{ background: loading ? '#93c5fd' : '#1a56db' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="text-center pt-1">
              <span className="text-sm text-slate-500">Already have an account? </span>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm font-medium transition-colors"
                style={{ color: '#1a56db' }}
              >
                Log in
              </button>
            </div>
          </form>
        </div>

        <PageFooter onSwitchToLogin={onSwitchToLogin} />
      </div>
    </div>
  );
}
