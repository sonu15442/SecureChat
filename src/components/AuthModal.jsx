import React, { useState } from 'react';
import { ShieldCheck, Mail, User, ArrowRight, ShieldAlert, Loader2, CheckCircle2, Copy, KeyRound, LogIn, UserPlus, Eye, EyeOff, RotateCcw, ArrowLeft } from 'lucide-react';
import { registerUser, loginUser, resetPassword } from '../utils/api';
import { recordAction } from '../utils/testRecorder';

export default function AuthModal({ onLogin }) {
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
  const [passwordGeneratedState, setPasswordGeneratedState] = useState(false); // true if showing generated password
  const [passwordTitle, setPasswordTitle] = useState('Account Created!');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [copied, setCopied] = useState(false);

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
      recordAction('Registration', 'User enters full name and email in registration form');
      recordAction('Registration', 'User submits registration and creates new account');
      recordAction('Registration', 'User verifies account credentials and generated secure password');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      recordAction('Registration', `User sees registration validation notice: ${err.message || 'Registration failed'}`);
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
      recordAction('Authentication', 'User cannot submit login with an empty email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      recordAction('Authentication', 'User cannot submit login with an empty password');
      return;
    }

    setLoading(true);

    try {
      const result = await loginUser(cleanEmail, password);
      const userData = result.user;
      localStorage.setItem('securechat_user', JSON.stringify(userData));
      recordAction('Authentication', 'User logs in with valid email and password');
      recordAction('Session Management', 'User session token established and profile loaded');
      onLogin(userData);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      recordAction('Authentication', 'User sees an error for invalid login credentials');
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
      // Switched from password reset -> pre-fill password into sign in form
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
      // Fallback for older browsers
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05090d]/90 backdrop-blur-2xl animate-fade-in select-none">
      <div className="w-full max-w-md glass-modal rounded-3xl p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        
        {/* Glow ambient backdrops */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-sky-500/20 rounded-full blur-3xl" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6 relative">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/40 shadow-xl shadow-emerald-500/15">
            <ShieldCheck className="w-10 h-10 pulse-shield" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
              SecureChat Guard
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">End-to-End Encrypted Messaging & Fraud Link Security</p>
          </div>
        </div>

        {/* Tab Switcher — only show when NOT in password-generated state */}
        {!passwordGeneratedState && activeTab !== 'forgot' && (
          <div className="flex rounded-2xl bg-[#091117] p-1.5 mb-6 border border-slate-800/80 shadow-inner relative">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes('no account found') && (
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="self-start mt-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg text-[11px] transition-all flex items-center gap-1 shadow-sm"
              >
                <UserPlus className="w-3 h-3" />
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
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">{passwordTitle}</h3>
              <p className="text-xs text-gray-400">
                Your permanent password code is shown below. <strong className="text-amber-400">Save it now — it won't be shown again!</strong>
              </p>
            </div>

            {/* Password Display Box */}
            <div className="bg-gray-900/90 border border-amber-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                <KeyRound className="w-4 h-4" />
                <span>Your Permanent Password</span>
              </div>
              <div className="flex items-center justify-between bg-slate-950 rounded-lg p-3 border border-gray-800">
                <span className="font-mono text-xl font-bold tracking-[0.3em] text-emerald-400 select-all">
                  {generatedPassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className={`p-2 rounded-lg transition-all ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                  title="Copy password"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-400 text-center animate-fade-in">✓ Copied to clipboard!</p>
              )}
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
              <p className="font-semibold">⚠️ Important:</p>
              <ul className="list-disc list-inside text-amber-400/80 space-y-0.5">
                <li>This password is shown <strong>only once</strong></li>
                <li>Copy and save it somewhere safe</li>
                <li>Use it with your email address to sign in</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleContinueAfterPassword}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2"
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
              <label className="text-xs font-medium text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-emerald-400" />
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
                  className="w-full bg-gray-900/90 text-white placeholder:text-gray-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-xs text-emerald-400 hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-emerald-400" />
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
                  className="w-full bg-gray-900/90 text-white placeholder:text-gray-500 text-sm pl-10 pr-10 py-2.5 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2"
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

            <p className="text-center text-xs text-gray-500 pt-1">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="text-emerald-400 hover:underline font-semibold"
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
              <label className="text-xs font-medium text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-emerald-400" />
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
                  className="w-full bg-gray-900/90 text-white placeholder:text-gray-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-emerald-400" />
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
                  className="w-full bg-gray-900/90 text-white placeholder:text-gray-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                  autoComplete="name"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                A permanent password will be generated for you after registration.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2"
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

            <p className="text-center text-xs text-gray-500 pt-1">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Sign in here
              </button>
            </p>
          </form>
        )}

        {/* ── FORGOT PASSWORD FORM ── */}
        {activeTab === 'forgot' && !passwordGeneratedState && (
          <form onSubmit={handleResetPassword} className="space-y-4 relative animate-fade-in">
            <div className="flex items-center gap-2 text-white font-semibold text-base mb-1">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Reset Forgotten Password</span>
            </div>
            <p className="text-xs text-gray-400">
              Enter your registered email address. We will generate a new permanent password for your account.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Registered Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-emerald-400" />
                <input
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900/90 text-white placeholder:text-gray-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2"
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
                className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 mx-auto transition-colors"
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
