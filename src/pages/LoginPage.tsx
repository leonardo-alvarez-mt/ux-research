import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onSwitchToSignUp: () => void;
  onForgotPassword: () => void;
  externalError?: string | null;
  onClearExternalError?: () => void;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5836-5.036-3.7105H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1632 6.656 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage({ onSwitchToSignUp, onForgotPassword: _onForgotPassword, externalError, onClearExternalError }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const displayError = externalError || error;

  async function handleGoogleLogin() {
    setError('');
    if (onClearExternalError) onClearExternalError();
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        queryParams: {
          hd: 'mitratech.com',
          prompt: 'select_account',
        },
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
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

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full px-9 py-10">
          <div className="flex justify-center mb-8">
            <img src={`${import.meta.env.BASE_URL}MitratechUXsvg.svg`} alt="Mitratech UX" className="h-9 w-auto" />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-sm text-slate-500">Sign in with your Mitratech Google account</p>
          </div>

          {displayError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{displayError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? 'Redirecting to Google...' : 'Continue with Google'}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Only <span className="font-medium text-slate-500">@mitratech.com</span> accounts are permitted
          </p>

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
