import { useState } from 'react';
import { AlertCircle, Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ALLOWED_DOMAIN = 'mitratech.com';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain !== ALLOWED_DOMAIN) {
      setError(`Access restricted to @${ALLOWED_DOMAIN} email addresses only.`);
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/?type=recovery`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0d3b8c 0%, #1a5abf 30%, #0ea5e9 70%, #06b6d4 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 80% at 50% 110%, rgba(6,182,212,0.35) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 50% 100%, rgba(14,165,233,0.2) 0%, transparent 60%)
          `,
        }}
      />
      <div className="absolute inset-0 pointer-events-none flex items-end justify-center" style={{ bottom: 0 }}>
        <div
          style={{
            width: 0, height: 0,
            borderLeft: '520px solid transparent',
            borderRight: '520px solid transparent',
            borderBottom: '780px solid rgba(255,255,255,0.07)',
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          }}
        />
        <div
          style={{
            width: 0, height: 0,
            borderLeft: '320px solid transparent',
            borderRight: '320px solid transparent',
            borderBottom: '600px solid rgba(255,255,255,0.05)',
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full px-9 py-10">
          <div className="flex justify-center mb-8">
            <img src="/MitratechUXsvg.svg" alt="Mitratech UX" className="h-9 w-auto" />
          </div>

          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-5">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h2>
              <p className="text-slate-500 text-sm mb-6">
                We sent a password reset link to <span className="font-medium text-slate-700">{email}</span>. The link expires in 1 hour.
              </p>
              <button
                onClick={onBackToLogin}
                className="w-full text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
                style={{ background: '#1a56db' }}
              >
                Back to Log In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Reset your password</h2>
                <p className="text-sm text-slate-500">
                  Enter your work email and we'll send you a link to reset your password.
                </p>
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
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@mitratech.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
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
                      Sending...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Log In
                </button>
              </div>
            </>
          )}
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
