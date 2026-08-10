import React, { useState } from 'react';
import { ShieldCheck, User, KeyRound, ArrowRight, ShieldAlert } from 'lucide-react';

export default function AuthModal({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    const userData = {
      id: `user_${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: isRegister ? (fullName.trim() || username) : username.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      username: username.startsWith('@') ? username : `@${username.toLowerCase()}`,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      bio: '🔒 Protected by SecureChat Guard | Online',
      phone: '+1 (555) 019-8822',
      status: 'online'
    };

    localStorage.setItem('securechat_user', JSON.stringify(userData));
    onLogin(userData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md glass-modal rounded-3xl p-8 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        
        {/* Glow backdrop behind logo */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8 relative">
          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-10 h-10 pulse-shield" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">SecureChat Login</h2>
            <p className="text-xs text-gray-400 mt-1">End-to-End Encrypted & Anti-Phishing Messaging</p>
          </div>
        </div>

        {/* Tabs: Sign In / Register */}
        <div className="flex bg-gray-900/80 p-1 rounded-xl mb-6 border border-gray-800">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isRegister ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isRegister ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top.1/2 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-900/90 text-white placeholder:text-gray-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-300">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="e.g. alex_rivera"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-900/90 text-white placeholder:text-gray-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-300">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900/90 text-white placeholder:text-gray-500 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group mt-2"
          >
            <span>{isRegister ? 'Create Secure Account' : 'Sign In to SecureChat'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </form>

      </div>
    </div>
  );
}
