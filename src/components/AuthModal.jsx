import React, { useState } from 'react';
import { ShieldCheck, Mail, User, ArrowRight, ShieldAlert, Loader2, CheckCircle2, Copy, KeyRound, LogIn, UserPlus, Eye, EyeOff, RotateCcw, ArrowLeft } from 'lucide-react';
import { registerUser, loginUser, resetPassword } from '../utils/api';

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
  };

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser(email, fullName);
      setGeneratedPassword(result.password);
      setRegisteredUser(result.user);
      setPasswordTitle('Account Created!');
      setPasswordGeneratedState(true);
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

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const result = await loginUser(email, password);
      const userData = result.user;
      localStorage.setItem('securechat_user', JSON.stringify(userData));
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

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(email);
      setGeneratedPassword(result.password);
      setRegisteredUser(null);
      setPasswordTitle('New Password Generated!');
      setPasswordGeneratedState(true);
    } catch (err) {
      setError(err.message || 'Password reset failed. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Continue after registration / reset ──
  const handleContinueAfterPassword = () => {
    if (registeredUser) {
      localStorage.setItem('securechat_user', JSON.stringify(registeredUser));
      onLogin(registeredUser);
    } else {
      // Switched from password reset -> pre-fill password into sign in form
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-md glass-modal rounded-3xl p-8 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6 relative">
          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-10 h-10 pulse-shield" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">SecureChat</h2>
            <p className="text-xs text-gray-400 mt-1">End-to-End Encrypted Messaging</p>
          </div>
        </div>

        {/* Tab Switcher — only show when NOT in password-generated state */}
        {!passwordGeneratedState && activeTab !== 'forgot' && (
          <div className="flex rounded-xl bg-gray-900/80 p-1 mb-5 border border-gray-800 relative">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setFullName(e.target.value)}
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
