import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  KeyRound, 
  BookOpen, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';
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
  const [otpLength, setOtpLength] = useState(6);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pastedLink, setPastedLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const otpInputsRef = useRef([]);

  // Live session check while on OTP step: auto-login ONLY if email link matches current email
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
          setSuccessMessage('Verified via link! Redirecting to Workspace…');
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#c2410c', '#1c1917', '#78716c', '#fed7aa', '#15803d'],
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

  // Handle email submission (OTP)
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
        setSuccessMessage('Account created! Redirecting to Workspace…');
      } else {
        await signInWithPassword(email, password);
        setIsSuccess(true);
        setSuccessMessage('Welcome back! Redirecting…');
      }

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#c2410c', '#1c1917', '#78716c', '#fed7aa', '#15803d'],
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

  const handleToggleOtpLength = (targetLen) => {
    const nextLen = targetLen || (otpLength === 6 ? 8 : 6);
    setOtpLength(nextLen);
    setOtp(new Array(nextLen).fill(''));
    setError('');
    setTimeout(() => {
      otpInputsRef.current[0]?.focus();
    }, 50);
  };

  // Handle individual OTP input changes
  const handleOtpChange = (index, value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    if (!sanitized && value !== '') return;

    const newOtp = [...otp];

    if (sanitized.length > 1) {
      const targetLen = sanitized.length >= 8 ? 8 : (otpLength === 8 ? 8 : 6);
      if (targetLen !== otpLength) {
        setOtpLength(targetLen);
      }
      const adjustedOtp = new Array(targetLen).fill('');
      const pastedChars = sanitized.slice(0, targetLen).split('');
      pastedChars.forEach((char, i) => {
        adjustedOtp[i] = char;
      });
      setOtp(adjustedOtp);
      const nextIndex = Math.min(pastedChars.length, targetLen - 1);
      otpInputsRef.current[nextIndex]?.focus();

      if (adjustedOtp.every((digit) => digit !== '')) {
        handleVerifyOtp(adjustedOtp.join(''));
      }
      return;
    }

    newOtp[index] = sanitized;
    setOtp(newOtp);

    if (sanitized && index < otpLength - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }

    if (sanitized && index === otpLength - 1 && newOtp.every((digit) => digit !== '')) {
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
    } else if (e.key === 'ArrowRight' && index < otpLength - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const rawData = e.clipboardData.getData('text').trim();

    // If user pasted a confirmation URL
    if (rawData.includes('http') || rawData.includes('token') || rawData.includes('code')) {
      setPastedLink(rawData);
      handleVerifyLink(rawData);
      return;
    }

    const pastedData = rawData.replace(/[^0-9]/g, '');
    if (!pastedData) return;

    const targetLen = pastedData.length >= 8 ? 8 : 6;
    if (targetLen !== otpLength) {
      setOtpLength(targetLen);
    }

    const digits = pastedData.slice(0, targetLen).split('');
    const newOtp = new Array(targetLen).fill('');
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);

    const focusTarget = Math.min(digits.length, targetLen - 1);
    otpInputsRef.current[focusTarget]?.focus();

    if (newOtp.every((d) => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (codeToVerify) => {
    const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otp.join('');
    if (fullCode.length !== 6 && fullCode.length !== 8) {
      setError(`Please enter the complete ${otpLength}-digit verification code.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyOtp(email, fullCode);
      setIsSuccess(true);
      setSuccessMessage('Verified! Redirecting to Workspace…');
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#c2410c', '#1c1917', '#78716c', '#fed7aa', '#15803d'],
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
      setSuccessMessage('Verified via link! Redirecting to Workspace…');
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#c2410c', '#1c1917', '#78716c', '#fed7aa', '#15803d'],
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
    <div className="min-h-screen bg-[#f8f6f1] text-[#1c1917] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-[#fed7aa] selection:text-[#7c2d12]">
      {/* Supabase unconfigured warning banner */}
      {!isSupabaseConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mb-6 p-4 rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-[#7c2d12] text-xs flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#c2410c] mt-0.5" />
          <div>
            <span className="font-semibold text-[#9a3412] block mb-1">Configuration Note</span>
            Provide your <code className="bg-[#ffedd5] px-1 py-0.5 rounded text-[#7c2d12] font-mono">VITE_SUPABASE_URL</code> and <code className="bg-[#ffedd5] px-1 py-0.5 rounded text-[#7c2d12] font-mono">VITE_SUPABASE_ANON_KEY</code> in environment variables for live cloud auth.
          </div>
        </motion.div>
      )}

      {/* Main Paper Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-white border border-[#e5e0d4] rounded-2xl p-8 shadow-sm relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#1c1917] text-[#f8f6f1] flex items-center justify-center mb-3.5 shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-normal font-serif-title tracking-tight text-[#1c1917]">
            DocMind Studio
          </h1>
          <p className="text-[#57534e] text-xs mt-1.5 leading-relaxed font-normal">
            Sign in to access your document library and shared notes
          </p>
        </div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#dc2626]" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Form Steps */}
        <AnimatePresence mode="wait">
          {step === 'EMAIL' ? (
            <motion.div
              key="step-email"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              {user ? (
                /* Already Signed In */
                <div className="space-y-4 text-center py-2">
                  <div className="p-4 rounded-xl bg-[#fbfaf8] border border-[#e5e0d4] text-[#57534e] text-xs">
                    <span>Currently signed in as:</span>
                    <div className="font-semibold text-[#1c1917] font-mono text-sm mt-1">{user.email}</div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard', { replace: true })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1c1917] hover:bg-[#2e2a27] text-white font-medium text-sm transition-all shadow-xs cursor-pointer"
                    >
                      <span>Continue to Library</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setEmail('');
                        setStep('EMAIL');
                      }}
                      className="w-full py-2 px-4 rounded-xl border border-[#e5e0d4] hover:bg-[#f2eee5] text-[#57534e] hover:text-[#1c1917] text-xs font-medium transition-all cursor-pointer"
                    >
                      Sign Out &amp; Use Another Email
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab Selector */}
                  <div className="flex bg-[#f2eee5] p-1 rounded-xl border border-[#e5e0d4]">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('OTP'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        authMode === 'OTP'
                          ? 'bg-white text-[#1c1917] shadow-xs'
                          : 'text-[#78716c] hover:text-[#1c1917]'
                      }`}
                    >
                      Email Code
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('PASSWORD'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        authMode === 'PASSWORD'
                          ? 'bg-white text-[#1c1917] shadow-xs'
                          : 'text-[#78716c] hover:text-[#1c1917]'
                      }`}
                    >
                      Password
                    </button>
                  </div>

                  {authMode === 'OTP' ? (
                    /* OTP Mode */
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#44403c] mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a8a29e]">
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
                            className="w-full bg-[#fbfaf8] border border-[#e5e0d4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] focus:bg-white transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="send-otp-btn"
                        disabled={isLoading || !email}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1c1917] hover:bg-[#2e2a27] text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Sending verification code…</span>
                          </>
                        ) : (
                          <>
                            <span>Send Verification Code</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Password Mode */
                    <form onSubmit={handlePasswordAuth} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-[#44403c] mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a8a29e]">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                            disabled={isLoading}
                            className="w-full bg-[#fbfaf8] border border-[#e5e0d4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] focus:bg-white transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#44403c] mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a8a29e]">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            className="w-full bg-[#fbfaf8] border border-[#e5e0d4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] focus:bg-white transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#78716c]">
                        <span>{isSignUp ? 'Already have an account?' : 'Need an account?'}</span>
                        <button
                          type="button"
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-[#c2410c] hover:underline font-medium cursor-pointer"
                        >
                          {isSignUp ? 'Sign in' : 'Create an account'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1c1917] hover:bg-[#2e2a27] text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Authenticating…</span>
                          </>
                        ) : (
                          <>
                            <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="pt-3 border-t border-[#f2eee5] text-center">
                    <p className="text-[11px] text-[#78716c] flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#15803d]" />
                      Encrypted authentication &amp; private document workspace
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbfaf8] border border-[#e5e0d4] text-xs text-[#57534e] mb-2">
                  <Mail className="w-3.5 h-3.5 text-[#c2410c]" />
                  <span>Code sent to:</span>
                  <strong className="text-[#1c1917] font-medium font-mono">{email}</strong>
                </div>
                <h3 className="text-base font-serif-title font-medium text-[#1c1917]">Enter {otpLength}-Digit Code</h3>
                <p className="text-xs text-[#78716c] mt-0.5">
                  Check your inbox for the one-time verification passcode
                </p>
              </div>

              {/* Segmented OTP Input */}
              <div className="flex justify-between gap-1.5" onPaste={handlePaste}>
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
                    className={`${otpLength === 8 ? 'w-10 h-13 text-lg' : 'w-12 h-14 text-xl'} text-center font-bold font-mono rounded-xl bg-[#fbfaf8] border transition-all duration-150 outline-none ${
                      digit
                        ? 'border-[#1c1917] bg-white text-[#1c1917] shadow-xs'
                        : 'border-[#e5e0d4] text-[#1c1917] focus:border-[#1c1917] focus:bg-white'
                    }`}
                  />
                ))}
              </div>

              {/* Code Length Switcher */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => handleToggleOtpLength()}
                  className="text-[11px] text-[#c2410c] hover:underline font-medium transition-colors cursor-pointer"
                >
                  {otpLength === 6 ? 'Have an 8-digit code? Click here →' : 'Switch back to 6 digits →'}
                </button>
              </div>

              {/* Verify Action Button */}
              <button
                type="button"
                id="verify-otp-btn"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otp.some((d) => !d) || isSuccess}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1c1917] hover:bg-[#2e2a27] text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Code…</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
                    <span>{successMessage || 'Verified! Redirecting…'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Code &amp; Continue</span>
                  </>
                )}
              </button>

              {/* Actions & Resend */}
              <div className="flex items-center justify-between text-xs text-[#78716c] pt-2 border-t border-[#f2eee5]">
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setOtp(['', '', '', '', '', '']);
                    setPastedLink('');
                    setError('');
                  }}
                  className="flex items-center gap-1 text-[#57534e] hover:text-[#1c1917] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>

                <div>
                  {resendCooldown > 0 ? (
                    <span className="text-[#a8a29e] font-mono">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[#c2410c] hover:underline font-medium cursor-pointer"
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

      {/* Human, minimal footer */}
      <div className="mt-8 text-center text-xs text-[#78716c] relative z-10">
        DocMind Studio &bull; Private &amp; Collaborative Workspace
      </div>
    </div>
  );
}
