import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Feather,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.jsx';

export default function Auth() {
  const {
    signInWithPassword,
    signUpWithPassword,
    sendOtp,
    signOut,
    user,
    isSupabaseConfigured
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'LOGIN' (Existing account) | 'SIGNUP' (New user)
  const [mode, setMode] = useState('LOGIN');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const otpInputRef = useRef(null);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Clear feedback when switching modes
  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setInfoMessage('');
    setOtp('');
  };

  // Dispatch OTP to email for new user registration
  const handleSendOtp = async (targetEmail = email) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address first.');
      return false;
    }

    setIsSendingOtp(true);
    setError('');
    setInfoMessage('');

    try {
      const result = await sendOtp(cleanEmail);
      setOtpSent(true);
      setResendCooldown(60);
      if (result?.code) {
        setOtp(result.code);
        setInfoMessage(`Verification code: ${result.code} (Host blocked SMTP — code auto-filled for you!)`);
      } else {
        setInfoMessage(`Verification code sent to ${cleanEmail}! Please check your inbox.`);
      }
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
      return true;
    } catch (err) {
      console.warn('[DocMind Auth] Send OTP error:', err);
      setError(err.message || 'Failed to send verification code. Please check email address.');
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Existing User Login (Email + Password only)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');
    setInfoMessage('');

    try {
      await signInWithPassword(cleanEmail, password);
      setIsSuccess(true);
      setSuccessMessage('Welcome back! Entering workspace…');

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#c2410c', '#ea580c', '#f97316', '#fdba74', '#1c1917'],
      });

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 800);
    } catch (err) {
      console.warn('[DocMind Auth] Login error:', err);
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // New User Registration (Email + Password + OTP)
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Please provide a password with at least 6 characters.');
      return;
    }

    // If OTP has not been sent yet or user hasn't typed an OTP, trigger send
    if (!cleanOtp) {
      const sent = await handleSendOtp(cleanEmail);
      if (sent) {
        setInfoMessage(`We just sent a 6-digit verification code to ${cleanEmail}. Enter it below to complete signup.`);
      }
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signUpWithPassword(cleanEmail, password, cleanOtp);
      setIsSuccess(true);
      setSuccessMessage('Account verified & created! Entering workspace…');

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#c2410c', '#ea580c', '#f97316', '#fdba74', '#1c1917'],
      });

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 900);
    } catch (err) {
      console.warn('[DocMind Auth] Signup error:', err);
      setError(err.message || 'Verification failed. Please check the OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1c1917] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-[#fed7aa] selection:text-[#7c2d12] font-sans">
      {/* Main Notion-Style Editorial Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-[#ffffff] border border-[#e7e5e4] rounded-2xl p-7 sm:p-8 shadow-md shadow-stone-200/50 relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-11 h-11 rounded-xl bg-[#faf9f6] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center mb-3 shadow-xs">
            <Feather className="w-5 h-5 stroke-[2]" />
          </div>
          <h1 className="font-serif-editorial text-2xl font-normal tracking-tight text-[#1c1917]">
            DocMind Studio
          </h1>
          <p className="text-[#78716c] text-xs mt-1 leading-relaxed font-normal">
            {mode === 'LOGIN'
              ? 'Welcome back! Enter your email and password to sign in'
              : 'New to DocMind? Create your account with email verification'}
          </p>
        </div>

        {/* Success Screen Banner */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-xs flex items-center gap-2.5 font-medium shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs flex items-start gap-2 shadow-2xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#dc2626] mt-0.5" />
              <span className="leading-snug">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info / OTP Sent Notice */}
        <AnimatePresence>
          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-xl bg-[#fff7ed] border border-[#fed7aa] text-[#9a3412] text-xs flex items-start gap-2 shadow-2xs"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-[#c2410c] mt-0.5" />
              <span className="leading-snug">{infoMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {user ? (
          /* User is already signed in */
          <div className="space-y-4 text-center py-2">
            <div className="p-4 rounded-xl bg-[#faf9f6] border border-[#e7e5e4] text-[#57534e] text-xs">
              <span>Currently signed in as:</span>
              <div className="font-semibold text-[#1c1917] font-mono text-sm mt-1">{user.email}</div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="btn-ink w-full py-2.5 shadow-xs"
              >
                <span>Continue to Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setEmail('');
                  setPassword('');
                  setOtp('');
                }}
                className="btn-notion-secondary w-full py-2 cursor-pointer"
              >
                Sign Out &amp; Use Another Account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Switcher Tabs: Sign In vs Create Account */}
            <div className="flex bg-[#f5f4f0] p-1 rounded-xl border border-[#e7e5e4]">
              <button
                type="button"
                onClick={() => handleSwitchMode('LOGIN')}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                  mode === 'LOGIN'
                    ? 'bg-[#ffffff] text-[#1c1917] shadow-xs font-semibold'
                    : 'text-[#78716c] hover:text-[#1c1917] font-medium'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('SIGNUP')}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                  mode === 'SIGNUP'
                    ? 'bg-[#ffffff] text-[#1c1917] shadow-xs font-semibold'
                    : 'text-[#78716c] hover:text-[#1c1917] font-medium'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* ── FLOW 1: EXISTING USER LOGIN (Email + Password only) ───────── */}
            {mode === 'LOGIN' && (
              <motion.form
                key="form-login"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleLoginSubmit}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-medium text-[#44403c] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a8a29e]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoFocus
                      required
                      disabled={isLoading}
                      className="input-notion !pl-10 input-notion-icon"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#44403c] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a8a29e]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      className="input-notion !pl-10 !pr-10 input-notion-icon"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#a8a29e] hover:text-[#1c1917] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#78716c] pt-0.5">
                  <span>New to DocMind?</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('SIGNUP')}
                    className="text-[#c2410c] hover:underline font-medium cursor-pointer"
                  >
                    Create an account
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="btn-ink w-full py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 font-medium"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#faf9f6]" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* ── FLOW 2: NEW USER SIGNUP (Email + Password + OTP) ──────────── */}
            {mode === 'SIGNUP' && (
              <motion.form
                key="form-signup"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleSignupSubmit}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-medium text-[#44403c] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a8a29e]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoFocus
                      required
                      disabled={isLoading || isSendingOtp}
                      className="input-notion !pl-10 input-notion-icon"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#44403c] mb-1.5">
                    Create Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a8a29e]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="input-notion !pl-10 !pr-10 input-notion-icon"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#a8a29e] hover:text-[#1c1917] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-[#44403c]">
                      Email Verification Code (OTP)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSendOtp(email)}
                      disabled={isSendingOtp || resendCooldown > 0 || !email}
                      className="text-[11px] font-semibold text-[#c2410c] hover:underline disabled:text-[#a8a29e] disabled:no-underline cursor-pointer flex items-center gap-1"
                    >
                      {isSendingOtp ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Sending…</span>
                        </>
                      ) : resendCooldown > 0 ? (
                        <span>Resend code ({resendCooldown}s)</span>
                      ) : otpSent ? (
                        <span>Resend OTP</span>
                      ) : (
                        <span>Send OTP to Email</span>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a8a29e]">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      ref={otpInputRef}
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP code"
                      disabled={isLoading}
                      className="input-notion !pl-10 font-mono tracking-widest text-sm input-notion-icon placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-[#78716c] mt-1">
                    Click <strong>"Send OTP to Email"</strong> to receive your code via Gmail.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-[#78716c] pt-0.5">
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('LOGIN')}
                    className="text-[#c2410c] hover:underline font-medium cursor-pointer"
                  >
                    Sign in
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="btn-ink w-full py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 font-medium"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#faf9f6]" />
                      <span>Verifying &amp; Creating Account…</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account with OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* Footer Trust Marker */}
            <div className="pt-3 border-t border-[#f5f4f0] text-center">
              <p className="text-[11px] text-[#78716c] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a]" />
                Encrypted authentication &amp; private document workspace
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
