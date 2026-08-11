import React, { useState } from 'react';
import { Shield, Settings, LogOut, ChevronDown, MessageSquare, Wifi, Download, X, Search, UserCheck, MessageCircle } from 'lucide-react';

export default function Sidebar({
  allUsers = [],
  onlineUsers = [],
  currentUser,
  activeChatTarget = 'global',
  onSelectChatTarget,
  unreadCounts = {},
  onOpenSettings,
  onLogout,
  onCloseMobile,
  canInstallApp,
  onInstallApp
}) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserModal, setSelectedUserModal] = useState(null);

  const query = searchQuery.toLowerCase().trim();

  // Combine user directory
  const usersList = allUsers.length > 0 ? allUsers : onlineUsers;

  // Filter users based on search query (name or username)
  const filteredUsers = usersList.filter(user => {
    if (!query) return true;
    const nameStr = (user.name || '').toLowerCase();
    const usernameStr = (user.username || '').toLowerCase();
    return nameStr.includes(query) || usernameStr.includes(query);
  });

  const isCurrentUserMatch = !query || 
    (currentUser?.name && currentUser.name.toLowerCase().includes(query)) ||
    (currentUser?.username && currentUser.username.toLowerCase().includes(query));

  const isGlobalActive = !activeChatTarget || activeChatTarget === 'global';

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

      {/* ── Global Chat Room Button ── */}
      <div 
        onClick={() => {
          if (onSelectChatTarget) onSelectChatTarget('global');
          if (onCloseMobile) onCloseMobile();
        }}
        className={`mx-3 mt-3 mb-2 px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition border ${
          isGlobalActive
            ? 'bg-[var(--bg-accent)]/15 border-[var(--bg-accent)]/40 shadow-sm'
            : 'bg-[var(--bg-tertiary)]/50 border-transparent hover:bg-[var(--bg-tertiary)]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare className={`w-4 h-4 ${isGlobalActive ? 'text-[var(--bg-accent)]' : 'text-[var(--text-secondary)]'}`} />
          <div>
            <p className={`text-xs font-bold ${isGlobalActive ? 'text-[var(--bg-accent)]' : 'text-[var(--text-primary)]'}`}>Global Chat Room</p>
            <p className="text-[10px] text-[var(--text-secondary)]">Public & encrypted</p>
          </div>
        </div>

        {isGlobalActive ? (
          <span className="px-2 py-0.5 text-[10px] bg-[var(--bg-accent)] text-white font-semibold rounded-full">Active</span>
        ) : (
          canInstallApp && (
            <button
              onClick={(e) => { e.stopPropagation(); onInstallApp(); }}
              className="px-2.5 py-1 text-[11px] bg-[var(--bg-accent)] text-white font-semibold rounded-lg hover:bg-[var(--bg-accent-hover)] transition flex items-center gap-1 shadow-sm"
              title="Install Mobile/Desktop App"
            >
              <Download className="w-3 h-3" />
              Install
            </button>
          )
        )}
      </div>

      {/* ── User Search Input ── */}
      <div className="px-3 mb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="user-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search user to chat..."
            className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-xs pl-9 pr-8 py-2 rounded-xl border border-[var(--border-color)] focus:border-[var(--bg-accent)]/50 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Online Users Section Header ── */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            {searchQuery ? 'Search Results' : 'Online Users'}
          </span>
        </div>
        <span className="text-[10px] font-bold text-[var(--bg-accent)] bg-[var(--bg-accent)]/10 px-2 py-0.5 rounded-full">
          {searchQuery ? filteredUsers.length + (isCurrentUserMatch ? 1 : 0) : onlineUsers.length + 1}
        </span>
      </div>

      {/* ── User List ── */}
      <div className="flex-1 overflow-y-auto px-2 pt-1">
        {/* Current user (you) */}
        {isCurrentUserMatch && (
          <div
            onClick={() => setSelectedUserModal({ ...currentUser, isMe: true })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-accent)]/5 border border-[var(--bg-accent)]/10 mb-1 cursor-pointer hover:bg-[var(--bg-accent)]/10 transition"
          >
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
              <p className="text-[11px] text-[var(--bg-accent)] font-medium">You ({currentUser.username || 'Online'})</p>
            </div>
          </div>
        )}

        {/* Other online users */}
        {filteredUsers.length === 0 && !isCurrentUserMatch ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Search className="w-10 h-10 text-[var(--text-secondary)] mb-3 opacity-30 animate-pulse" />
            <p className="text-xs text-[var(--text-secondary)] font-medium">No users found</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 opacity-60">Try searching another name or username</p>
          </div>
        ) : (
          filteredUsers.map(user => {
            const isUserActive = activeChatTarget && activeChatTarget.id === user.id;
            const unread = unreadCounts[user.id] || 0;

            return (
              <div
                key={user.id}
                onClick={() => {
                  if (onSelectChatTarget) onSelectChatTarget(user);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition mb-1 group border ${
                  isUserActive
                    ? 'bg-[var(--bg-accent)]/15 border-[var(--bg-accent)]/30'
                    : 'hover:bg-[var(--bg-tertiary)] border-transparent'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full status-online border-2 border-[var(--bg-secondary)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate transition-colors ${
                    isUserActive ? 'text-[var(--bg-accent)]' : 'text-[var(--text-primary)] group-hover:text-[var(--bg-accent)]'
                  }`}>
                    {user.name}
                  </p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span>Online</span>
                    {user.username && <span className="text-[var(--text-secondary)] font-normal">• @{user.username}</span>}
                  </p>
                </div>

                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                    {unread}
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUserModal(user);
                  }}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="View Profile"
                >
                  <UserCheck className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ── User Profile Popover/Modal on Selection ── */}
      {selectedUserModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedUserModal(null)}
        >
          <div
            className="w-80 glass-modal rounded-2xl p-5 border border-[var(--border-color)] shadow-2xl animate-scale-in text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedUserModal(null)}
              className="absolute top-3 right-3 p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>

            <img
              src={selectedUserModal.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
              alt={selectedUserModal.name}
              className="w-20 h-20 rounded-full object-cover mx-auto ring-4 ring-[var(--bg-accent)]/30 mb-3"
            />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedUserModal.name}</h3>
            <p className="text-xs text-[var(--bg-accent)] font-medium mb-2">
              {selectedUserModal.isMe ? 'You' : (selectedUserModal.username ? `@${selectedUserModal.username}` : 'Verified User')}
            </p>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online & Ready to Chat
            </div>

            {!selectedUserModal.isMe && (
              <button
                onClick={() => {
                  if (onSelectChatTarget) onSelectChatTarget(selectedUserModal);
                  setSelectedUserModal(null);
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full py-2.5 mb-2 bg-[var(--bg-accent)] hover:bg-[var(--bg-accent-hover)] text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Start Private Chat
              </button>
            )}

            <button
              onClick={() => setSelectedUserModal(null)}
              className="w-full py-2 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom Security Badge ── */}
      <div className="p-3 border-t border-[var(--border-color)]">
        <div className="dev-badge-glow rounded-xl px-4 py-3 flex items-center gap-3">
          <Shield className="w-5 h-5 text-[var(--bg-accent)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">SecureChat Guard™ App</p>
            <p className="text-[10px] text-[var(--text-secondary)]">1-on-1 private messaging enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
}

