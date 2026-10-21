import React, { useState, useEffect } from 'react';
import {
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  MessageSquare,
  Wifi,
  Download,
  X,
  Search,
  UserCheck,
  MessageCircle,
  Plus,
  Sparkles,
  Music,
  Globe,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Lock,
  Radio,
  Users,
  Sun,
  Moon,
  Phone,
  Video
} from 'lucide-react';
import { groupStatusesByUser } from '../utils/statusManager';
import { resumeAudioContext } from '../utils/statusAudioPlayer';
import { searchUsers } from '../utils/api';
import { recordAction } from '../utils/testRecorder';
import { analyzeUrl } from '../utils/linkDetector';

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
  onOpenStatusViewer,
  syncStatus = { online: true, latency: 15 },
  onOpenLinkModal,
  onOpenVoiceCall,
  onOpenVideoCall,
  theme = 'light',
  onToggleTheme
}) {
  // ── Navigation Tabs ──
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'status' | 'fraud'
  const [chatFilter, setChatFilter] = useState('all'); // 'all' | 'online' | 'unread'

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [serverResults, setServerResults] = useState([]);

  // ── Fraud Link Inspector State (for Fraud Shield Tab) ──
  const [testUrlInput, setTestUrlInput] = useState('');
  const [analyzedResult, setAnalyzedResult] = useState(null);

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
  const queryMatchedUsers = usersList.filter(user => {
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

  // Apply chatFilter ('all', 'online', 'unread')
  const filteredUsers = queryMatchedUsers.filter(user => {
    if (chatFilter === 'online') return !!user.isOnline;
    if (chatFilter === 'unread') return (unreadCounts[user.id] || 0) > 0;
    return true;
  });

  const isCurrentUserMatch = !query || 
    (currentUser?.name && currentUser.name.toLowerCase().includes(query)) ||
    (currentUser?.username && currentUser.username.toLowerCase().includes(query)) ||
    (currentUser?.email && currentUser.email.toLowerCase().includes(query));

  const isGlobalActive = !activeChatTarget || activeChatTarget === 'global';
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const onlineCount = usersList.filter(u => u.isOnline).length;

  const handleRunUrlAnalysis = (targetUrl) => {
    const urlToTest = (targetUrl || testUrlInput).trim();
    if (!urlToTest) return;
    const result = analyzeUrl(urlToTest);
    setAnalyzedResult(result);
  };

  return (
    <div className="w-[340px] max-w-[88vw] h-full flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl md:shadow-none select-none">

      {/* ── Top Bar ── */}
      <div className="px-3.5 py-3 flex items-center justify-between border-b border-[var(--border-color)] bg-[#0a111a]/90 backdrop-blur-md">
        <div className="relative flex-1 flex items-center justify-between">
          <button
            id="profile-toggle"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 hover:bg-slate-800/60 rounded-2xl px-2 py-1.5 transition-all group max-w-[210px] cursor-pointer"
            title="Click for Profile & Settings"
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

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Live Shared DB Badge */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-bold border transition ${
                syncStatus.online
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
              title={syncStatus.online ? `Shared Laptop/Mobile DB Online (${syncStatus.latency}ms)` : 'Offline mode'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline font-mono">Shared DB</span>
            </div>

            {/* Direct Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-2 text-amber-500 dark:text-amber-400 hover:text-white bg-slate-200/80 dark:bg-slate-900/90 hover:bg-amber-500/20 border border-slate-300 dark:border-amber-500/40 rounded-xl transition shadow-md flex items-center justify-center gap-1 hover:scale-105 active:scale-95 cursor-pointer"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>
            )}

            {/* Direct Visible Settings Icon Button */}
            <button
              onClick={() => {
                if (onOpenSettings) onOpenSettings();
                setShowProfileDropdown(false);
              }}
              className="p-2 text-cyan-500 dark:text-cyan-400 hover:text-white bg-slate-200/80 dark:bg-slate-900/90 hover:bg-cyan-500/20 border border-slate-300 dark:border-cyan-500/40 rounded-xl transition shadow-md flex items-center justify-center gap-1 hover:scale-105 active:scale-95 cursor-pointer"
              title="Open Settings & Preferences"
            >
              <Settings className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            </button>
          </div>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 glass-modal rounded-2xl shadow-2xl z-50 animate-slide-up border border-cyan-500/30 overflow-hidden">
              <div className="p-3.5 border-b border-slate-800 bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-pink-500/15">
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-400">Signed in as</p>
                <p className="text-sm font-extrabold text-white truncate">{currentUser?.name}</p>
                <p className="text-xs text-purple-300 truncate">{currentUser?.email || currentUser?.username}</p>
              </div>
              <div className="p-2 space-y-1">
                {onToggleTheme && (
                  <button
                    onClick={() => { onToggleTheme(); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                  >
                    {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <span>Theme: {theme === 'light' ? 'Light (Switch to Dark)' : 'Dark (Switch to Light)'}</span>
                  </button>
                )}
                <button
                  onClick={() => { onOpenSettings(); setShowProfileDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-cyan-500/15 hover:text-cyan-400 rounded-xl transition cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <span>Settings & Preferences</span>
                </button>
                {canInstallApp && (
                  <button
                    onClick={() => { onInstallApp(); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15 rounded-xl transition cursor-pointer text-left"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install SecureChat App</span>
                  </button>
                )}
                <button 
                  onClick={() => { if (onLogout) onLogout(); setShowProfileDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 rounded-xl transition cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close mobile drawer button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden ml-2 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Primary Navigation Feature Tabs ── */}
      <div className="px-3 pt-2.5 pb-2 grid grid-cols-3 gap-1.5 border-b border-slate-800/80 bg-slate-950/40">
        <button
          onClick={() => setActiveTab('chats')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'chats'
              ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </div>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-extrabold animate-pulse">
              {totalUnread}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('status')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'status'
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5" />
            <span>Status</span>
          </div>
          {statuses.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 absolute top-1 right-2" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('fraud')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'fraud'
              ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-400/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Shield</span>
          </div>
          <span className="text-[9px] px-1 bg-amber-500/30 text-amber-300 rounded font-mono">Live</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 1: CHATS VIEW                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'chats' && (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          {/* Global Chat Room Card */}
          <div 
            onClick={() => {
              if (onSelectChatTarget) onSelectChatTarget('global');
              if (onCloseMobile) onCloseMobile();
            }}
            className={`mx-3 mt-2.5 mb-2 px-3.5 py-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 border ${
              isGlobalActive
                ? 'bg-gradient-to-r from-cyan-500/25 via-purple-500/20 to-pink-500/15 border-cyan-400/50 shadow-lg shadow-cyan-500/20 scale-[1.01]'
                : 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isGlobalActive ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-md' : 'bg-slate-800 text-slate-400'}`}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-xs font-extrabold ${isGlobalActive ? 'text-cyan-300' : 'text-white'}`}>Global Community Room</p>
                <p className="text-[10px] text-slate-400 font-medium">Public & End-to-End Encrypted</p>
              </div>
            </div>

            {isGlobalActive ? (
              <span className="px-2 py-0.5 text-[9px] bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-extrabold rounded-full shadow-md shadow-cyan-500/30 animate-pulse">
                Active
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full">
                Public
              </span>
            )}
          </div>

          {/* User Search Input */}
          <div className="px-3 mb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                className="w-full bg-slate-900/90 text-white placeholder:text-slate-500 text-xs pl-8 pr-7 py-2 rounded-xl border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="px-3 mb-2 flex items-center gap-1.5">
            <button
              onClick={() => setChatFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                chatFilter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              All ({usersList.length + 1})
            </button>
            <button
              onClick={() => setChatFilter('online')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chatFilter === 'online'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online ({onlineCount + 1})
            </button>
            <button
              onClick={() => setChatFilter('unread')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                chatFilter === 'unread'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              Unread {totalUnread > 0 ? `(${totalUnread})` : ''}
            </button>
          </div>

          {/* WhatsApp Status Mini Stories Carousel */}
          <div className="px-3 mb-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Status Updates
              </span>
              <button
                onClick={() => {
                  recordAction('Status Management', 'User opens status composer dialog');
                  onOpenStatusModal();
                }}
                className="text-[9px] font-extrabold text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 px-2 py-0.5 rounded-full transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add</span>
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
                  className="relative p-0.5 rounded-full transition-transform hover:scale-105 cursor-pointer"
                >
                  <div className={`p-0.5 rounded-full ${myStatusGroup ? 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 shadow-md shadow-cyan-500/20' : 'border-2 border-dashed border-slate-700'}`}>
                    <img
                      src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                      alt="My Status"
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#0d1622]"
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
                    <Plus className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </button>
                <span className="text-[9px] font-bold text-slate-300 mt-1 truncate max-w-[55px]">
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
                    className="relative p-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400 shadow-md shadow-cyan-500/20 transition-transform hover:scale-105 cursor-pointer"
                  >
                    <img
                      src={group.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                      alt={group.userName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#0d1622]"
                    />
                    {group.statuses.some(s => s.songTitle) && (
                      <span className="absolute -top-1 -right-1 p-0.5 bg-purple-500 text-white rounded-full text-[8px] shadow-md animate-bounce">
                        <Music className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                  <span className="text-[9px] font-extrabold text-white mt-1 truncate max-w-[55px]">
                    {group.userName?.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Directory Section Header */}
          <div className="px-3.5 pt-1 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              {searchQuery ? 'Search Results' : 'Direct Messages & Contacts'}
            </span>
            <span className="text-[9px] font-extrabold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              {filteredUsers.length + (isCurrentUserMatch && chatFilter !== 'unread' ? 1 : 0)}
            </span>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto px-2 pt-1 space-y-1">
            {/* Current user (you) */}
            {isCurrentUserMatch && chatFilter !== 'unread' && (
              <div
                onClick={() => setSelectedUserModal({ ...currentUser, isMe: true, isOnline: true })}
                className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 mb-1 cursor-pointer hover:border-emerald-500/40 transition-all shadow-sm group"
              >
                <div className="relative shrink-0">
                  <img
                    src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                    alt={currentUser?.name || 'User'}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/30 group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full status-online border-2 border-[var(--bg-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span>You</span>
                    <span className="text-[var(--text-secondary)] font-normal">• {currentUser?.username || 'Online'}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Realtime empty state when waiting for users */}
            {filteredUsers.length === 0 && !query && (
              <div className="p-4 my-2 rounded-2xl bg-gradient-to-b from-cyan-950/30 via-slate-900/60 to-purple-950/30 border border-cyan-500/20 text-center shadow-md animate-fade-in">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <p className="text-xs font-bold text-white mb-1">Contacts Directory Ready</p>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Registered accounts will automatically appear here. Use the search bar above to look up any contact by name, @username, or email.
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Shared Database Connected</span>
                </div>
              </div>
            )}

            {/* No search results match */}
            {filteredUsers.length === 0 && (query || chatFilter !== 'all') && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Search className="w-8 h-8 text-slate-500 mb-2 opacity-40 animate-pulse" />
                <p className="text-xs text-slate-300 font-bold">No contacts found</p>
                <p className="text-[10px] text-slate-400 mt-1">Try another filter or search term</p>
              </div>
            )}

            {/* Contacts list */}
            {filteredUsers.map(user => {
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
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full status-online border-2 border-[var(--bg-secondary)]" title="Online" />
                    ) : (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-500 border-2 border-[var(--bg-secondary)]" title="Offline" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate transition-colors ${
                      isUserActive ? 'text-emerald-400' : 'text-[var(--text-primary)] group-hover:text-emerald-300'
                    }`}>
                      {user.name}
                    </p>
                    <p className="text-[10px] flex items-center gap-1 font-medium truncate">
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

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenVoiceCall) onOpenVoiceCall(user);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
                      title="Voice Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenVideoCall) onOpenVideoCall(user);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all cursor-pointer"
                      title="Video Call"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserModal(user);
                      }}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                      title="View Profile"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 2: STATUS STORIES HUB                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'status' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3 animate-fade-in">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-pink-950/40 border border-purple-500/30 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                24-Hour Stories
              </span>
              <button
                onClick={() => {
                  onOpenStatusModal();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xs rounded-xl shadow-md hover:brightness-110 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Story</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Post temporary photo or text updates with encrypted background music. Disappears automatically after 24 hours.
            </p>
          </div>

          {/* My status row */}
          <div
            onClick={() => {
              resumeAudioContext();
              if (myStatusGroup) onOpenStatusViewer(myStatusGroup);
              else onOpenStatusModal();
            }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition cursor-pointer"
          >
            <div className="relative">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt="My Status"
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
              />
              <span className="absolute bottom-0 right-0 p-1 bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 rounded-full shadow-md">
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">My Status</p>
              <p className="text-[11px] text-slate-400">
                {myStatusGroup ? `${myStatusGroup.statuses.length} active story(s)` : 'Tap to share an update'}
              </p>
            </div>
          </div>

          {/* Contacts status section */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Recent Friend Updates ({otherStatusGroups.length})
            </p>
            {otherStatusGroups.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                <p className="text-xs text-slate-400">No friend stories active right now</p>
                <p className="text-[10px] text-slate-500 mt-1">When contacts post a status, they will show up here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {otherStatusGroups.map((group) => (
                  <div
                    key={group.userId}
                    onClick={() => {
                      resumeAudioContext();
                      onOpenStatusViewer(group);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-400/40 hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    <div className="relative p-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
                      <img
                        src={group.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                        alt={group.userName}
                        className="w-11 h-11 rounded-full object-cover border-2 border-[#0d1622]"
                      />
                      {group.statuses.some(s => s.songTitle) && (
                        <span className="absolute -top-1 -right-1 p-1 bg-purple-500 text-white rounded-full text-[9px]">
                          <Music className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{group.userName}</p>
                      <p className="text-[10px] text-purple-300 truncate">
                        {group.statuses.length} update(s) • Tap to watch
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 3: AI FRAUD SHIELD & LINK SCANNER                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'fraud' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3 animate-fade-in">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-rose-950/40 border border-amber-500/30 shadow-md">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">AI Fraud & Phishing Engine</h3>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every link sent in chat is automatically analyzed. You can also paste any link below to test the detector in real time.
            </p>
          </div>

          {/* Quick link tester input */}
          <div className="space-y-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Test Any Link Instantly
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testUrlInput}
                onChange={(e) => setTestUrlInput(e.target.value)}
                placeholder="e.g. https://paypa1-security.com"
                className="flex-1 bg-slate-950 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none font-mono"
              />
              <button
                onClick={() => handleRunUrlAnalysis()}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-xl hover:brightness-110 transition shadow-md cursor-pointer"
              >
                Scan
              </button>
            </div>

            {/* Quick Demo Samples */}
            <div className="pt-1">
              <p className="text-[10px] text-slate-400 mb-1">Click a sample to test:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    setTestUrlInput('https://google.com');
                    handleRunUrlAnalysis('https://google.com');
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition cursor-pointer"
                >
                  🟢 google.com (Safe)
                </button>
                <button
                  onClick={() => {
                    setTestUrlInput('http://paypa1-security-alert.com/login');
                    handleRunUrlAnalysis('http://paypa1-security-alert.com/login');
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 transition cursor-pointer"
                >
                  🔴 paypa1.com (Phishing)
                </button>
                <button
                  onClick={() => {
                    setTestUrlInput('https://free-crypto-giveaway.xyz');
                    handleRunUrlAnalysis('https://free-crypto-giveaway.xyz');
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
                >
                  ⚠️ crypto.xyz (High Risk)
                </button>
              </div>
            </div>
          </div>

          {/* Analysis Result Card */}
          {analyzedResult && (
            <div className={`p-3.5 rounded-2xl border transition animate-slide-up ${
              analyzedResult.isSafe
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-rose-950/30 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {analyzedResult.isSafe ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                  )}
                  <span className={`text-xs font-bold ${analyzedResult.isSafe ? 'text-emerald-300' : 'text-rose-300'}`}>
                    Risk Level: {analyzedResult.riskLevel?.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-300">
                  Score: {analyzedResult.riskScore}/100
                </span>
              </div>

              <p className="text-[11px] font-mono text-white break-all mb-2">
                {analyzedResult.url}
              </p>

              {analyzedResult.reasons && analyzedResult.reasons.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  {analyzedResult.reasons.map((r, i) => (
                    <p key={i} className="text-[10px] text-slate-300 flex items-start gap-1">
                      <span className="text-amber-400">•</span>
                      <span>{r}</span>
                    </p>
                  ))}
                </div>
              )}

              {onOpenLinkModal && (
                <button
                  onClick={() => onOpenLinkModal(analyzedResult)}
                  className="mt-3 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-cyan-300 border border-slate-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Safety Advisory Modal</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── User Profile Popover Modal on Selection ── */}
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
              className="absolute top-3 right-3 p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-full transition cursor-pointer"
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
              <>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => {
                      if (onOpenVoiceCall) onOpenVoiceCall(selectedUserModal);
                      setSelectedUserModal(null);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Voice Call</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onOpenVideoCall) onOpenVideoCall(selectedUserModal);
                      setSelectedUserModal(null);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video Call</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (onSelectChatTarget) onSelectChatTarget(selectedUserModal);
                    setSelectedUserModal(null);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="w-full py-2.5 mb-2 bg-[var(--bg-accent)] hover:bg-[var(--bg-accent-hover)] text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  Start Private Chat
                </button>
              </>
            )}

            <button
              onClick={() => setSelectedUserModal(null)}
              className="w-full py-2 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom Security Badge & Settings Button ── */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[#090e17] space-y-2">
        <button
          onClick={() => {
            if (onOpenSettings) onOpenSettings();
          }}
          className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 border border-cyan-500/30 rounded-xl text-xs font-extrabold text-cyan-300 flex items-center justify-center gap-2 transition shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span>Settings & Preferences</span>
        </button>

        <div className="dev-badge-glow rounded-xl px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">SecureChat Guard™</p>
              <p className="text-[9px] text-slate-400">E2E Encrypted & AI Shield Active</p>
            </div>
          </div>
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      </div>
    </div>
  );
}
