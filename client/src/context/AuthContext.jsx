/**
 * context/AuthContext.jsx — DocMind Real Supabase Auth Context
 * Handles: Email OTP generation, token verification, session persistence,
 * real-time auth state synchronization, and clean sign out.
 */

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    // 1. Initial Session Check
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          try {
            const guestStr = localStorage.getItem('docmind_guest_session');
            if (guestStr) {
              const parsed = JSON.parse(guestStr);
              if (mounted) {
                setSession(parsed);
                setUser(parsed.user);
              }
            }
          } catch (_) {}
          if (mounted) setLoading(false);
          return;
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[DocMind Auth] Error getting initial session:', error);
          if (mounted) setAuthError(error.message);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error('[DocMind Auth] Unexpected error restoring session:', err);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Real-time Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Dispatches a real 6-digit OTP code to the provided email address via Supabase Auth
   */
  const sendOtp = async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in client/.env');
    }
    setAuthError(null);
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    return data;
  };

  /**
   * Verifies the 6-digit OTP code received in email
   */
  const verifyOtp = async (email, token) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in client/.env');
    }
    setAuthError(null);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    // Update local state immediately
    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
    }

    return data;
  };

  /**
   * Guest / Offline Demo Mode Access
   */
  const continueAsGuest = (guestEmail = 'guest@docmind.local') => {
    const mockUser = {
      id: 'demo-guest-' + Math.random().toString(36).slice(2, 9),
      email: guestEmail,
      app_metadata: { provider: 'guest' },
      user_metadata: { name: 'Demo Guest' },
      role: 'authenticated',
    };
    const mockSession = {
      access_token: 'mock-guest-token-' + Math.random().toString(36).slice(2, 9),
      user: mockUser,
    };
    setUser(mockUser);
    setSession(mockSession);
    try {
      localStorage.setItem('docmind_guest_session', JSON.stringify(mockSession));
    } catch (_) {}
    return { user: mockUser, session: mockSession };
  };

  /**
   * Terminates active session
   */
  const signOut = async () => {
    setAuthError(null);
    try {
      localStorage.removeItem('docmind_guest_session');
    } catch (_) {}
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error.message);
        throw error;
      }
    }
    setUser(null);
    setSession(null);
  };

  const value = useMemo(
    () => ({
      user,
      session,
      token: session?.access_token || (typeof localStorage !== 'undefined' ? localStorage.getItem('collab_token') : null),
      loading,
      authError,
      isSupabaseConfigured,
      sendOtp,
      verifyOtp,
      continueAsGuest,
      signOut,
    }),
    [user, session, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
