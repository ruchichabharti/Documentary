import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, RefreshCw, KeyRound, Sparkles, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.jsx';

export default function Auth() {
  const { sendOtp, verifyOtp, continueAsGuest, user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    }
  }, [user, navigate, location]);

  const [step, setStep] = useState('EMAIL'); // 'EMAIL' | 'OTP'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const otpInputsRef = useRef([]);

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

  const handleGuestLogin = () => {
    const userEmail = email.trim() || 'ruchichab@gmail.com';
    continueAsGuest(userEmail);
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#3b82f6'],
    });
    navigate('/dashboard', { replace: true });
  };

  // Handle email submission
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. You can use "Instant Guest Access" below to explore all features immediately!');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendOtp(email);
      setStep('OTP');
      setResendCooldown(60);
    } catch (err) {
      console.error('OTP Send Error:', err);
      if (err.message?.includes('fetch') || err.name === 'TypeError') {
        setError('Could not reach your Supabase URL (network/DNS error). Please verify VITE_SUPABASE_URL in client/.env, or click "Instant Guest Access" below to enter right now.');
      } else {
        setError(err.message || 'Failed to send verification code. Please check your email and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle individual OTP input changes
  const handleOtpChange = (index, value) => {
    // Only accept numeric inputs
    const sanitized = value.replace(/[^0-9]/g, '');
    if (!sanitized && value !== '') return;

    const newOtp = [...otp];

    if (sanitized.length > 1) {
      // User pasted multiple digits into one box
      const pastedChars = sanitized.slice(0, 6).split('');
      pastedChars.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedChars.length, 5);
      otpInputsRef.current[nextIndex]?.focus();

      // If full 6 digits filled, auto submit
      if (newOtp.every((digit) => digit !== '')) {
        handleVerifyOtp(newOtp.join(''));
      }
      return;
    }

    newOtp[index] = sanitized;
    setOtp(newOtp);

    // Auto advance to next input
    if (sanitized && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto verify if all 6 digits are filled
    if (sanitized && index === 5 && newOtp.every((digit) => digit !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  // Handle keydown for backspace & navigation
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

  // Handle paste across all boxes
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
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

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
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
            Add your real <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-100">VITE_SUPABASE_URL</code> and <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-100">VITE_SUPABASE_ANON_KEY</code> in <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-100">client/.env</code> to trigger live email OTP verification.
          </div>
        </motion.div>
      )}

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#12131c]/90 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10"
      >
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-3 ring-1 ring-white/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            DocMind <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Auth</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Zero-password secure authentication via email OTP
          </p>
        </div>

        {/* Error notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleGuestLogin}
                className="mt-1 w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enter Dashboard directly {email ? `as ${email}` : ''} →</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic form steps */}
        <AnimatePresence mode="wait">
          {step === 'EMAIL' ? (
            <motion.form
              key="step-email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
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
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending code…</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#12131c] px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  or
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              <button
                type="button"
                id="guest-login-btn"
                onClick={handleGuestLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-slate-200 hover:text-white font-medium text-xs transition-all duration-200 shadow cursor-pointer hover:border-indigo-500/40"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Instant Guest Access (Explore Demo Mode)</span>
              </button>

              <div className="pt-4 border-t border-slate-800/80 text-center">
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Protected by Supabase Auth with Row Level Security
                </p>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 mb-2">
                  <span>Code sent to:</span>
                  <strong className="text-indigo-300 font-medium">{email}</strong>
                </div>
                <p className="text-xs text-slate-400">
                  Enter the 6-digit code received in your inbox
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

              {/* Verify Action */}
              <button
                type="button"
                id="verify-otp-btn"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otp.some((d) => !d) || isSuccess}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying…</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Verified! Redirecting…</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Code & Continue</span>
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
                      Resend Code
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
