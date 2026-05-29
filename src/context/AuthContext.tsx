import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const ALLOWED_DOMAIN = 'mitratech.com';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  authError: null,
  clearAuthError: () => {},
  signOut: async () => {},
});

async function ensureProfile(user: User) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!data) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      '';
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? '',
      full_name: fullName,
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[AuthContext] onAuthStateChange event:', event, 'user:', newSession?.user?.email ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (newSession?.user) {
          const email = newSession.user.email ?? '';
          const domain = email.split('@')[1]?.toLowerCase();
          if (domain !== ALLOWED_DOMAIN) {
            supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setAuthError(`Access restricted to @${ALLOWED_DOMAIN} accounts. Please use your Mitratech work Google account.`);
          } else {
            setSession(newSession);
            setUser(newSession.user);
            (async () => { await ensureProfile(newSession.user); })();
          }
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN') {
        if (!newSession?.user) return;
        const email = newSession.user.email ?? '';
        const domain = email.split('@')[1]?.toLowerCase();
        if (domain !== ALLOWED_DOMAIN) {
          supabase.auth.signOut();
          setAuthError(`Access restricted to @${ALLOWED_DOMAIN} accounts. Please use your Mitratech work Google account.`);
          return;
        }
        setSession(newSession);
        setUser(newSession.user);
        (async () => { await ensureProfile(newSession.user); })();
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        return;
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  function clearAuthError() {
    setAuthError(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, clearAuthError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Keep export for any remaining callers — no-op since password signup is removed
export function setSignupInProgress(_value: boolean) {}
