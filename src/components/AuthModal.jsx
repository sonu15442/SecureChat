import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { registerUser, loginUser, resetPassword } from '../utils/api';
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

export default function AuthModal({ onLogin, theme = 'light', onToggleTheme }) {
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

  // Live email format check
  const emailValidation = validateEmailFormat(email);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setEmail('');
    setFullName('');
    setPassword('');
    setPasswordGeneratedState(false);
    setGeneratedPassword('');
    setRegisteredUser(null);
    setCopied(false);

    if (tab === 'register') {
      recordAction('Registration', 'User clicks register tab to open registration form');
    } else if (tab === 'login') {
      recordAction('Authentication', 'User switches to login view');
    } else if (tab === 'forgot') {
      recordAction('Authentication', 'User opens password reset dialog');
    }
  };

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      recordAction('Input Validation', 'User cannot submit registration with an empty email');
      return;
    }

    const check = validateEmailFormat(cleanEmail);
    if (!check.valid) {
      setError(check.message || 'Please enter a valid, complete email address.');
      recordAction('Input Validation', 'User entered invalid email format in registration');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      recordAction('Input Validation', 'User cannot submit registration with an empty full name');
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser(cleanEmail, fullName);
      setGeneratedPassword(result.password);
      setRegisteredUser(result.user);
      setPasswordTitle('Account Created!');
      setPasswordGeneratedState(true);
      recordAction('Registration', 'Registration passed', { status: 'PASSED' });
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

    try {
      const result = await loginUser(cleanEmail, password);
      const userData = result.user;
      localStorage.setItem('securechat_user', JSON.stringify(userData));
      recordAction('Authentication', 'Login passed', { status: 'PASSED' });
      onLogin(userData);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ──
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      recordAction('Authentication', 'User cannot submit password reset with an empty email');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(cleanEmail);
      setGeneratedPassword(result.password);
      setRegisteredUser(null);
      setPasswordTitle('New Password Generated!');
      setPasswordGeneratedState(true);
      recordAction('Authentication', 'User resets password and receives new generated credentials');
    } catch (err) {
      setError(err.message || 'Password reset failed. Please check your email and try again.');
      recordAction('Authentication', 'User sees password reset error notice');
    } finally {
      setLoading(false);
    }
  };

  // ── Continue after registration / reset ──
  const handleContinueAfterPassword = () => {
    if (registeredUser) {
      recordAction('Authentication', 'User completes registration credential review and enters chat');
      localStorage.setItem('securechat_user', JSON.stringify(registeredUser));
      onLogin(registeredUser);
    } else {
      recordAction('Authentication', 'User pre-fills reset credentials and proceeds to sign in');
      setPassword(generatedPassword);
      setPasswordGeneratedState(false);
      setActiveTab('login');
    }
  };

  const handleCopyPassword = async () => {
    recordAction('Registration', 'User copies generated secure password to clipboard');
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

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-2xl animate-fade-in select-none ${
      isLight ? 'bg-slate-200/80 text-slate-900' : 'bg-[#05090d]/90 text-white'
    }`}>
      <div className={`w-full max-w-md rounded-3xl p-7 md:p-8 border shadow-2xl relative overflow-hidden transition-all duration-300 ${
        isLight
          ? 'bg-white/95 border-slate-300/80 shadow-slate-300/50'
          : 'glass-modal border-emerald-500/30'
      }`}>

        {/* Ambient Glows */}
        <div className={`absolute -top-24 -left-24 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-emerald-300/30' : 'bg-emerald-500/20'
        }`} />
        <div className={`absolute -bottom-24 -right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-sky-300/30' : 'bg-sky-500/20'
        }`} />

        {/* Top Floating Controls: Theme Switcher */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            )}
          </button>
        )}

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6 relative">
          <div className={`p-4 rounded-2xl shadow-xl transition-all ${
            isLight
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-emerald-500/10'
              : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/15'
          }`}>
            <ShieldCheck className="w-10 h-10 pulse-shield" />
          </div>
          <div>
            <h2 className={`text-2xl font-extrabold tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              SecureChat Guard
            </h2>
            <p className={`text-xs mt-1 font-semibold ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              Shared Web & Mobile Database • Fraud Shield Protection
            </p>
          </div>
        </div>

        {/* Tab Switcher — only show when NOT in password-generated state */}
        {!passwordGeneratedState && activeTab !== 'forgot' && (
          <div className={`flex rounded-2xl p-1.5 mb-6 border shadow-inner relative ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#091117] border-slate-800/80'
          }`}>
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-emerald-500 text-white shadow-md scale-[1.02]'
                  : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-emerald-500 text-white shadow-md scale-[1.02]'
                  : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3.5 mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-600 dark:text-red-400 flex flex-col gap-2 animate-fade-in font-medium">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes('already registered') && (
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="self-start mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In to Existing Account
              </button>
            )}
            {error.toLowerCase().includes('no account found') && (
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="self-start mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
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
              <div className="inline-flex p-3 rounded-full bg-emerald-500/15 mb-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
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
                <span className="font-mono text-xl font-bold tracking-[0.3em] text-emerald-600 dark:text-emerald-400 select-all">
                  {generatedPassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                  title="Copy password"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold text-center animate-fade-in">✓ Copied to clipboard!</p>
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2 cursor-pointer"
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
              <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-3 w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <input
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value.length > 2) {
                      recordAction('Authentication', 'User enters email in login field');
                    }
                  }}
                  className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    isLight
                      ? 'bg-slate-50 text-slate-900 placeholder:text-slate-400 border-slate-300 focus:border-emerald-600 focus:bg-white'
                      : 'bg-gray-900/90 text-white placeholder:text-gray-500 border-gray-800 focus:border-emerald-500'
                  }`}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Password</label>
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className={`text-xs font-bold hover:underline cursor-pointer ${
                    isLight ? 'text-emerald-600' : 'text-emerald-400'
                  }`}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className={`absolute left-3.5 top-3 w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (e.target.value.length > 2) {
                      recordAction('Authentication', 'User enters password in login field');
                    }
                  }}
                  className={`w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none transition-all font-mono ${
                    isLight
                      ? 'bg-slate-50 text-slate-900 placeholder:text-slate-400 border-slate-300 focus:border-emerald-600 focus:bg-white'
                      : 'bg-gray-900/90 text-white placeholder:text-gray-500 border-gray-800 focus:border-emerald-500'
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2 cursor-pointer"
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

            <p className={`text-center text-xs pt-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
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
              <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-3 w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <input
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value.length > 2) {
                      recordAction('Registration', 'User enters valid email address in registration form');
                    }
                  }}
                  className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    isLight
                      ? 'bg-slate-50 text-slate-900 placeholder:text-slate-400 border-slate-300 focus:border-emerald-600 focus:bg-white'
                      : 'bg-gray-900/90 text-white placeholder:text-gray-500 border-gray-800 focus:border-emerald-500'
                  }`}
                  autoComplete="email"
                />
              </div>

              {/* Real-time Email Verification & Typo Detection Helper */}
              {email.trim().length > 2 && (
                <div className="pt-1">
                  {emailValidation.valid ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{emailValidation.message}</span>
                    </div>
                  ) : emailValidation.hasTypo ? (
                    <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 p-2 rounded-xl animate-fade-in font-medium">
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
              <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Full Name</label>
              <div className="relative">
                <User className={`absolute left-3.5 top-3 w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (e.target.value.length > 2) {
                      recordAction('Registration', 'User enters full name in registration form');
                    }
                  }}
                  className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    isLight
                      ? 'bg-slate-50 text-slate-900 placeholder:text-slate-400 border-slate-300 focus:border-emerald-600 focus:bg-white'
                      : 'bg-gray-900/90 text-white placeholder:text-gray-500 border-gray-800 focus:border-emerald-500'
                  }`}
                  autoComplete="name"
                />
              </div>
              <p className={`text-[11px] font-medium mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                A permanent password will be generated for you after registration.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2 cursor-pointer"
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

            <p className={`text-center text-xs pt-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
              >
                Sign in here
              </button>
            </p>
          </form>
        )}

        {/* ── FORGOT PASSWORD FORM ── */}
        {activeTab === 'forgot' && !passwordGeneratedState && (
          <form onSubmit={handleResetPassword} className="space-y-4 relative animate-fade-in">
            <div className={`flex items-center gap-2 font-bold text-base mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <RotateCcw className="w-4 h-4 text-emerald-500" />
              <span>Reset Forgotten Password</span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              Enter your registered email address. We will generate a new permanent password for your account.
            </p>

            <div className="space-y-1">
              <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Registered Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-3 w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <input
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    isLight
                      ? 'bg-slate-50 text-slate-900 placeholder:text-slate-400 border-slate-300 focus:border-emerald-600 focus:bg-white'
                      : 'bg-gray-900/90 text-white placeholder:text-gray-500 border-gray-800 focus:border-emerald-500'
                  }`}
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating New Password...</span>
                </>
              ) : (
                <>
                  <span>Generate New Password</span>
                  <RotateCcw className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`text-xs flex items-center justify-center gap-1 mx-auto transition-colors font-bold cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
