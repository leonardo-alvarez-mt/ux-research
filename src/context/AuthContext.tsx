import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

let _signupInProgress = false;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[AuthContext] onAuthStateChange event:', event, 'user:', newSession?.user?.email ?? null, 'email_confirmed_at:', newSession?.user?.email_confirmed_at ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AuthContext] PASSWORD_RECOVERY — setting session for password reset');
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        console.log('[AuthContext] INITIAL_SESSION — using session from listener instead of getSession');
        if (newSession?.user) {
          const emailConfirmed = !!newSession.user.email_confirmed_at;
          console.log('[AuthContext] INITIAL_SESSION emailConfirmed:', emailConfirmed);
          if (!emailConfirmed && !_signupInProgress) {
            console.log('[AuthContext] INITIAL_SESSION — unconfirmed email, signing out');
            supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setSession(newSession);
            setUser(newSession.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN') {
        if (_signupInProgress) {
          console.log('[AuthContext] SIGNED_IN during signup flow — skipping');
          _signupInProgress = false;
          return;
        }
        if (newSession?.user && !newSession.user.email_confirmed_at) {
          console.log('[AuthContext] SIGNED_IN — unconfirmed email, signing out');
          supabase.auth.signOut();
          return;
        }
        console.log('[AuthContext] SIGNED_IN — setting session');
        setSession(newSession);
        setUser(newSession?.user ?? null);
        return;
      }

      if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] SIGNED_OUT — clearing session');
        setSession(null);
        setUser(null);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] TOKEN_REFRESHED — updating session');
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

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function setSignupInProgress(value: boolean) {
  _signupInProgress = value;
}
