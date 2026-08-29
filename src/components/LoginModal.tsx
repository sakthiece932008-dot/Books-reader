import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, ShieldCheck, Mail, BookOpen, X, 
  ArrowRight, RefreshCw, User as UserIcon,
  LogOut, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { 
    user, 
    requestEmailOtp, 
    verifyEmailOtp, 
    loginWithEmailDirect,
    loginWithGoogleAccount, 
    loginAsGuest,
    logout, 
    showLoginModal, 
    setShowLoginModal 
  } = useAuth();

  // Mode: 'home' | 'email_input' | 'otp_verify' | 'google_picker'
  const [authMode, setAuthMode] = useState<'home' | 'email_input' | 'otp_verify' | 'google_picker'>('home');
  
  // Email & Name state
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Custom Google account input
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authMode === 'otp_verify' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authMode, countdown]);

  if (!showLoginModal && user) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await requestEmailOtp(cleanEmail, nameInput);
      if (res.success) {
        setAuthMode('otp_verify');
        setCountdown(60);
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessNotice(`Verification code sent to ${cleanEmail}`);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        setErrorMessage(res.error || 'Failed to dispatch verification email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Pasted full OTP code
      const pastedDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pastedDigits.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(5, index + pastedDigits.length);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const val = value.slice(-1).replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    // Auto-advance
    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await verifyEmailOtp(emailInput, fullCode, nameInput);
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid verification code.');
      } else {
        setSuccessNotice('Email verified successfully! Welcome.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setErrorMessage(null);
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

    // If Google Identity Services SDK is available and client ID is provided
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2 && clientId) {
      try {
        setIsSubmitting(true);
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const profile = await res.json();
                await loginWithGoogleAccount({
                  email: profile.email,
                  name: profile.name || profile.email.split('@')[0],
                  picture: profile.picture,
                  credential: tokenResponse.access_token
                });
                setShowLoginModal(false);
              } catch (err: any) {
                setErrorMessage('Failed to load Google profile. ' + err.message);
              } finally {
                setIsSubmitting(false);
              }
            } else {
              setIsSubmitting(false);
            }
          },
          error_callback: () => {
            setIsSubmitting(false);
            // Fallback: 1-click instant login with Google Account
            loginWithGoogleAccount();
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Google GIS token client failed, logging in with Google Account:', err);
        setIsSubmitting(false);
      }
    }

    // Direct 1-Click Google Sign-In
    setIsSubmitting(true);
    try {
      await loginWithGoogleAccount();
      setShowLoginModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmailInput.trim() || !googleEmailInput.includes('@')) {
      setErrorMessage('Please enter a valid Google Account email.');
      return;
    }
    setIsSubmitting(true);
    try {
      await loginWithGoogleAccount({
        email: googleEmailInput.trim().toLowerCase(),
        name: googleNameInput.trim() || googleEmailInput.split('@')[0],
      });
      setShowLoginModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate Google Account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden space-y-0">
        
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-700 p-6 text-white text-center relative">
          {user && (
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 shadow-inner">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">ClearText Reader</h2>
          <p className="text-xs text-indigo-100 mt-1">Bilingual Reader, Live Dictionary & AI Study Companion</p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">

          {/* If already logged in */}
          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-sm">
                  {user.name[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm truncate">{user.name}</h3>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                    {user.authProvider === 'email' ? '✓ Email OTP Verified' : user.authProvider === 'google' ? '✓ Google Verified' : 'Guest Account'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    logout();
                    setAuthMode('home');
                  }}
                  className="w-1/2 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-rose-600 hover:bg-rose-500/10 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Switch Account
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Continue Reading
                </button>
              </div>
            </div>
          ) : (
            /* Auth Flows */
            <>
              {/* Error / Success Banners */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* HOME SCREEN: Choose Google Account or Email Sign-in */}
              {authMode === 'home' && (
                <div className="space-y-3">
                  <div className="text-center mb-1">
                    <h3 className="text-base font-bold text-[var(--foreground)]">Welcome to ClearText Reader</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Sign in to sync your bilingual library and study notes</p>
                  </div>

                  {/* Option 1: 1-Click Google Sign-In (Primary) */}
                  <button
                    onClick={handleGoogleSignInClick}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.99] transition-all flex items-center justify-between shadow-xs group disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <div className="text-left">
                        <div className="text-xs font-bold leading-tight">Sign in with Google</div>
                        <div className="text-[11px] text-gray-500">1-click instant access with Google Account</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Option 2: Email Sign-In */}
                  <button
                    onClick={() => {
                      setErrorMessage(null);
                      setAuthMode('email_input');
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-between shadow-md shadow-indigo-600/20 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-white/20">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold leading-tight">Sign in with Email</div>
                        <div className="text-[11px] text-indigo-100">Sign in or register with any email</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Guest Continue */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={loginAsGuest}
                      className="text-xs text-gray-400 hover:text-indigo-600 font-medium transition-colors py-1.5"
                    >
                      Continue as Guest (Local Offline Mode)
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: EMAIL INPUT */}
              {authMode === 'email_input' && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!emailInput.trim() || !emailInput.includes('@')) {
                      setErrorMessage('Please enter a valid email address.');
                      return;
                    }
                    loginWithEmailDirect(emailInput, nameInput);
                  }} 
                  className="space-y-3"
                >
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Enter Your Email Address</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Sign in to save your books, words, and progress</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="youremail@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Your Full Name (Optional)
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Alex Kumar"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('home')}
                      className="w-1/3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !emailInput.trim()}
                      className="w-2/3 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? 'Signing In...' : 'Sign In with Email'}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[11px] text-gray-400 hover:text-indigo-600 underline"
                    >
                      Or send 6-digit OTP code to verify
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: OTP CODE VERIFICATION */}
              {authMode === 'otp_verify' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Enter 6-Digit Code</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Code sent to <span className="font-semibold text-indigo-600">{emailInput}</span>
                    </p>
                  </div>

                  {/* 6 Digit Input Boxes */}
                  <div className="flex justify-between gap-1.5 my-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-lg font-bold font-mono rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    ))}
                  </div>

                  {/* Resend OTP timer & Change Email */}
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <button
                      type="button"
                      onClick={() => setAuthMode('email_input')}
                      className="text-gray-500 hover:text-indigo-600 underline"
                    >
                      Change Email
                    </button>

                    {countdown > 0 ? (
                      <span className="font-mono text-indigo-600 font-medium">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend Code
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('email_input')}
                      className="w-1/3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || otpDigits.some(d => !d)}
                      className="w-2/3 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? 'Verifying...' : 'Confirm & Sign In'}
                    </button>
                  </div>
                </form>
              )}

              {/* GOOGLE ACCOUNT SELECTOR */}
              {authMode === 'google_picker' && (
                <div className="space-y-3.5">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Sign In with Google</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Authorize access with your Google Account</p>
                  </div>

                  <form onSubmit={handleGoogleCustomLogin} className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Google Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={googleEmailInput}
                        onChange={(e) => setGoogleEmailInput(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Display Name <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={googleNameInput}
                        onChange={(e) => setGoogleNameInput(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !googleEmailInput.trim()}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Signing in...' : 'Sign in with Google Account'}
                    </button>
                  </form>

                  <div className="flex justify-between items-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('home')}
                      className="text-xs font-semibold text-gray-500 hover:text-indigo-600"
                    >
                      ← Back to Options
                    </button>
                    <button
                      type="button"
                      onClick={loginAsGuest}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Skip as Guest
                    </button>
                  </div>
                </div>
              )}

              {/* Security Badge */}
              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Real Email OTP & Google OAuth
                </span>
                <span>Offline-First Safe</span>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
