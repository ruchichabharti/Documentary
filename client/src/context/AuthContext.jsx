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
        // Priority 1: Restore verified local OTP session
        try {
          const savedSession = localStorage.getItem('docmind_auth_session');
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed?.user && mounted) {
              setSession(parsed);
              setUser(parsed.user);
              setLoading(false);
              return;
            }
          }
        } catch (_) {}

        // Priority 2: Check for Supabase session if configured
        if (isSupabaseConfigured) {
          // Check for PKCE ?code= in URL query params if user clicked confirmation link
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const authCode = urlParams.get('code');
            if (authCode) {
              try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
                if (!error && data?.session && mounted) {
                  setSession(data.session);
                  setUser(data.user);
                  setLoading(false);
                  return;
                }
              } catch (exchangeErr) {
                console.warn('[DocMind Auth] Code exchange error:', exchangeErr);
              }
            }
          }

          try {
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            if (initialSession?.user && mounted) {
              setSession(initialSession);
              setUser(initialSession.user);
              setLoading(false);
              return;
            }
          } catch (sessionErr) {
            console.warn('[DocMind Auth] Supabase initial session check:', sessionErr);
          }
        }

        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('[DocMind Auth] Unexpected error restoring session:', err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Real-time Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;

      // If user is actively authenticated via local OTP, do not let Supabase hijack with another account
      const localActive = localStorage.getItem('docmind_auth_session');
      if (localActive) {
        try {
          const parsed = JSON.parse(localActive);
          if (parsed?.user?.email) {
            if (!currentSession?.user || currentSession.user.email?.toLowerCase() !== parsed.user.email?.toLowerCase()) {
              return;
            }
          }
        } catch (_) {}
      }

      if (event === 'SIGNED_OUT') {
        if (!localActive) {
          setSession(null);
          setUser(null);
        }
        return;
      }

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Dispatches a real 6-digit OTP code to the provided email address
   */
  const sendOtp = async (email) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const apiBase = isLocal ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '';

    // 1. Send directly through local backend using Gmail SMTP
    let localReachable = false;
    try {
      const res = await fetch(`${apiBase}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      localReachable = true;
      const data = await res.json();
      if (res.ok) {
        return data;
      }
      throw new Error(data?.error || 'Failed to send OTP code to your email.');
    } catch (localErr) {
      console.warn('[DocMind Auth] Backend mailer error, attempting Supabase OTP fallback:', localErr.message);
      if (isSupabaseConfigured) {
        try {
          const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
          const { data, error } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: redirectUrl,
            },
          });
          if (!error) return data;
        } catch (_) {}
      }
      setAuthError(localErr.message);
      throw localErr;
    }

    // 2. Fallback to Supabase Auth if backend is unreachable
    if (isSupabaseConfigured) {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
      const { data, error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
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
    }

    throw new Error('Authentication service unavailable. Please ensure the backend server is running.');
  };

  /**
   * Verifies the 6-digit OTP code received in email
   */
  const verifyOtp = async (email, token) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const apiBase = isLocal ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '';

    // 1. Try verifying against local backend OTP store
    let localReachable = false;
    try {
      const res = await fetch(`${apiBase}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanToken }),
      });
      localReachable = true;
      const data = await res.json();
      if (res.ok) {
        const userObj = {
          id: data.user.id,
          email: data.user.email,
          role: 'authenticated',
        };
        const sessionObj = {
          access_token: data.token,
          user: userObj,
        };
        setUser(userObj);
        setSession(sessionObj);
        try {
          localStorage.setItem('collab_token', data.token);
          localStorage.setItem('collab_user', JSON.stringify(userObj));
          localStorage.setItem('docmind_auth_session', JSON.stringify(sessionObj));
        } catch (_) {}
        return data;
      } else {
        throw new Error(data?.error || 'Invalid or expired verification code.');
      }
    } catch (localVerifyErr) {
      if (localReachable) {
        setAuthError(localVerifyErr.message);
        throw localVerifyErr;
      }
      console.warn('[DocMind Auth] Local OTP verification unreachable, trying Supabase:', localVerifyErr);
    }

    // 2. Fallback to Supabase verification
    if (isSupabaseConfigured) {
      let { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });

      if (error && (error.message?.includes('type') || error.message?.includes('Token'))) {
        const retry = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'signup',
        });
        if (!retry.error) {
          data = retry.data;
          error = null;
        }
      }

      if (error) {
        setAuthError(error.message);
        throw error;
      }

      if (data?.session) {
        setSession(data.session);
        setUser(data.user);
        try {
          localStorage.setItem('docmind_auth_session', JSON.stringify(data.session));
        } catch (_) {}
      }

      return data;
    }

    throw new Error('Invalid code or expired session.');
  };

  /**
   * Verifies an OTP code OR parses a confirmation link / magic link URL
   */
  const verifyLinkOrCode = async (input, targetEmail = '') => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in client/.env');
    }
    setAuthError(null);
    const trimmed = input.trim();

    // 1. If it's a 6-digit numeric OTP code
    if (/^\d{6}$/.test(trimmed)) {
      return await verifyOtp(targetEmail, trimmed);
    }

    // 2. If it's a URL or contains query/hash params
    if (trimmed.includes('token') || trimmed.includes('code') || trimmed.includes('access_token') || trimmed.startsWith('http')) {
      try {
        // Check for hash parameters: #access_token=...&refresh_token=...
        if (trimmed.includes('access_token=')) {
          const hashPart = trimmed.includes('#') ? trimmed.split('#')[1] : trimmed;
          const hashParams = new URLSearchParams(hashPart);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            if (data?.session) {
              setSession(data.session);
              setUser(data.user);
            }
            return data;
          }
        }

        // Check for PKCE ?code=...
        if (trimmed.includes('code=')) {
          const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `http://dummy.com?${trimmed}`);
          const code = urlObj.searchParams.get('code');
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            if (data?.session) {
              setSession(data.session);
              setUser(data.user);
            }
            return data;
          }
        }

        // Check for Supabase verify token: ?token=... or token_hash=...
        const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `http://dummy.com?${trimmed}`);
        const tokenHash = urlObj.searchParams.get('token') || urlObj.searchParams.get('token_hash');
        const type = urlObj.searchParams.get('type') || 'signup';

        if (tokenHash) {
          if (/^\d{6}$/.test(tokenHash)) {
            return await verifyOtp(targetEmail, tokenHash);
          }
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === 'magiclink' ? 'magiclink' : type === 'signup' ? 'signup' : 'email',
          });
          if (error) throw error;
          if (data?.session) {
            setSession(data.session);
            setUser(data.user);
          }
          return data;
        }
      } catch (urlErr) {
        console.warn('[DocMind Auth] Direct link parse error:', urlErr);
        if (trimmed.startsWith('http')) {
          window.location.href = trimmed;
          return;
        }
        throw new Error('Could not parse verification link. Please click the link directly in your email.');
      }
    }

    // Default fallback to standard verifyOtp
    return await verifyOtp(targetEmail, trimmed);
  };

  /**
   * Password Authentication: Sign In
   */
  const signInWithPassword = async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in client/.env');
    }
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return data;
  };

  /**
   * Password Authentication: Sign Up
   */
  const signUpWithPassword = async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase credentials are not configured in client/.env');
    }
    setAuthError(null);
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
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
   * Terminates active session completely and clears all stored tokens
   */
  const signOut = async () => {
    setAuthError(null);

    // 1. Unconditionally clear all user tokens and cached sessions
    try {
      localStorage.removeItem('docmind_auth_session');
      localStorage.removeItem('collab_token');
      localStorage.removeItem('collab_user');
      localStorage.removeItem('docmind_guest_session');
      localStorage.removeItem('docmind_local_docs');
      localStorage.removeItem('docmind_auth_token');

      // Purge any Supabase or project keys from localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase')) {
          try {
            localStorage.removeItem(key);
          } catch (_) {}
        }
      });
    } catch (_) {}

    // 2. Safely call Supabase signOut without letting an error block user logout
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[DocMind Auth] Supabase signOut notice:', err);
      }
    }

    // 3. Reset React state unconditionally
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
      verifyLinkOrCode,
      signInWithPassword,
      signUpWithPassword,
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
