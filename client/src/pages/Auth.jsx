import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  KeyRound, 
  Terminal, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Lock,
  Binary
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
          setSuccessMessage('AUTHENTICATED VIA TOKEN // ACCESS GRANTED');
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2'],
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
      setSuccessMessage('CODE VERIFIED // ENTERING CONSOLE…');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2'],
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
      setSuccessMessage('CONFIRMED // ENTERING CONSOLE…');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2'],
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
        setSuccessMessage('ACCOUNT CREATED // ENTERING CONSOLE…');
      } else {
        await signInWithPassword(email, password);
        setIsSuccess(true);
        setSuccessMessage('SESSION VERIFIED // ACCESS GRANTED');
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2'],
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
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-center items-center px-4 py-8 relative selection:bg-cyan-950 selection:text-cyan-300 font-sans">
      {/* Notice banner */}
      {!isSupabaseConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mb-6 p-4 rounded-lg border border-cyan-500/30 bg-[#121215] text-[#a1a1aa] text-xs flex items-start gap-3 shadow-md font-mono"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-cyan-400 mt-0.5" />
          <div>
            <span className="font-semibold text-cyan-400 block mb-0.5">[SYSTEM_CONFIG // NOTICE]</span>
            Local SMTP active. Provide <code className="text-[#fafafa]">VITE_SUPABASE_URL</code> in environment variables for cloud persistence.
          </div>
        </motion.div>
      )}

      {/* Main Swiss Minimalist Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-xl p-8 shadow-2xl relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-10 h-10 rounded-lg bg-[#18181b] border border-[#27272a] text-cyan-400 flex items-center justify-center mb-3 shadow-xs font-mono font-bold text-sm">
            &gt;_
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 mb-1">
            <span>[ AUTH_GATE // DOCMIND ]</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-[#fafafa]">
            Command Access
          </h1>
          <p className="text-[#71717a] text-xs mt-1 font-mono">
            Authenticate to enter repository workspace
          </p>
        </div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-md bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono"
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
                <div className="space-y-4 text-center py-2 font-mono">
                  <div className="p-3.5 rounded-md bg-[#09090b] border border-[#27272a] text-xs">
                    <span className="text-[#71717a]">// ACTIVE SESSION IDENTIFIER:</span>
                    <div className="font-semibold text-cyan-400 text-sm mt-1">{user.email}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard', { replace: true })}
                      className="btn-cyan w-full py-2.5 font-mono text-xs"
                    >
                      <span>ENTER WORKSPACE</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#041014]" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setEmail('');
                        setStep('EMAIL');
                      }}
                      className="btn-linear-secondary w-full py-2 font-mono text-xs text-[#a1a1aa]"
                    >
                      SWITCH ACCOUNT
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab Selector */}
                  <div className="flex bg-[#09090b] p-1 rounded-lg border border-[#27272a] font-mono">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('OTP'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs rounded transition-all ${
                        authMode === 'OTP'
                          ? 'bg-[#18181b] text-cyan-400 border border-[#27272a] font-semibold'
                          : 'text-[#71717a] hover:text-[#a1a1aa]'
                      }`}
                    >
                      EMAIL PASSCODE
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('PASSWORD'); setError(''); }}
                      className={`flex-1 py-1.5 text-xs rounded transition-all ${
                        authMode === 'PASSWORD'
                          ? 'bg-[#18181b] text-cyan-400 border border-[#27272a] font-semibold'
                          : 'text-[#71717a] hover:text-[#a1a1aa]'
                      }`}
                    >
                      PASSWORD
                    </button>
                  </div>

                  {authMode === 'OTP' ? (
                    /* OTP Mode */
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono text-[#a1a1aa] mb-1.5">
                          // EMAIL IDENTIFIER
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            id="email-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@domain.com"
                            autoFocus
                            required
                            disabled={isLoading}
                            className="input-linear pl-9 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="send-otp-btn"
                        disabled={isLoading || !email}
                        className="btn-cyan w-full py-2.5 font-mono text-xs"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#041014]" />
                            <span>DISPATCHING CODE…</span>
                          </>
                        ) : (
                          <>
                            <span>DISPATCH VERIFICATION CODE</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#041014]" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Password Mode */
                    <form onSubmit={handlePasswordAuth} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-mono text-[#a1a1aa] mb-1.5">
                          // EMAIL IDENTIFIER
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@domain.com"
                            required
                            disabled={isLoading}
                            className="input-linear pl-9 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-[#a1a1aa] mb-1.5">
                          // ACCESS KEY / PASSWORD
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            className="input-linear pl-9 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono text-[#71717a]">
                        <span>{isSignUp ? 'REGISTERED ALREADY?' : 'NEW USER?'}</span>
                        <button
                          type="button"
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                        >
                          {isSignUp ? 'SIGN IN' : 'CREATE ACCOUNT'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="btn-cyan w-full py-2.5 font-mono text-xs"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#041014]" />
                            <span>AUTHENTICATING…</span>
                          </>
                        ) : (
                          <>
                            <span>{isSignUp ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#041014]" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="pt-3 border-t border-[#1f1f23] text-center font-mono">
                    <p className="text-[11px] text-[#71717a] flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      ENCRYPTED REPOSITORY GATE &bull; ZERO TRACKING
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
              className="space-y-4 font-mono"
            >
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#09090b] border border-[#27272a] text-xs text-[#a1a1aa] mb-2">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TARGET:</span>
                  <strong className="text-cyan-400">{email}</strong>
                </div>
                <h3 className="text-sm font-semibold text-[#fafafa]">INPUT {otpLength}-DIGIT SECURITY PASSCODE</h3>
                <p className="text-[11px] text-[#71717a] mt-0.5">
                  Check your mail feed for the one-time authentication token
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
                    className={`${otpLength === 8 ? 'w-10 h-12 text-base' : 'w-12 h-13 text-lg'} text-center font-bold font-mono rounded-md bg-[#09090b] border transition-all duration-150 outline-none ${
                      digit
                        ? 'border-cyan-400 bg-cyan-950/20 text-cyan-300 ring-2 ring-cyan-500/20'
                        : 'border-[#27272a] text-[#fafafa] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                    }`}
                  />
                ))}
              </div>

              {/* Code Length Switcher */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => handleToggleOtpLength()}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors cursor-pointer"
                >
                  {otpLength === 6 ? '[TOGGLE: 8-DIGIT TOKEN →]' : '[TOGGLE: 6-DIGIT TOKEN →]'}
                </button>
              </div>

              {/* Verify Action Button */}
              <button
                type="button"
                id="verify-otp-btn"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otp.some((d) => !d) || isSuccess}
                className="btn-cyan w-full py-2.5 text-xs font-mono"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#041014]" />
                    <span>VALIDATING TOKEN…</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#041014]" />
                    <span>{successMessage || 'VALIDATED // ENTERING CONSOLE…'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-[#041014]" />
                    <span>VALIDATE &amp; ENTER WORKSPACE</span>
                  </>
                )}
              </button>

              {/* Actions & Resend */}
              <div className="flex items-center justify-between text-xs text-[#71717a] pt-2 border-t border-[#1f1f23]">
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setOtp(['', '', '', '', '', '']);
                    setPastedLink('');
                    setError('');
                  }}
                  className="flex items-center gap-1 text-[#a1a1aa] hover:text-[#fafafa] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>CHANGE TARGET</span>
                </button>

                <div>
                  {resendCooldown > 0 ? (
                    <span className="text-[#52525b] font-mono">
                      RESEND IN {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      RESEND EMAIL
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-[#52525b] font-mono relative z-10">
        DOCMIND CORE &bull; SWISS MINIMALIST INTERFACE
      </div>
    </div>
  );
}
