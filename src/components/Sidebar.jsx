import React, { useState } from 'react';
import { Shield, Settings, LogOut, ChevronDown, Users, MessageSquare, Wifi, Download, X } from 'lucide-react';

export default function Sidebar({
  onlineUsers,
  currentUser,
  onOpenSettings,
  onLogout,
  onCloseMobile,
  canInstallApp,
  onInstallApp
}) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <div className="w-[320px] max-w-[85vw] h-full flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl md:shadow-none">

      {/* ── Top Bar ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)]">
        <div className="relative">
          <button
            id="profile-toggle"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2.5 hover:bg-[var(--bg-tertiary)] rounded-xl px-2 py-1.5 transition-colors"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--bg-accent)]/40"
            />
            <div className="text-left">
              <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{currentUser.name}</p>
              <p className="text-[11px] text-[var(--text-accent)] font-medium">{currentUser.username}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 glass-modal rounded-xl shadow-2xl z-50 animate-slide-up border border-[var(--border-color)]">
              <div className="p-3 border-b border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)]">Signed in as</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{currentUser.name}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => { onOpenSettings(); setShowProfileDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
                >
                  <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                  Settings
                </button>
                {canInstallApp && (
                  <button
                    onClick={() => { onInstallApp(); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--bg-accent)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Install App
                  </button>
                )}
                <button 
                  onClick={() => { if (onLogout) onLogout(); setShowProfileDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close mobile drawer button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Chat Room Label ── */}
      <div className="mx-3 mt-3 mb-2 px-3 py-2.5 bg-[var(--bg-accent)]/8 rounded-xl flex items-center justify-between border border-[var(--bg-accent)]/15">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-[var(--bg-accent)]" />
          <div>
            <p className="text-xs font-bold text-[var(--bg-accent)]">Global Chat Room</p>
            <p className="text-[10px] text-[var(--text-secondary)]">End-to-end encrypted</p>
          </div>
        </div>

        {canInstallApp && (
          <button
            onClick={onInstallApp}
            className="px-2.5 py-1 text-[11px] bg-[var(--bg-accent)] text-white font-semibold rounded-lg hover:bg-[var(--bg-accent-hover)] transition flex items-center gap-1 shadow-sm"
            title="Install Mobile/Desktop App"
          >
            <Download className="w-3 h-3" />
            Install
          </button>
        )}
      </div>

      {/* ── Online Users Section ── */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Online Users</span>
        </div>
        <span className="text-[10px] font-bold text-[var(--bg-accent)] bg-[var(--bg-accent)]/10 px-2 py-0.5 rounded-full">
          {onlineUsers.length + 1}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-1">
        {/* Current user (you) */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-accent)]/5 border border-[var(--bg-accent)]/10 mb-1">
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full status-online border-2 border-[var(--bg-secondary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{currentUser.name}</p>
            <p className="text-[11px] text-[var(--bg-accent)]">You</p>
          </div>
        </div>

        {/* Other online users */}
        {onlineUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Users className="w-10 h-10 text-[var(--text-secondary)] mb-3 opacity-30" />
            <p className="text-xs text-[var(--text-secondary)]">No other users online</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 opacity-60">Open another tab & sign in!</p>
          </div>
        ) : (
          onlineUsers.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition mb-0.5"
            >
              <div className="relative shrink-0">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full status-online border-2 border-[var(--bg-secondary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
                <p className="text-[11px] text-emerald-400">Online</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Bottom Security Badge ── */}
      <div className="p-3 border-t border-[var(--border-color)]">
        <div className="dev-badge-glow rounded-xl px-4 py-3 flex items-center gap-3">
          <Shield className="w-5 h-5 text-[var(--bg-accent)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">SecureChat Guard™ App</p>
            <p className="text-[10px] text-[var(--text-secondary)]">PWA ready • Fraud protection</p>
          </div>
        </div>
      </div>
    </div>
  );
}
