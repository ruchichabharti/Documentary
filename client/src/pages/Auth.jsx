import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  KeyRound, 
  Feather, 
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
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#c2410c', '#ea580c', '#f97316', '#fdba74', '#1c1917'],
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
      await sendOtp(cleanInputEmail);
      setStep('OTP');
      setResendCooldown(60);
    } catch (err) {
      console.warn('[DocMind Auth] Send OTP caught error:', err);
      const msg = err.message || 'Failed to dispatch verification email.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleOtpLength = () => {
    const newLen = otpLength === 6 ? 8 : 6;
    setOtpLength(newLen);
    setOtp(Array(newLen).fill(''));
    setError('');
    setTimeout(() => {
      otpInputsRef.current[0]?.focus();
    }, 50);
  };

  const handleOtpChange = (index, value) => {
    const val = value.replace(/\D/g, '');
    if (!val && value !== '') return;

    const newOtp = [...otp];

    if (val.length > 1) {
      const digits = val.slice(0, otpLength).split('');
      for (let i = 0; i < otpLength; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const nextIdx = Math.min(digits.length, otpLength - 1);
      otpInputsRef.current[nextIdx]?.focus();
      if (digits.length >= otpLength) {
        handleAutoVerify(newOtp.join(''));
      }
      return;
    }

    newOtp[index] = val;
    setOtp(newOtp);

    if (val && index < otpLength - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }

    const fullCode = newOtp.join('');
    if (fullCode.length === otpLength && !newOtp.some((d) => !d)) {
      handleAutoVerify(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpInputsRef.current[index - 1]?.focus();
      } else if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < otpLength - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (
      pastedData.startsWith('http://') ||
      pastedData.startsWith('https://') ||
      pastedData.includes('token=') ||
      pastedData.includes('code=')
    ) {
      setPastedLink(pastedData);
      handleLinkVerification(pastedData);
      return;
    }

    const numericOnly = pastedData.replace(/\D/g, '');
    if (!numericOnly) return;

    let targetLen = otpLength;
    if (numericOnly.length === 8 && otpLength === 6) {
      setOtpLength(8);
      targetLen = 8;
    } else if (numericOnly.length === 6 && otpLength === 8) {
      setOtpLength(6);
      targetLen = 6;
    }

    const digits = numericOnly.slice(0, targetLen).split('');
    const newOtp = Array(targetLen).fill('');
    for (let i = 0; i < digits.length; i++) {
      newOtp[i] = digits[i];
    }
    setOtp(newOtp);

    const focusIdx = Math.min(digits.length, targetLen - 1);
    otpInputsRef.current[focusIdx]?.focus();

    if (digits.length >= targetLen) {
      handleAutoVerify(newOtp.join(''));
    }
  };

  const handleAutoVerify = async (codeToVerify) => {
    setIsLoading(true);
    setError('');

    try {
      await verifyOtp(email, codeToVerify);
      setIsSuccess(true);
      setSuccessMessage('Code verified! Entering workspace…');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#c2410c', '#ea580c', '#f97316', '#fdba74', '#1c1917'],
      });
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 900);
    } catch (err) {
      console.warn('[DocMind Auth] Verification error:', err);
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < otpLength) {
      setError(`Please enter the complete ${otpLength}-digit verification code.`);
      return;
    }
    await handleAutoVerify(code);
  };

  const handleLinkVerification = async (linkText) => {
    setIsLoading(true);
    setError('');

    try {
      await verifyLinkOrCode(linkText);
      setIsSuccess(true);
      setSuccessMessage('Confirmed! Entering workspace…');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#c2410c', '#ea580c', '#f97316', '#fdba74', '#1c1917'],
      });
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 900);
    } catch (err) {
      setError(err.message || 'Failed to authenticate with that link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUpWithPassword(email, password);
        setIsSuccess(true);
        setSuccessMessage('Account created! Entering workspace…');
      } else {
        await signInWithPassword(email, password);
        setIsSuccess(true);
        setSuccessMessage('Welcome back! Entering workspace…');
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#c2410c', '#ea580c', '#f97316', '#fdba74', '#1c1917'],
      });
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 900);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-[#fed7aa] selection:text-[#7c2d12] font-sans">
      {/* Notice banner */}
      {!isSupabaseConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mb-6 p-4 rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-[#7c2d12] text-xs flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#c2410c] mt-0.5" />
          <div>
            <span className="font-semibold text-[#9a3412] block mb-1">Configuration Notice</span>
            Provide your <code className="bg-[#ffedd5] px-1 py-0.5 rounded text-[#7c2d12] font-mono">VITE_SUPABASE_URL</code> in environment variables for cloud persistence.
          </div>
        </motion.div>
      )}

      {/* Main Notion-Style Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-[#ffffff] border border-[#e7e5e4] rounded-2xl p-8 shadow-md shadow-stone-200/50 relative z-10"
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
            Sign in to access your reading studio and notes
          </p>
        </div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs flex items-center gap-2"
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
                  <div className="p-4 rounded-xl bg-[#faf9f6] border border-[#e7e5e4] text-[#57534e] text-xs">
                    <span>Currently signed in as:</span>
                    <div className="font-semibold text-[#1c1917] font-mono text-sm mt-1">{user.email}</div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard', { replace: true })}
                      className="btn-ink w-full py-2.5"
                    >
                      <span>Continue to Studio</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setEmail('');
                        setStep('EMAIL');
                      }}
                      className="btn-notion-secondary w-full py-2"
                    >
                      Sign Out &amp; Use Another Email
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab Selector */}
                  <div className="flex bg-[#f5f4f0] p-1 rounded-xl border border-[#e7e5e4]">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('OTP'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        authMode === 'OTP'
                          ? 'bg-[#ffffff] text-[#1c1917] shadow-xs font-semibold'
                          : 'text-[#78716c] hover:text-[#1c1917]'
                      }`}
                    >
                      Email Passcode
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('PASSWORD'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        authMode === 'PASSWORD'
                          ? 'bg-[#ffffff] text-[#1c1917] shadow-xs font-semibold'
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
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a8a29e]">
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
                            className="input-notion !pl-10 input-notion-icon"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="send-otp-btn"
                        disabled={isLoading || !email}
                        className="btn-ink w-full py-2.5"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#faf9f6]" />
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
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a8a29e]">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
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
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            className="input-notion !pl-10 input-notion-icon"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#78716c]">
                        <span>{isSignUp ? 'Already registered?' : 'Need an account?'}</span>
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
                        className="btn-ink w-full py-2.5"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#faf9f6]" />
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

                  <div className="pt-3 border-t border-[#f5f4f0] text-center">
                    <p className="text-[11px] text-[#78716c] flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a]" />
                      Encrypted authentication &amp; private workspace
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff7ed] border border-[#fed7aa] text-xs text-[#9a3412] mb-2">
                  <Mail className="w-3.5 h-3.5 text-[#c2410c]" />
                  <span>Code sent to:</span>
                  <strong className="text-[#1c1917] font-semibold font-mono">{email}</strong>
                </div>
                <h3 className="font-serif-editorial text-xl font-normal text-[#1c1917]">Enter {otpLength}-Digit Code</h3>
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
                    className={`${otpLength === 8 ? 'w-10 h-13 text-lg' : 'w-12 h-14 text-xl'} text-center font-bold font-mono rounded-xl bg-[#ffffff] border transition-all duration-150 outline-none ${
                      digit
                        ? 'border-[#c2410c] bg-[#fff7ed] text-[#9a3412] ring-2 ring-[#fed7aa]'
                        : 'border-[#e7e5e4] text-[#1c1917] focus:border-[#1c1917] focus:ring-2 focus:ring-stone-200'
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
                className="btn-ink w-full py-3"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#faf9f6]" />
                    <span>Verifying Code…</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                    <span>{successMessage || 'Verified! Entering Workspace…'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Code &amp; Continue</span>
                  </>
                )}
              </button>

              {/* Actions & Resend */}
              <div className="flex items-center justify-between text-xs text-[#78716c] pt-2 border-t border-[#f5f4f0]">
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

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-[#a8a29e] relative z-10 font-serif-editorial">
        DocMind Studio &bull; Clean Editorial Edition
      </div>
    </div>
  );
}
