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
            particleCount: 75,
            spread: 65,
            origin: { y: 0.6 },
            colors: ['#d97706', '#f59e0b', '#fbbf24', '#c2410c', '#f7f2eb'],
          });
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1200);
        }
      } catch (_) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [step, navigate, email]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const cleanInputEmail = email.trim().toLowerCase();
    setIsLoading(true);
    setError('');

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
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#d97706', '#f59e0b', '#fbbf24', '#c2410c', '#f7f2eb'],
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
      setSuccessMessage('Verified! Entering Library Vault…');
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#d97706', '#f59e0b', '#fbbf24', '#c2410c', '#f7f2eb'],
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
      setSuccessMessage('Verified via link! Entering Library Vault…');
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#d97706', '#f59e0b', '#fbbf24', '#c2410c', '#f7f2eb'],
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
    <div className="min-h-screen bg-[#120f0d] text-[#f7f2eb] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-[#78350f] selection:text-[#fef3c7]">
      {/* Supabase unconfigured warning banner */}
      {!isSupabaseConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs flex items-start gap-3 shadow-md"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300 block mb-1">Configuration Notice</span>
            Provide your <code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-100 font-mono">VITE_SUPABASE_URL</code> and <code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-100 font-mono">VITE_SUPABASE_ANON_KEY</code> in environment settings for live email dispatch.
          </div>
        </motion.div>
      )}

      {/* Main Luxury Paper Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-[#1a1512] border border-[#332922] rounded-2xl p-8 shadow-2xl relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#241c18] border border-[#3d3027] text-amber-400 flex items-center justify-center mb-3.5 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-normal font-serif-luxury tracking-tight text-[#f7f2eb]">
            DocMind Studio
          </h1>
          <p className="text-[#a89888] text-xs mt-1.5 leading-relaxed font-normal">
            Sign in to access your library vault and notes
          </p>
        </div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
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
                  <div className="p-4 rounded-xl bg-[#14100e] border border-[#2d241e] text-[#a89888] text-xs">
                    <span>Currently signed in as:</span>
                    <div className="font-semibold text-[#f7f2eb] font-mono text-sm mt-1">{user.email}</div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard', { replace: true })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-[#120f0d] font-semibold text-sm transition-all shadow-md shadow-amber-950/40 cursor-pointer"
                    >
                      <span>Continue to Library Vault</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setEmail('');
                        setStep('EMAIL');
                      }}
                      className="w-full py-2 px-4 rounded-xl border border-[#332922] hover:bg-[#241c18] text-[#a89888] hover:text-[#f7f2eb] text-xs font-medium transition-all cursor-pointer"
                    >
                      Sign Out &amp; Use Another Email
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab Selector */}
                  <div className="flex bg-[#14100e] p-1 rounded-xl border border-[#2d241e]">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('OTP'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        authMode === 'OTP'
                          ? 'bg-[#241c18] text-amber-300 shadow-sm border border-[#3d3027]'
                          : 'text-[#736557] hover:text-[#a89888]'
                      }`}
                    >
                      Email Passcode
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('PASSWORD'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        authMode === 'PASSWORD'
                          ? 'bg-[#241c18] text-amber-300 shadow-sm border border-[#3d3027]'
                          : 'text-[#736557] hover:text-[#a89888]'
                      }`}
                    >
                      Password
                    </button>
                  </div>

                  {authMode === 'OTP' ? (
                    /* OTP Mode */
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#a89888] mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736557]">
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
                            className="input-luxury pl-10"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="send-otp-btn"
                        disabled={isLoading || !email}
                        className="btn-cognac w-full py-2.5"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#120f0d]" />
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
                        <label className="block text-xs font-medium text-[#a89888] mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736557]">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                            disabled={isLoading}
                            className="input-luxury pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#a89888] mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736557]">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            className="input-luxury pl-10"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#736557]">
                        <span>{isSignUp ? 'Already registered?' : 'Need an account?'}</span>
                        <button
                          type="button"
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                        >
                          {isSignUp ? 'Sign in' : 'Create an account'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="btn-cognac w-full py-2.5"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#120f0d]" />
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

                  <div className="pt-3 border-t border-[#261e19] text-center">
                    <p className="text-[11px] text-[#736557] flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Encrypted authentication &amp; private library vault
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14100e] border border-[#2d241e] text-xs text-[#a89888] mb-2">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Code sent to:</span>
                  <strong className="text-[#f7f2eb] font-medium font-mono">{email}</strong>
                </div>
                <h3 className="text-base font-serif-luxury font-normal text-[#f7f2eb]">Enter {otpLength}-Digit Code</h3>
                <p className="text-xs text-[#736557] mt-0.5">
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
                    className={`${otpLength === 8 ? 'w-10 h-13 text-lg' : 'w-12 h-14 text-xl'} text-center font-bold font-mono rounded-xl bg-[#14100e] border transition-all duration-150 outline-none ${
                      digit
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 ring-2 ring-amber-500/20'
                        : 'border-[#332922] text-[#f7f2eb] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                    }`}
                  />
                ))}
              </div>

              {/* Code Length Switcher */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => handleToggleOtpLength()}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
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
                className="btn-cognac w-full py-3"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#120f0d]" />
                    <span>Verifying Code…</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                    <span>{successMessage || 'Verified! Entering Library Vault…'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Code &amp; Continue</span>
                  </>
                )}
              </button>

              {/* Actions & Resend */}
              <div className="flex items-center justify-between text-xs text-[#736557] pt-2 border-t border-[#261e19]">
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setOtp(['', '', '', '', '', '']);
                    setPastedLink('');
                    setError('');
                  }}
                  className="flex items-center gap-1 text-[#a89888] hover:text-[#f7f2eb] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>

                <div>
                  {resendCooldown > 0 ? (
                    <span className="text-[#736557] font-mono">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
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
      <div className="mt-8 text-center text-xs text-[#736557] relative z-10">
        DocMind Studio &bull; Private &amp; Collaborative Vault
      </div>
    </div>
  );
}
