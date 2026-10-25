import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  User,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Copy,
  KeyRound,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowLeft,
  Sun,
  Moon,
  Crown,
  AlertCircle,
  Sparkles,
  Check,
  Clipboard
} from 'lucide-react';
import { registerUser, loginUser, sendPasswordResetOtp, verifyOtpAndResetPassword, resetPassword, checkEmailExists, checkDisplayNameExists } from '../utils/api';
import { recordAction } from '../utils/testRecorder';

function validateEmailFormat(val) {
  if (!val) return { valid: false, message: '' };
  const trimmed = val.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
  if (!trimmed.includes('@')) {
    return { valid: false, message: "Email must include '@' symbol" };
  }
  const parts = trimmed.split('@');
  if (parts.length > 2) {
    return { valid: false, message: "Email cannot have multiple '@' symbols" };
  }
  const [localPart, domainPart] = parts;
  if (!localPart) {
    return { valid: false, message: "Please enter username before '@'" };
  }
  if (!domainPart) {
    return { valid: false, message: "Please enter domain after '@' (e.g. gmail.com)" };
  }
  if (!domainPart.includes('.')) {
    return { valid: false, message: "Domain must include a '.' (e.g. .com)" };
  }
  const tld = domainPart.split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, message: "Domain ending (.com, .org, etc.) is too short" };
  }

  const commonTypos = {
    'gmai.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com'
  };

  if (commonTypos[domainPart]) {
    return {
      valid: false,
      hasTypo: true,
      suggestion: commonTypos[domainPart],
      message: `Did you mean @${commonTypos[domainPart]}?`
    };
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Invalid characters in email address' };
  }

  return { valid: true, message: 'Verified valid email format' };
}

// ── Dedicated Real-time Gmail Account Validation ──
function validateGmailAccount(val) {
  if (!val) return { valid: false, message: 'Please enter your registered Gmail address.' };
  const trimmed = val.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();

  if (!trimmed.includes('@')) {
    return { valid: false, message: "Gmail address must include '@gmail.com'" };
  }

  const parts = trimmed.split('@');
  if (parts.length > 2) {
    return { valid: false, message: "Email cannot have multiple '@' symbols" };
  }

  const [username, domain] = parts;
  if (!username) {
    return { valid: false, message: "Please enter your Gmail username before '@'" };
  }

  // Common Gmail typos detection
  const gmailTypos = {
    'gmai.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail.con': 'gmail.com',
    'gmailcom': 'gmail.com',
    'gmaik.com': 'gmail.com',
    'gml.com': 'gmail.com',
    'gmail.c': 'gmail.com'
  };

  if (gmailTypos[domain]) {
    return {
      valid: false,
      hasTypo: true,
      suggestion: gmailTypos[domain],
      message: `Did you mean @${gmailTypos[domain]}?`
    };
  }

  if (domain !== 'gmail.com') {
    if (domain.includes('gmail') || !domain.includes('.')) {
      return {
        valid: false,
        hasTypo: true,
        suggestion: 'gmail.com',
        message: 'Must end with @gmail.com'
      };
    }
    return {
      valid: false,
      message: 'Please enter a valid Gmail address ending with @gmail.com.'
    };
  }

  // Username syntax verification: only letters, numbers, and periods (no consecutive periods)
  if (/\.\./.test(username)) {
    return { valid: false, message: 'Gmail username cannot contain consecutive periods (..).' };
  }
  if (!/^[a-zA-Z0-9.]+$/.test(username)) {
    return { valid: false, message: 'Gmail username can only contain letters (a-z), numbers (0-9), and periods (.).' };
  }
  if (username.startsWith('.') || username.endsWith('.')) {
    return { valid: false, message: 'Gmail username cannot start or end with a period.' };
  }
  if (username.length < 4 || username.length > 30) {
    return { valid: false, message: 'Gmail username must be between 4 and 30 characters.' };
  }

  return { valid: true, message: 'Valid Gmail address format' };
}

export default function AuthModal({ onLogin, theme = 'light', onToggleTheme, skipSplash = false }) {
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  // Opening splash sequence with SecureChat logo and branding animation
  const [showSplash, setShowSplash] = useState(skipSplash ? false : !isTest);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
    }, 1800);
    const endTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, []);

  const handleDismissSplash = () => {
    setSplashFading(true);
    setTimeout(() => setShowSplash(false), 200);
  };

  // Tab: 'login' | 'register' | 'forgot'
  const [activeTab, setActiveTab] = useState('login');

  // Shared state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration & Password Reset success state — shows the generated password
  const [passwordGeneratedState, setPasswordGeneratedState] = useState(false);
  const [passwordTitle, setPasswordTitle] = useState('Account Created!');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [copied, setCopied] = useState(false);

  // ── Forgot Password (OTP via Gmail) State ──
  const [forgotStep, setForgotStep] = useState('enter_email'); // 'enter_email' | 'verify_otp'
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSentNotice, setOtpSentNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successNotice, setSuccessNotice] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState(false);

  // Live real-time Gmail account verification state
  const [emailCheckStatus, setEmailCheckStatus] = useState({
    checking: false,
    verified: false,
    exists: null,
    name: ''
  });

  // Live real-time display name duplicate check state
  const [nameCheckStatus, setNameCheckStatus] = useState({
    checking: false,
    exists: false
  });

  // Live email format check
  const emailValidation = validateEmailFormat(email);
  const gmailValidation = validateGmailAccount(email);

  // Live debounce effect to verify if entered Gmail account exists in SecureChat database
  useEffect(() => {
    if (activeTab !== 'forgot' || forgotStep !== 'enter_email') {
      return;
    }

    const cleanEmail = email.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
    const gCheck = validateGmailAccount(cleanEmail);

    if (!cleanEmail || !gCheck.valid) {
      setEmailCheckStatus({ checking: false, verified: false, exists: null, name: '' });
      return;
    }

    setEmailCheckStatus(prev => ({ ...prev, checking: true, exists: null }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkEmailExists(cleanEmail);
        if (res && res.exists) {
          setEmailCheckStatus({
            checking: false,
            verified: true,
            exists: true,
            name: res.name || 'Registered User'
          });
        } else {
          setEmailCheckStatus({
            checking: false,
            verified: false,
            exists: false,
            name: ''
          });
        }
      } catch {
        setEmailCheckStatus({ checking: false, verified: false, exists: null, name: '' });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [email, activeTab, forgotStep]);

  // Live debounce effect to check if entered display name already exists
  useEffect(() => {
    if (activeTab !== 'register') {
      setNameCheckStatus({ checking: false, exists: false });
      return;
    }

    const clean = fullName.trim();
    if (!clean || clean.length < 2) {
      setNameCheckStatus({ checking: false, exists: false });
      return;
    }

    setNameCheckStatus(prev => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await checkDisplayNameExists(clean);
        setNameCheckStatus({ checking: false, exists: Boolean(res?.exists) });
      } catch {
        setNameCheckStatus({ checking: false, exists: false });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [fullName, activeTab]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccessNotice('');
    setForgotStep('enter_email');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setEmailCheckStatus({ checking: false, verified: false, exists: null, name: '' });
    // If switching to login and a password was generated, auto-fill it
    if (tab === 'login' && generatedPassword) {
      setPassword(generatedPassword);
    }
    setPasswordGeneratedState(false);
  };

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanEmail = email.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    const check = validateEmailFormat(cleanEmail);
    if (!check.valid) {
      setError(check.message || 'Please enter a valid, complete email address.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (nameCheckStatus.exists) {
      setError('Name already exists. Please choose a different display name.');
      return;
    }

    // Direct check to ensure no race condition on submit
    const nameCheck = await checkDisplayNameExists(fullName.trim());
    if (nameCheck && nameCheck.exists) {
      setNameCheckStatus({ checking: false, exists: true });
      setError('Name already exists. Please choose a different display name.');
      return;
    }

    setLoading(true);
    const regStart = performance.now();

    try {
      const result = await registerUser(cleanEmail, fullName);
      const timeTaken = Math.max(0.04, parseFloat(((performance.now() - regStart) / 1000).toFixed(2)));
      setGeneratedPassword(result.password);
      setRegisteredUser(result.user);
      setPasswordTitle('Account Created!');
      setPasswordGeneratedState(true);
      recordAction('Registration', 'Registration successful', { duration: timeTaken, status: 'PASSED', source: 'SecureChat' });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Login ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanEmail = email.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const loginStart = performance.now();

    try {
      const result = await loginUser(cleanEmail, password);
      const timeTaken = Math.max(0.04, parseFloat(((performance.now() - loginStart) / 1000).toFixed(2)));
      const userData = result.user;
      localStorage.setItem('securechat_user', JSON.stringify(userData));
      recordAction('Authentication', 'Login successful', { duration: timeTaken, status: 'PASSED', source: 'SecureChat' });
      onLogin(userData);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Send OTP to Gmail ──
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanEmail = email.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered Gmail address.');
      return;
    }

    const check = validateGmailAccount(cleanEmail);
    if (!check.valid) {
      setError(check.message || 'Please enter a valid Gmail address (@gmail.com).');
      return;
    }

    if (emailCheckStatus.exists === false) {
      setError('No SecureChat account found with this Gmail. Please check spelling or register first.');
      return;
    }

    setLoading(true);

    try {
      const result = await sendPasswordResetOtp(cleanEmail);
      setOtpSentNotice(result.message || `A 6-digit verification code has been sent directly to your Gmail inbox (${cleanEmail}).`);
      setForgotStep('verify_otp');
      setResendCooldown(45);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      recordAction('Authentication', 'User requests OTP sent to Gmail for password reset');
    } catch (err) {
      setError(err.message || 'Failed to send OTP to Gmail. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP and Reset Password ──
  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanEmail = email.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the 6-digit OTP code sent to your Gmail.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyOtpAndResetPassword(cleanEmail, cleanOtp, newPassword);
      setSuccessNotice(result.message || 'Password successfully reset! Please sign in with your new password.');
      setPassword(newPassword);
      setActiveTab('login');
      setForgotStep('enter_email');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      recordAction('Authentication', 'User verifies OTP and resets password successfully');
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Extract and set 6-digit OTP from copied text ──
  const extractAndSetOtp = (rawText) => {
    if (!rawText) return;
    const cleanStr = String(rawText).trim();
    // Match exactly 6 consecutive digits or strip non-numeric
    const sixDigitMatch = cleanStr.match(/\b\d{6}\b/);
    let code = '';
    if (sixDigitMatch) {
      code = sixDigitMatch[0];
    } else {
      const digitsOnly = cleanStr.replace(/\D/g, '');
      code = digitsOnly.slice(0, 6);
    }

    if (code) {
      setOtpCode(code);
      setPasteFeedback(true);
      setTimeout(() => setPasteFeedback(false), 2500);
      setError('');
    } else {
      setError('No 6-digit code found in clipboard. Please copy the OTP from your Gmail.');
    }
  };

  const handlePasteOtp = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          extractAndSetOtp(text);
          return;
        }
      }
      const text = window.prompt('Paste the 6-digit OTP code copied from your Gmail:');
      if (text) extractAndSetOtp(text);
    } catch {
      const text = window.prompt('Paste the 6-digit OTP code copied from your Gmail:');
      if (text) extractAndSetOtp(text);
    }
  };

  // ── Continue after registration / reset ──
  const handleContinueAfterPassword = () => {
    if (registeredUser) {
      recordAction('Authentication', 'Login successful', { duration: 0.04, status: 'PASSED', source: 'SecureChat' });
      localStorage.setItem('securechat_user', JSON.stringify(registeredUser));
      onLogin(registeredUser);
    } else {
      setPassword(generatedPassword);
      setPasswordGeneratedState(false);
      setActiveTab('login');
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedPassword;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isLight = theme === 'light';

  if (showSplash) {
    return (
      <div
        id="securechat-opening-splash"
        onClick={handleDismissSplash}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#090d12] via-[#0d161d] to-[#04070a] select-none cursor-pointer transition-all duration-300 ${
          splashFading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        {/* Ambient Glow Aura */}
        <div className="absolute w-96 h-96 rounded-full bg-[#f97316]/20 blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute w-64 h-64 rounded-full bg-amber-500/15 blur-[80px] pointer-events-none" />

        {/* Center Animated Logo & Emblem */}
        <div className="relative flex flex-col items-center justify-center z-10 space-y-6">
          <div className="relative">
            {/* Pulsing Concentric Ripple Rings */}
            <div className="absolute -inset-4 rounded-3xl border border-[#f97316]/40 animate-ping opacity-50" />
            <div className="absolute -inset-8 rounded-full border border-amber-500/20 animate-pulse opacity-40" />

            {/* Shield Emblem Container */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#9a3412] p-1 shadow-[0_0_50px_rgba(249,115,22,0.5)] flex items-center justify-center transform transition-transform hover:scale-105">
              <div className="w-full h-full rounded-[22px] bg-[#0d161d]/90 flex items-center justify-center backdrop-blur-sm border border-[#f97316]/30">
                <ShieldCheck className="w-12 h-12 sm:w-14 sm:h-14 text-[#f97316] drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-bounce" />
              </div>
            </div>
          </div>

          {/* SecureChat Typography & Branding */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-amber-200 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
              SecureChat
            </h1>
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-400/90 uppercase">
                End-To-End Encrypted
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Private, zero-knowledge peer-to-peer messaging & calls
            </p>
          </div>

          {/* Loading Animation Indicator */}
          <div className="flex items-center gap-2 pt-4">
            <div className="w-2 h-2 rounded-full bg-[#f97316] animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 rounded-full bg-[#f97316] animate-bounce" />
          </div>

          <span className="text-[11px] text-slate-500 hover:text-slate-400 pt-2 transition">
            Tap anywhere to enter
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in select-none ${
      isLight ? 'bg-black/40 text-slate-900' : 'bg-black/70 text-[#e9edef]'
    }`}>
      <div className={`w-full max-w-md rounded-2xl p-6 md:p-7 border shadow-xl relative transition-all duration-200 ${
        isLight
          ? 'bg-white border-[#e9edef]'
          : 'bg-[#202c33] border-[#2a3942]'
      }`}>

        {/* Top Controls: Theme Switcher */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isLight
                ? 'bg-[#f0f2f5] border-[#e9edef] text-slate-700 hover:bg-[#e9edef]'
                : 'bg-[#111b21] border-[#2a3942] text-[#8696a0] hover:text-[#e9edef]'
            }`}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[#f97316]" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#f97316]" />
                <span>Light</span>
              </>
            )}
          </button>
        )}

        {/* Brand Header — Simple WhatsApp Clean Aesthetic */}
        <div className="flex flex-col items-center text-center space-y-2 mb-5 relative">
          <div className={`p-3 rounded-2xl transition-all ${
            isLight
              ? 'bg-[#f97316]/10 text-[#f97316]'
              : 'bg-[#f97316]/20 text-[#f97316]'
          }`}>
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${
              isLight ? 'text-[#111b21]' : 'text-[#e9edef]'
            }`}>
              SecureChat
            </h2>
            <p className={`text-xs mt-0.5 ${
              isLight ? 'text-[#667781]' : 'text-[#8696a0]'
            }`}>
              Simple, secure, and end-to-end encrypted messaging
            </p>
          </div>
        </div>

        {/* Tab Switcher — only show when NOT in password-generated state */}
        {!passwordGeneratedState && activeTab !== 'forgot' && (
          <div className={`flex rounded-xl p-1 mb-5 border relative ${
            isLight ? 'bg-[#f0f2f5] border-[#e9edef]' : 'bg-[#111b21] border-[#2a3942]'
          }`}>
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-[#f97316] text-white shadow-sm'
                  : isLight ? 'text-[#667781] hover:text-[#111b21]' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-[#f97316] text-white shadow-sm'
                  : isLight ? 'text-[#667781] hover:text-[#111b21]' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3 mb-4 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium border bg-orange-500/15 border-orange-500/30 text-orange-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-orange-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`p-3 mb-4 rounded-xl text-xs flex flex-col gap-2 animate-fade-in font-medium border ${
            isLight
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-red-950/40 border-red-800/60 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes('already registered') && (
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="self-start mt-1 px-3 py-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In to Existing Account
              </button>
            )}
            {error.toLowerCase().includes('no account found') && (
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="self-start mt-1 px-3 py-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register New Account
              </button>
            )}
          </div>
        )}

        {/* ── PASSWORD DISPLAY BOX — Show Generated or Reset Password ── */}
        {passwordGeneratedState && (
          <div className="space-y-4 relative animate-fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-orange-500/15 mb-2">
                <CheckCircle2 className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{passwordTitle}</h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Your permanent password code is shown below. <strong className="text-amber-600 dark:text-amber-400">Save it now — it won't be shown again!</strong>
              </p>
            </div>

            {/* Password Display Box */}
            <div className={`border rounded-2xl p-4 space-y-3 ${
              isLight ? 'bg-slate-50 border-amber-500/40' : 'bg-gray-900/90 border-amber-500/40'
            }`}>
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-bold">
                <KeyRound className="w-4 h-4" />
                <span>Your Permanent Password</span>
              </div>
              <div className={`flex items-center justify-between rounded-xl p-3 border ${
                isLight ? 'bg-white border-slate-300' : 'bg-slate-950 border-gray-800'
              }`}>
                <span className="font-mono text-xl font-bold tracking-[0.3em] text-orange-600 dark:text-orange-400 select-all">
                  {generatedPassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    copied
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                      : isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                  title="Copy password"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-orange-600 dark:text-orange-400 font-bold text-center animate-fade-in">✓ Copied to clipboard!</p>
              )}
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-bold">⚠️ Important:</p>
              <ul className="list-disc list-inside space-y-0.5 font-medium">
                <li>This password is shown <strong>only once</strong></li>
                <li>Copy and save it somewhere safe</li>
                <li>Use it with your email address to sign in across Web and Mobile</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleContinueAfterPassword}
              className="w-full py-2.5 bg-[#f97316] hover:bg-[#ea580c] active:bg-[#c2410c] text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group mt-2 cursor-pointer"
            >
              <span>{registeredUser ? "I've Saved My Password — Enter Chat" : "I've Saved My Password — Sign In"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {activeTab === 'login' && !passwordGeneratedState && (
          <form onSubmit={handleLogin} className="space-y-4 relative">
            <div className="space-y-1">
              <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#8696a0]'}`}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#f97316]" />
                <input
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    isLight
                      ? 'bg-[#f0f2f5] text-[#111b21] placeholder:text-slate-400 border-[#e9edef] focus:border-[#f97316] focus:bg-white'
                      : 'bg-[#111b21] text-[#e9edef] placeholder:text-gray-500 border-[#2a3942] focus:border-[#f97316]'
                  }`}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#8696a0]'}`}>Password</label>
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-xs font-semibold text-[#f97316] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-[#f97316]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none transition-all font-mono ${
                    isLight
                      ? 'bg-[#f0f2f5] text-[#111b21] placeholder:text-slate-400 border-[#e9edef] focus:border-[#f97316] focus:bg-white'
                      : 'bg-[#111b21] text-[#e9edef] placeholder:text-gray-500 border-[#2a3942] focus:border-[#f97316]'
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#f97316] hover:bg-[#ea580c] active:bg-[#c2410c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <p className={`text-center text-xs pt-1 ${isLight ? 'text-[#667781]' : 'text-[#8696a0]'}`}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="text-[#f97316] hover:underline font-semibold cursor-pointer"
              >
                Register here
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {activeTab === 'register' && !passwordGeneratedState && (
          <form onSubmit={handleRegister} className="space-y-4 relative">
            <div className="space-y-1">
              <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#8696a0]'}`}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#f97316]" />
                <input
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    isLight
                      ? 'bg-[#f0f2f5] text-[#111b21] placeholder:text-slate-400 border-[#e9edef] focus:border-[#f97316] focus:bg-white'
                      : 'bg-[#111b21] text-[#e9edef] placeholder:text-gray-500 border-[#2a3942] focus:border-[#f97316]'
                  }`}
                  autoComplete="email"
                />
              </div>

              {/* Real-time Email Verification & Typo Detection Helper */}
              {email.trim().length > 2 && (
                <div className="pt-1">
                  {emailValidation.valid ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#f97316] font-medium animate-fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#f97316] shrink-0" />
                      <span>{emailValidation.message}</span>
                    </div>
                  ) : emailValidation.hasTypo ? (
                    <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl animate-fade-in font-medium">
                      <span>💡 {emailValidation.message}</span>
                      <button
                        type="button"
                        onClick={() => setEmail(email.replace(/@.*$/, '@' + emailValidation.suggestion))}
                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        Fix to @{emailValidation.suggestion}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{emailValidation.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#8696a0]'}`}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-[#f97316]" />
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    isLight
                      ? 'bg-[#f0f2f5] text-[#111b21] placeholder:text-slate-400 border-[#e9edef] focus:border-[#f97316] focus:bg-white'
                      : 'bg-[#111b21] text-[#e9edef] placeholder:text-gray-500 border-[#2a3942] focus:border-[#f97316]'
                  }`}
                  autoComplete="name"
                />
              </div>
              {nameCheckStatus.exists && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-fade-in mt-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Name already exists. Please choose a different display name.</span>
                </div>
              )}
              <p className={`text-[11px] mt-1 ${isLight ? 'text-[#667781]' : 'text-[#8696a0]'}`}>
                A permanent password will be generated for you after registration.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || nameCheckStatus.exists}
              className="w-full py-2.5 bg-[#f97316] hover:bg-[#ea580c] active:bg-[#c2410c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <p className={`text-center text-xs pt-1 ${isLight ? 'text-[#667781]' : 'text-[#8696a0]'}`}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="text-[#f97316] hover:underline font-semibold cursor-pointer"
              >
                Sign in here
              </button>
            </p>
          </form>
        )}

        {/* ── FORGOT PASSWORD (OTP VIA GMAIL) FLOW ── */}
        {activeTab === 'forgot' && !passwordGeneratedState && (
          <div className="space-y-4 relative animate-fade-in">
            {forgotStep === 'enter_email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className={`flex items-center gap-2 font-bold text-base mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <RotateCcw className="w-4 h-4 text-[#f97316]" />
                  <span>Send OTP to Gmail</span>
                </div>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-[#8696a0]'}`}>
                  Enter your registered Gmail / email address. We will send a 6-digit verification OTP to reset your password.
                </p>

                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#8696a0]'}`}>Registered Gmail Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#f97316]" />
                    <input
                      type="email"
                      placeholder="e.g. yourname@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                        isLight
                          ? 'bg-[#f0f2f5] text-[#111b21] placeholder:text-slate-400 border-[#e9edef] focus:border-[#f97316] focus:bg-white'
                          : 'bg-[#111b21] text-[#e9edef] placeholder:text-gray-500 border-[#2a3942] focus:border-[#f97316]'
                      }`}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  {/* Real-time Gmail Account Verification & Typo Detection Helper */}
                  {email.trim().length > 1 && (
                    <div className="pt-1.5 space-y-1">
                      {gmailValidation.hasTypo ? (
                        <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl animate-fade-in font-medium">
                          <span>💡 {gmailValidation.message}</span>
                          <button
                            type="button"
                            onClick={() => setEmail(email.replace(/@.*$/, '@' + gmailValidation.suggestion))}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Fix to @{gmailValidation.suggestion}
                          </button>
                        </div>
                      ) : !gmailValidation.valid ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium animate-fade-in">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{gmailValidation.message}</span>
                        </div>
                      ) : emailCheckStatus.checking ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#f97316] font-medium animate-fade-in bg-[#f97316]/10 p-2 rounded-xl border border-[#f97316]/20">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#f97316] shrink-0" />
                          <span>Verifying Gmail account in database...</span>
                        </div>
                      ) : emailCheckStatus.exists === true ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 p-2 rounded-xl animate-fade-in font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Correct registered Gmail: {emailCheckStatus.name}</span>
                        </div>
                      ) : emailCheckStatus.exists === false ? (
                        <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/25 p-2 rounded-xl animate-fade-in font-medium">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span>No account found with this Gmail.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => switchTab('register')}
                            className="px-2 py-0.5 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Register
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !gmailValidation.valid || emailCheckStatus.exists !== true}
                  className="w-full py-2.5 bg-[#f97316] hover:bg-[#ea580c] active:bg-[#c2410c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group mt-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP to Gmail...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP to Gmail</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className={`text-xs flex items-center justify-center gap-1 mx-auto transition-colors font-semibold cursor-pointer ${
                      isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#8696a0] hover:text-[#e9edef]'
                    }`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
                <div className={`flex items-center gap-2 font-bold text-base mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <KeyRound className="w-4 h-4 text-[#f97316]" />
                  <span>Enter OTP & Set New Password</span>
                </div>

                {otpSentNotice && (
                  <div className="p-3 rounded-xl text-xs bg-orange-500/10 border border-orange-500/30 text-orange-400 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>OTP Sent to {email}</span>
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Check your Gmail inbox and spam/junk folder. The code expires in 10 minutes.
                    </p>
                  </div>
                )}

                {/* OTP Code Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#8696a0]'}`}>
                      6-Digit Gmail OTP Code
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePasteOtp}
                        className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          pasteFeedback
                            ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/40'
                            : 'bg-orange-500/10 hover:bg-orange-500/20 text-[#f97316] border-orange-500/30'
                        }`}
                        title="Paste 6-digit OTP code copied from Gmail"
                      >
                        {pasteFeedback ? <Check className="w-3 h-3 text-emerald-500" /> : <Clipboard className="w-3 h-3 text-[#f97316]" />}
                        <span>{pasteFeedback ? 'Pasted!' : 'Paste Code'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || loading}
                        onClick={() => handleSendOtp()}
                        className="text-xs text-[#f97316] hover:underline disabled:opacity-50 disabled:no-underline font-semibold cursor-pointer"
                      >
                        {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP (or tap Paste)"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        extractAndSetOtp(pasted);
                      }}
                      className={`w-full text-center tracking-[0.35em] font-mono text-xl font-bold py-2.5 rounded-xl border focus:outline-none transition-all ${
                        isLight
                          ? 'bg-[#f0f2f5] text-[#111b21] placeholder:text-slate-400 border-[#e9edef] focus:border-[#f97316] focus:bg-white'
                          : 'bg-[#111b21] text-[#e9edef] placeholder:text-gray-500 border-[#2a3942] focus:border-[#f97316]'
                      }`}
                      autoFocus
                    />
                  </div>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    💡 Copy the 6-digit code from your Gmail email and tap <strong>"Paste Code"</strong> above.
                  </p>
                </div>

                {/* New Password Input */}
                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#8696a0]'}`}>New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-[#f97316]" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter new password (min. 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none transition-all ${
                        isLight
                          ? 'bg-[#f0f2f5] text-[#111b21] placeholder:text-slate-400 border-[#e9edef] focus:border-[#f97316] focus:bg-white'
                          : 'bg-[#111b21] text-[#e9edef] placeholder:text-gray-500 border-[#2a3942] focus:border-[#f97316]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-[#8696a0]'}`}>Confirm New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-[#f97316]" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none transition-all ${
                        isLight
                          ? 'bg-[#f0f2f5] text-[#111b21] placeholder:text-slate-400 border-[#e9edef] focus:border-[#f97316] focus:bg-white'
                          : 'bg-[#111b21] text-[#e9edef] placeholder:text-gray-500 border-[#2a3942] focus:border-[#f97316]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 4 || !newPassword}
                  className="w-full py-2.5 bg-[#f97316] hover:bg-[#ea580c] active:bg-[#c2410c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group mt-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying OTP & Resetting...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </>
                  )}
                </button>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setForgotStep('enter_email')}
                    className="text-[#8696a0] hover:text-[#e9edef] font-semibold cursor-pointer"
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className="text-[#f97316] hover:underline font-semibold cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
