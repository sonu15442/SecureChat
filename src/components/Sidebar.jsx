import React, { useState, useEffect } from 'react';
import { Shield, Settings, LogOut, ChevronDown, MessageSquare, Wifi, Download, X, Search, UserCheck, MessageCircle, Plus, Sparkles, Music } from 'lucide-react';
import { groupStatusesByUser } from '../utils/statusManager';
import { resumeAudioContext } from '../utils/statusAudioPlayer';
import { searchUsers } from '../utils/api';
import { recordAction } from '../utils/testRecorder';

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
  onInstallApp,
  statuses = [],
  onOpenStatusModal,
  onOpenStatusViewer
}) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [serverResults, setServerResults] = useState([]);

  const query = searchQuery.toLowerCase().trim();

  // Query backend database dynamically when searching
  useEffect(() => {
    if (!query) {
      setServerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(query);
        if (Array.isArray(results)) {
          setServerResults(results.filter(u => u && u.id !== currentUser?.id));
        }
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [query, currentUser?.id]);

  // Group active statuses by user
  const statusGroups = groupStatusesByUser(statuses);
  const myStatusGroup = statusGroups.find(g => g.userId === currentUser?.id);
  const otherStatusGroups = statusGroups.filter(g => g.userId !== currentUser?.id);

  // Combine user directory with dynamic search results
  const userMap = new Map();
  (allUsers.length > 0 ? allUsers : onlineUsers).forEach(u => {
    if (u && u.id && u.id !== currentUser?.id) userMap.set(u.id, u);
  });
  serverResults.forEach(u => {
    if (u && u.id && u.id !== currentUser?.id) {
      userMap.set(u.id, { ...userMap.get(u.id), ...u });
    }
  });
  const usersList = Array.from(userMap.values());

  // Filter users based on search query (name, username, email, phone)
  const filteredUsers = usersList.filter(user => {
    if (!query) return true;
    const nameStr = (user.name || '').toLowerCase();
    const usernameStr = (user.username || '').toLowerCase();
    const cleanUsername = usernameStr.startsWith('@') ? usernameStr.slice(1) : usernameStr;
    const emailStr = (user.email || '').toLowerCase();
    const phoneStr = (user.phone || '').toLowerCase();
    const cleanQuery = query.startsWith('@') ? query.slice(1) : query;
    return (
      nameStr.includes(query) ||
      usernameStr.includes(query) ||
      cleanUsername.includes(cleanQuery) ||
      emailStr.includes(query) ||
      phoneStr.includes(query)
    );
  });

  const isCurrentUserMatch = !query || 
    (currentUser?.name && currentUser.name.toLowerCase().includes(query)) ||
    (currentUser?.username && currentUser.username.toLowerCase().includes(query)) ||
    (currentUser?.email && currentUser.email.toLowerCase().includes(query));

  const isGlobalActive = !activeChatTarget || activeChatTarget === 'global';

  return (
    <div className="w-[320px] max-w-[85vw] h-full flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl md:shadow-none">

      {/* ── Top Bar ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)] bg-[#0a111a]/80 backdrop-blur-md">
        <div className="relative flex-1 flex items-center justify-between">
          <button
            id="profile-toggle"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 hover:bg-slate-800/50 rounded-2xl px-2 py-1.5 transition-all group max-w-[210px]"
          >
            <div className="relative p-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 shadow-md shrink-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt={currentUser?.name || 'User'}
                className="w-9 h-9 rounded-full object-cover border-2 border-[#0d1622] group-hover:scale-105 transition-transform"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full status-online" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-xs font-extrabold text-white leading-tight truncate">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 truncate">
                {currentUser?.username || '@user'}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>

          {/* Direct Visible Settings Icon Button */}
          <button
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              setShowProfileDropdown(false);
            }}
            className="p-2 text-cyan-400 hover:text-white bg-slate-900/90 hover:bg-cyan-500/20 border border-cyan-500/40 rounded-xl transition shadow-md flex items-center justify-center gap-1 shrink-0 ml-1 hover:scale-105 active:scale-95"
            title="Open Settings & Preferences"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute top-full left-0 mt-2 w-60 glass-modal rounded-2xl shadow-2xl z-50 animate-slide-up border border-cyan-500/20 overflow-hidden">
              <div className="p-3.5 border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10">
                <p className="text-[10px] uppercase tracking-wider font-bold text-cyan-400">Signed in as</p>
                <p className="text-sm font-extrabold text-white truncate">{currentUser?.name}</p>
                <p className="text-xs text-purple-300 truncate">{currentUser?.email || currentUser?.username}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { onOpenSettings(); setShowProfileDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-xl transition"
                >
                  <Settings className="w-4 h-4 text-cyan-400" />
                  Settings & Preferences
                </button>
                {canInstallApp && (
                  <button
                    onClick={() => { onInstallApp(); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition"
                  >
                    <Download className="w-4 h-4" />
                    Install App
                  </button>
                )}
                <button 
                  onClick={() => { if (onLogout) onLogout(); setShowProfileDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
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
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
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
        className={`mx-3 mt-3 mb-2 px-3.5 py-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 border ${
          isGlobalActive
            ? 'bg-gradient-to-r from-cyan-500/25 via-purple-500/20 to-pink-500/15 border-cyan-400/50 shadow-lg shadow-cyan-500/20 scale-[1.02]'
            : 'bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isGlobalActive ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-md' : 'bg-slate-800 text-slate-400'}`}>
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <p className={`text-xs font-extrabold ${isGlobalActive ? 'text-cyan-300' : 'text-white'}`}>Global Chat Room</p>
            <p className="text-[10px] text-slate-400 font-medium">Public & E2E Encrypted</p>
          </div>
        </div>

        {isGlobalActive ? (
          <span className="px-2.5 py-0.5 text-[10px] bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-extrabold rounded-full shadow-md shadow-cyan-500/30 animate-pulse">
            Active
          </span>
        ) : (
          canInstallApp && (
            <button
              onClick={(e) => { e.stopPropagation(); onInstallApp(); }}
              className="px-2.5 py-1 text-[11px] bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-bold rounded-lg hover:brightness-110 transition flex items-center gap-1 shadow-md"
              title="Install App"
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
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="user-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 1) {
                recordAction('Search', 'User searches contacts directory');
              }
            }}
            placeholder="Search user to chat..."
            className="w-full bg-slate-900/90 text-white placeholder:text-slate-500 text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── WhatsApp Status & Music Stories Section ── */}
      <div className="px-3 mb-3 pb-2 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 uppercase tracking-wider">
              Status Stories
            </span>
          </div>
          <button
            onClick={() => {
              recordAction('Status Management', 'User opens status composer dialog');
              onOpenStatusModal();
            }}
            className="text-[10px] font-extrabold text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 px-2 py-0.5 rounded-full transition flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Status</span>
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          {/* My Status */}
          <div className="flex flex-col items-center shrink-0">
            <button
              onClick={() => {
                resumeAudioContext();
                if (myStatusGroup) {
                  onOpenStatusViewer(myStatusGroup);
                } else if (onOpenStatusModal) {
                  onOpenStatusModal();
                }
              }}
              className="relative p-0.5 rounded-full transition-transform hover:scale-105"
            >
              <div className={`p-0.5 rounded-full ${myStatusGroup ? 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 shadow-md shadow-cyan-500/20' : 'border-2 border-dashed border-slate-700'}`}>
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                  alt="My Status"
                  className="w-11 h-11 rounded-full object-cover border-2 border-[#0d1622]"
                />
              </div>
              <div 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  resumeAudioContext(); 
                  if (onOpenStatusModal) onOpenStatusModal(); 
                }}
                className="absolute bottom-0 right-0 p-1 bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 rounded-full shadow-md hover:scale-110 transition cursor-pointer"
                title="Add New Status"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </div>
            </button>
            <span className="text-[10px] font-bold text-slate-300 mt-1 truncate max-w-[60px]">
              {myStatusGroup ? 'My Status' : 'Add Status'}
            </span>
          </div>

          {/* Contact Statuses */}
          {otherStatusGroups.map((group) => (
            <div key={group.userId} className="flex flex-col items-center shrink-0">
              <button
                onClick={() => {
                  resumeAudioContext();
                  onOpenStatusViewer(group);
                }}
                className="relative p-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400 shadow-md shadow-cyan-500/20 transition-transform hover:scale-105 animate-pulse-glow"
              >
                <img
                  src={group.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                  alt={group.userName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-[#0d1622]"
                />
                {group.statuses.some(s => s.songTitle) && (
                  <span className="absolute -top-1 -right-1 p-1 bg-purple-500 text-white rounded-full text-[9px] shadow-md animate-bounce">
                    <Music className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
              <span className="text-[10px] font-extrabold text-white mt-1 truncate max-w-[60px]">
                {group.userName?.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Directory Section Header ── */}
      <div className="px-3.5 pt-1 pb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[11px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-wider">
            {searchQuery ? 'Search Results' : 'Contacts & Users'}
          </span>
        </div>
        <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full shadow-xs">
          {searchQuery ? filteredUsers.length + (isCurrentUserMatch ? 1 : 0) : usersList.length + 1}
        </span>
      </div>

      {/* ── User List ── */}
      <div className="flex-1 overflow-y-auto px-2 pt-1 space-y-1">
        {/* Current user (you) */}
        {isCurrentUserMatch && (
          <div
            onClick={() => setSelectedUserModal({ ...currentUser, isMe: true, isOnline: true })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 mb-1 cursor-pointer hover:border-emerald-500/40 transition-all shadow-sm group"
          >
            <div className="relative shrink-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt={currentUser?.name || 'User'}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30 group-hover:scale-105 transition-transform"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full status-online border-2 border-[var(--bg-secondary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{currentUser?.name}</p>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span>You</span>
                <span className="text-[var(--text-secondary)] font-normal">• {currentUser?.username || 'Online'}</span>
              </p>
            </div>
          </div>
        )}

        {/* Other registered & online users */}
        {filteredUsers.length === 0 && !isCurrentUserMatch ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Search className="w-10 h-10 text-[var(--text-secondary)] mb-3 opacity-30 animate-pulse" />
            <p className="text-xs text-[var(--text-secondary)] font-medium">No users found</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 opacity-60">Try searching another name, username, or email</p>
          </div>
        ) : (
          filteredUsers.map(user => {
            const isUserActive = activeChatTarget && activeChatTarget.id === user.id;
            const unread = unreadCounts[user.id] || 0;
            const isUserOnline = !!user.isOnline;

            return (
              <div
                key={user.id}
                onClick={() => {
                  if (onSelectChatTarget) onSelectChatTarget(user);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 group border ${
                  isUserActive
                    ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40 shadow-md shadow-emerald-500/10'
                    : 'bg-transparent hover:bg-[var(--bg-tertiary)]/70 border-transparent hover:border-white/5'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform ring-2 ring-white/5"
                  />
                  {isUserOnline ? (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full status-online border-2 border-[var(--bg-secondary)]" title="Online" />
                  ) : (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-500 border-2 border-[var(--bg-secondary)]" title="Offline" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate transition-colors ${
                    isUserActive ? 'text-emerald-400' : 'text-[var(--text-primary)] group-hover:text-emerald-300'
                  }`}>
                    {user.name}
                  </p>
                  <p className="text-[11px] flex items-center gap-1 font-medium truncate">
                    {isUserOnline ? (
                      <span className="text-emerald-400 font-semibold">Online</span>
                    ) : (
                      <span className="text-slate-400 font-normal">Saved Contact</span>
                    )}
                    {user.username && <span className="text-[var(--text-secondary)] font-normal truncate">• {user.username}</span>}
                  </p>
                </div>

                {unread > 0 && (
                  <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-red-500/30 animate-bounce">
                    {unread}
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUserModal(user);
                  }}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
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
            <p className="text-xs text-[var(--bg-accent)] font-medium mb-1">
              {selectedUserModal.isMe ? 'You' : (selectedUserModal.username ? `@${selectedUserModal.username.replace('@', '')}` : 'Verified User')}
            </p>
            {selectedUserModal.email && (
              <p className="text-[11px] text-slate-400 mb-2 truncate">{selectedUserModal.email}</p>
            )}
            {selectedUserModal.bio && (
              <p className="text-xs text-slate-300 italic mb-3 px-2">"{selectedUserModal.bio}"</p>
            )}
            
            {selectedUserModal.isOnline || selectedUserModal.isMe ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Online & Ready to Chat
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs text-slate-300 font-medium mb-4">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Saved Contact • Offline
              </div>
            )}

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

      {/* ── Bottom Security Badge & Settings Button ── */}
      <div className="p-3 border-t border-[var(--border-color)] space-y-2">
        <button
          onClick={() => {
            if (onOpenSettings) onOpenSettings();
          }}
          className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 border border-cyan-500/30 rounded-xl text-xs font-extrabold text-cyan-300 flex items-center justify-center gap-2 transition shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <Settings className="w-4 h-4 text-cyan-400" />
          <span>Settings & Preferences</span>
        </button>

        <div className="dev-badge-glow rounded-xl px-4 py-2.5 flex items-center gap-3">
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

