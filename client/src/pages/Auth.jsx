import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, RefreshCw, KeyRound, Sparkles, AlertCircle, ArrowLeft, CheckCircle2, Lock, ExternalLink, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function Auth() {
  const { sendOtp, verifyOtp, verifyLinkOrCode, signInWithPassword, signUpWithPassword, signOut, user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('EMAIL'); // 'EMAIL' | 'OTP'
  const [authMode, setAuthMode] = useState('OTP'); // 'OTP' | 'PASSWORD'
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pastedLink, setPastedLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const otpInputsRef = useRef([]);

  // Live session check while on OTP step: auto-login ONLY if email link matches the current email being verified
  useEffect(() => {
    if (step !== 'OTP' || !email) return;
    const cleanCurrentEmail = email.trim().toLowerCase();

    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (
          session?.user?.email &&
          session.user.email.toLowerCase() === cleanCurrentEmail
        ) {
          setIsSuccess(true);
          setSuccessMessage('Email verified via link! Redirecting to Dashboard…');
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#a855f7', '#3b82f6', '#10b981'],
          });
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1200);
        }
      } catch (_) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [step, navigate, email]);

  // Countdown for resend OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Handle email submission (OTP / Magic Link)
  const handleSendOtp = async (e) => {
    e?.preventDefault();

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const cleanInputEmail = email.trim().toLowerCase();
    setIsLoading(true);
    setError('');

    // Pre-emptively clear any stale session from another account before sending OTP
    try {
      const activeSession = localStorage.getItem('docmind_auth_session');
      if (activeSession) {
        const parsed = JSON.parse(activeSession);
        if (parsed?.user?.email && parsed.user.email.toLowerCase() !== cleanInputEmail) {
          localStorage.removeItem('docmind_auth_session');
          localStorage.removeItem('collab_token');
          localStorage.removeItem('collab_user');
          localStorage.removeItem('docmind_auth_token');
          if (isSupabaseConfigured) {
            await supabase.auth.signOut().catch(() => {});
          }
        }
      }
    } catch (_) {}

    try {
      await sendOtp(cleanInputEmail);
      setStep('OTP');
      setResendCooldown(60);
    } catch (err) {
      console.error('OTP Send Error:', err);
      setError(err.message || 'Failed to send verification email. Please check your email and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Login / Sign Up
  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUpWithPassword(email, password);
        setIsSuccess(true);
        setSuccessMessage('Account created! Redirecting to Dashboard…');
      } else {
        await signInWithPassword(email, password);
        setIsSuccess(true);
        setSuccessMessage('Welcome back! Redirecting…');
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#3b82f6', '#10b981'],
      });
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err) {
      console.error('Password Auth Error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle individual OTP input changes
  const handleOtpChange = (index, value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    if (!sanitized && value !== '') return;

    const newOtp = [...otp];

    if (sanitized.length > 1) {
      const pastedChars = sanitized.slice(0, 6).split('');
      pastedChars.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedChars.length, 5);
      otpInputsRef.current[nextIndex]?.focus();

      if (newOtp.every((digit) => digit !== '')) {
        handleVerifyOtp(newOtp.join(''));
      }
      return;
    }

    newOtp[index] = sanitized;
    setOtp(newOtp);

    if (sanitized && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    if (sanitized && index === 5 && newOtp.every((digit) => digit !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const rawData = e.clipboardData.getData('text').trim();

    // If user pasted a confirmation URL instead of a raw number
    if (rawData.includes('http') || rawData.includes('token') || rawData.includes('code')) {
      setPastedLink(rawData);
      handleVerifyLink(rawData);
      return;
    }

    const pastedData = rawData.replace(/[^0-9]/g, '');
    if (!pastedData) return;

    const digits = pastedData.slice(0, 6).split('');
    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);

    const focusTarget = Math.min(digits.length, 5);
    otpInputsRef.current[focusTarget]?.focus();

    if (newOtp.every((d) => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (codeToVerify) => {
    const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyOtp(email, fullCode);
      setIsSuccess(true);
      setSuccessMessage('Verified! Redirecting…');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#3b82f6', '#10b981'],
      });
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err) {
      console.error('OTP Verification Error:', err);
      setError(err.message || 'Invalid or expired code. Please verify and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pasted confirmation link or URL
  const handleVerifyLink = async (customLink) => {
    const linkToVerify = typeof customLink === 'string' ? customLink : pastedLink;
    if (!linkToVerify || !linkToVerify.trim()) {
      setError('Please paste the confirmation link from your email.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyLinkOrCode(linkToVerify, email);
      setIsSuccess(true);
      setSuccessMessage('Verified via link! Redirecting to Dashboard…');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#3b82f6', '#10b981'],
      });
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err) {
      console.error('Link Verification Error:', err);
      setError(err.message || 'Could not verify link. Please click the link directly in your email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-[128px] pointer-events-none" />

      {/* Supabase unconfigured warning banner */}
      {!isSupabaseConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md text-amber-200 text-xs flex items-start gap-3 shadow-lg"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300 block mb-1">Supabase API Keys Needed</span>
            Add your real <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-100">VITE_SUPABASE_URL</code> and <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-100">VITE_SUPABASE_ANON_KEY</code> in <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-100">client/.env</code> to trigger live email verification.
          </div>
        </motion.div>
      )}

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#12131c]/90 border border-slate-800/80 rounded-2xl p-7 backdrop-blur-xl shadow-2xl relative z-10"
      >
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-3 ring-1 ring-white/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            DocMind <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Auth</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Secure document intelligence with Supabase pgvector
          </p>
        </div>

        {/* Error notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic form steps */}
        <AnimatePresence mode="wait">
          {step === 'EMAIL' ? (
            <motion.div
              key="step-email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {user ? (
                /* Already Signed In Card with Easy Switch Account Option */
                <div className="space-y-4 text-center py-2">
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-slate-300 text-xs">
                    <span className="text-slate-400">Currently signed in as:</span>
                    <div className="font-semibold text-white font-mono text-sm mt-1">{user.email}</div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard', { replace: true })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <span>Continue to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setEmail('');
                        setStep('EMAIL');
                      }}
                      className="w-full py-2 px-4 rounded-xl border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      Sign Out & Log In with Another Email
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab Selector: OTP vs Password */}
                  <div className="flex bg-[#0c0d14] p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('OTP'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        authMode === 'OTP'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Email Code / Magic Link
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('PASSWORD'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        authMode === 'PASSWORD'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Password Auth
                    </button>
                  </div>

                  {authMode === 'OTP' ? (
                    /* OTP / Magic Link Mode */
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            id="email-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            autoFocus
                            required
                            disabled={isLoading}
                            className="w-full bg-[#181926] border border-slate-700/70 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="send-otp-btn"
                        disabled={isLoading || !email}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Sending code…</span>
                          </>
                        ) : (
                          <>
                            <span>Send Verification Code / Link</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Password Mode */
                    <form onSubmit={handlePasswordAuth} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                            disabled={isLoading}
                            className="w-full bg-[#181926] border border-slate-700/70 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            className="w-full bg-[#181926] border border-slate-700/70 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{isSignUp ? 'Already have an account?' : 'Need an account?'}</span>
                        <button
                          type="button"
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
                        >
                          {isSignUp ? 'Sign In instead' : 'Create an Account'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Authenticating…</span>
                          </>
                        ) : (
                          <>
                            <span>{isSignUp ? 'Create Account & Continue' : 'Sign In with Password'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="pt-3 border-t border-slate-800/80 text-center">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Protected by Real Email OTP Verification
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Code sent to:</span>
                  <strong className="text-indigo-300 font-medium">{email}</strong>
                </div>
                <h3 className="text-base font-bold text-white">Enter 6-Digit OTP Code</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Type the 6-digit verification code below to continue
                </p>
              </div>

              {/* 6-Digit Segmented OTP Input */}
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading || isSuccess}
                    className={`w-12 h-14 text-center text-xl font-bold font-mono rounded-xl bg-[#181926] border transition-all duration-200 outline-none ${
                      digit
                        ? 'border-indigo-500 bg-indigo-950/20 text-indigo-200 ring-2 ring-indigo-500/30'
                        : 'border-slate-700/70 text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                ))}
              </div>

              {/* Verify Action Button */}
              <button
                type="button"
                id="verify-otp-btn"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otp.some((d) => !d) || isSuccess}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code…</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>{successMessage || 'Verified! Redirecting…'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Code & Enter Dashboard</span>
                  </>
                )}
              </button>

              {/* Actions & Resend */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setOtp(['', '', '', '', '', '']);
                    setPastedLink('');
                    setError('');
                  }}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>

                <div>
                  {resendCooldown > 0 ? (
                    <span className="text-slate-500 font-mono">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Resend Email
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Minimal Footer */}
      <div className="mt-8 text-center text-xs text-slate-500 relative z-10">
        DocMind AI &bull; Supabase pgvector &bull; Enterprise RAG
      </div>
    </div>
  );
}
