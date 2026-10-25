import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Settings,
  LogOut,
  MessageSquare,
  MessageCircle,
  Phone,
  Video,
  Users,
  Star,
  MoreVertical,
  Plus,
  Search,
  X,
  Check,
  CheckCheck,
  Download,
  Sun,
  Moon,
  Music,
  Lock,
  Camera,
  ChevronRight,
  CircleDashed,
  Pin,
  FileText,
  User,
  UserPlus,
  UserCheck,
  Radio,
  ExternalLink,
  Info,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Calendar,
  Trash2
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
  theme = 'dark',
  onToggleTheme,
  callHistory = [],
  onClearCallHistory,
  friends = [],
  onFollowUser,
  onUnfollowUser,
  onRefreshMoments
}) {
  // Navigation tabs: 'chats' | 'calls' | 'status' | 'vault' | 'contacts'
  const [activeTab, setActiveTab] = useState('chats');
  const [chatFilter, setChatFilter] = useState('all'); // 'all' | 'unread' | 'favourites' | 'groups'
  const [callFilter, setCallFilter] = useState('all'); // 'all' | 'missed'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [serverResults, setServerResults] = useState([]);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Auto-sync moments when switching to Moments tab
  useEffect(() => {
    if (activeTab === 'status' && onRefreshMoments) {
      onRefreshMoments();
    }
  }, [activeTab, onRefreshMoments]);

  // Link Detector / Vault State
  const [scanUrlInput, setScanUrlInput] = useState('');
  const [scannedResult, setScannedResult] = useState(null);

  const isLight = theme === 'light';

  // Handle URL scanning inside Vault tab
  const handleScanUrl = (e) => {
    if (e) e.preventDefault();
    if (!scanUrlInput.trim()) return;
    const result = analyzeUrl(scanUrlInput.trim());
    setScannedResult(result);
    recordAction('Security Analysis', `User analyzes URL: ${result.hostname || result.originalUrl} (${result.riskLevel})`);
  };

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

  // Set of current user's friend IDs (mutual follow / friends)
  const myFriendIds = useMemo(() => {
    if (!currentUser?.id || !Array.isArray(friends)) return new Set();
    const set = new Set();
    friends.forEach(f => {
      if (f.userId === currentUser.id && f.friendId) set.add(f.friendId);
      if (f.friendId === currentUser.id && f.userId) set.add(f.userId);
    });
    return set;
  }, [friends, currentUser?.id]);

  // Group active statuses by user
  const statusGroups = groupStatusesByUser(statuses);
  const myStatusGroup = statusGroups.find(g => g.userId === currentUser?.id);
  // Requirement 5: Everyone who registered can see moments; once users become friends, added friends' moments are prioritized
  const otherStatusGroups = useMemo(() => {
    const list = statusGroups.filter(g => g.userId !== currentUser?.id);
    if (myFriendIds.size > 0) {
      const friendsList = list.filter(g => myFriendIds.has(g.userId));
      if (friendsList.length > 0) return friendsList;
    }
    return list;
  }, [statusGroups, currentUser?.id, myFriendIds]);

  // Combine user directory with dynamic search results (Strictly registered users with valid names only)
  const userMap = new Map();
  (Array.isArray(allUsers) ? allUsers : []).forEach(u => {
    if (u && u.id && u.id !== currentUser?.id && u.name && u.name.trim() !== '') {
      userMap.set(u.id, u);
    }
  });
  (Array.isArray(serverResults) ? serverResults : []).forEach(u => {
    if (u && u.id && u.id !== currentUser?.id && u.name && u.name.trim() !== '') {
      userMap.set(u.id, { ...userMap.get(u.id), ...u });
    }
  });
  const usersList = Array.from(userMap.values());

  // Filter users based on search query
  const queryMatchedUsers = usersList.filter(user => {
    if (!query) return true;
    const nameStr = (user.name || '').toLowerCase();
    const usernameStr = (user.username || '').toLowerCase();
    const cleanUsername = usernameStr.startsWith('@') ? usernameStr.slice(1) : usernameStr;
    const emailStr = (user.email || '').toLowerCase();
    const phoneStr = (user.phone || '').toLowerCase();
    const cleanQuery = query.startsWith('@') ? query.slice(1) : query;

    return (
      nameStr.includes(cleanQuery) ||
      usernameStr.includes(cleanQuery) ||
      cleanUsername.includes(cleanQuery) ||
      emailStr.includes(cleanQuery) ||
      phoneStr.includes(cleanQuery)
    );
  });

  // Filter users based on pill category
  const filteredUsers = queryMatchedUsers.filter(user => {
    if (chatFilter === 'unread') {
      return (unreadCounts[user.id] || 0) > 0;
    }
    if (chatFilter === 'favourites') {
      return user.isFavourite || user.isOnline;
    }
    if (chatFilter === 'groups') {
      return false; // Groups filter shows only Community
    }
    return true;
  });

  const isGlobalActive = !activeChatTarget || activeChatTarget === 'global';
  const totalUnread = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

  // Helper to check online status safely (strictly based on real-time presence & backend status)
  const checkIsOnline = (user) => {
    if (!user || !user.id) return false;
    if (currentUser?.id && user.id === currentUser.id) return true;
    if (Array.isArray(onlineUsers)) {
      if (onlineUsers.some(o => (typeof o === 'string' ? o === user.id : o?.id === user.id))) {
        return true;
      }
    }
    return Boolean(user.isOnline);
  };

  return (
    <div className={`h-full flex flex-col md:flex-row select-none ${
      isLight ? 'bg-[#f0f2f5] text-slate-900' : 'bg-[#0d161d] text-[#e9edef]'
    }`}>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. DESKTOP FAR-LEFT NAVIGATION RAIL (Image 2)                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className={`hidden md:flex flex-col items-center justify-between py-4 w-[74px] shrink-0 border-r ${
        isLight ? 'bg-[#e9edf0] border-slate-200' : 'bg-[#0a1218] border-slate-800/80'
      }`}>
        {/* Top Rail Navigation Icons */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {/* Chats Tab */}
          <button
            onClick={() => {
              setActiveTab('chats');
              recordAction('Navigation', 'User switches to Chats rail tab');
            }}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
              activeTab === 'chats'
                ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/40 shadow-sm'
                : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-[#8696a0] hover:bg-[#1a2530] hover:text-[#d1d7db]'
            }`}
            title="Chats"
          >
            <MessageCircle className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-semibold mt-0.5">Chats</span>
            {totalUnread > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] absolute top-2 right-2 ring-2 ring-[#0a1218]" />
            )}
          </button>

          {/* Calls Tab */}
          <button
            onClick={() => {
              setActiveTab('calls');
              recordAction('Navigation', 'User switches to Calls rail tab');
            }}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
              activeTab === 'calls'
                ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/40 shadow-sm'
                : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-[#8696a0] hover:bg-[#1a2530] hover:text-[#d1d7db]'
            }`}
            title="Calls"
          >
            <Phone className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-semibold mt-0.5">Calls</span>
          </button>

          {/* Moments Tab */}
          <button
            onClick={() => {
              setActiveTab('status');
              if (onRefreshMoments) onRefreshMoments();
              recordAction('Navigation', 'User switches to Moments rail tab');
            }}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
              activeTab === 'status'
                ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/40 shadow-sm'
                : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-[#8696a0] hover:bg-[#1a2530] hover:text-[#d1d7db]'
            }`}
            title="Moments"
          >
            <CircleDashed className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-semibold mt-0.5">Moments</span>
            {statuses.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#f97316] absolute top-2.5 right-2.5 ring-2 ring-[#0a1218]" />
            )}
          </button>

          {/* Vault Tab (Security & Link Fraud Detector) */}
          <button
            onClick={() => {
              setActiveTab('vault');
              recordAction('Navigation', 'User switches to Vault rail tab');
            }}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
              activeTab === 'vault'
                ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/40 shadow-sm'
                : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-[#8696a0] hover:bg-[#1a2530] hover:text-[#d1d7db]'
            }`}
            title="Vault"
          >
            <Lock className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-semibold mt-0.5">Vault</span>
          </button>

          {/* Contacts Directory Tab */}
          <button
            onClick={() => {
              setActiveTab('contacts');
              recordAction('Navigation', 'User switches to Contacts rail tab');
            }}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
              activeTab === 'contacts'
                ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/40 shadow-sm'
                : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-[#8696a0] hover:bg-[#1a2530] hover:text-[#d1d7db]'
            }`}
            title="Contacts"
          >
            <Users className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-semibold mt-0.5">Contacts</span>
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => onOpenSettings && onOpenSettings()}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer text-[#8696a0] hover:bg-[#1a2530] hover:text-white`}
            title="Settings"
          >
            <Settings className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] font-semibold mt-0.5">Settings</span>
          </button>
        </div>

        {/* Bottom Rail User Profile Avatar */}
        <div className="flex flex-col items-center gap-1.5 w-full px-2">
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#f97316] hover:scale-105 transition-transform cursor-pointer relative"
              title={`${currentUser?.name} (Click for profile)`}
            >
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt={currentUser?.name || 'User'}
                className="w-full h-full object-cover"
              />
            </button>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#0a1218]" />

            {/* Profile Dropdown */}
            {showProfileDropdown && (
              <div className={`absolute bottom-full left-1 mb-2 w-64 rounded-2xl shadow-2xl z-50 border overflow-hidden ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#15202b] border-slate-700 text-[#e9edef]'
              }`}>
                <div className="p-3 border-b border-slate-700/60 bg-[#f97316]/10">
                  <p className="text-[10px] uppercase font-bold text-[#f97316]">Signed in as</p>
                  <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{currentUser?.email || currentUser?.username}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => { onOpenSettings(); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-[#f97316]/15 rounded-xl transition text-left"
                  >
                    <Settings className="w-4 h-4 text-[#f97316]" />
                    <span>Settings</span>
                  </button>
                  {canInstallApp && (
                    <button
                      onClick={() => { onInstallApp(); setShowProfileDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/15 rounded-xl transition text-left"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Web App</span>
                    </button>
                  )}
                  <button
                    onClick={() => { if (onLogout) onLogout(); setShowProfileDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 rounded-xl transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-[11px] font-bold text-white truncate max-w-[62px]">
            {currentUser?.name?.split(' ')[0] || 'User'}
          </p>
          <span className="text-[9px] text-[#22c55e] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            Online
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. CHATS / CONTENT COLUMN (Mobile Full Screen & Desktop Mid) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className={`flex-1 md:w-[370px] md:max-w-[390px] flex flex-col h-full border-r relative ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0e171f] border-slate-800/80'
      }`}>

        {/* ── MOBILE TOP BAR (Image 1: SecureChat logo + Camera + Shield + Search + 3-dots) ── */}
        <div className={`md:hidden flex items-center justify-between px-4 pt-9 pb-2.5 border-b ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0d161d] border-slate-800/80'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316]">
              <Shield className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
              Secure<span className="text-[#f97316]">Chat</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenStatusModal && onOpenStatusModal()}
              className="p-1.5 text-slate-300 hover:text-white transition"
              title="Camera"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className="p-1.5 text-[#14b8a6] hover:text-[#2dd4bf] transition"
              title="AI Fraud Shield"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-1.5 text-slate-300 hover:text-white transition"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                className="p-1.5 text-slate-300 hover:text-white transition"
                title="Menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenuDropdown && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl bg-[#1a2530] border border-slate-700 shadow-2xl z-50 p-1.5">
                  <button
                    onClick={() => { onOpenSettings(); setShowMenuDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#f97316]/15 rounded-xl"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => { onToggleTheme(); setShowMenuDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#f97316]/15 rounded-xl"
                  >
                    Toggle Theme
                  </button>
                  <button
                    onClick={() => { onLogout(); setShowMenuDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 rounded-xl"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MOBILE TOP TABS (Image 1: Chats [orange active underline], Status, Calls) ── */}
        <div className="md:hidden flex items-center justify-around border-b border-slate-800/80 bg-[#0d161d]">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-all relative ${
              activeTab === 'chats' ? 'text-[#f97316]' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chats</span>
            {activeTab === 'chats' && (
              <span className="absolute bottom-0 inset-x-4 h-0.5 bg-[#f97316] rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('status');
              if (onRefreshMoments) onRefreshMoments();
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-all relative ${
              activeTab === 'status' ? 'text-[#f97316]' : 'text-slate-400'
            }`}
          >
            <CircleDashed className="w-4 h-4" />
            <span>Moments</span>
            {activeTab === 'status' && (
              <span className="absolute bottom-0 inset-x-4 h-0.5 bg-[#f97316] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-all relative ${
              activeTab === 'calls' ? 'text-[#f97316]' : 'text-slate-400'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Calls</span>
            {activeTab === 'calls' && (
              <span className="absolute bottom-0 inset-x-4 h-0.5 bg-[#f97316] rounded-full" />
            )}
          </button>
        </div>

        {/* ── DESKTOP HEADER (Image 2: "Chats" heading + Orange circular '+' button) ── */}
        <div className={`hidden md:flex items-center justify-between px-5 pt-4 pb-2.5 ${
          isLight ? 'bg-white' : 'bg-[#0d161d]'
        }`}>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {activeTab === 'chats' && 'Chats'}
            {activeTab === 'calls' && 'Calls'}
            {activeTab === 'status' && 'Moments'}
            {activeTab === 'vault' && 'Security Vault'}
            {activeTab === 'contacts' && 'Contacts'}
          </h2>

          <div className="flex items-center gap-2">
            {activeTab === 'chats' && (
              <button
                onClick={() => {
                  const input = document.getElementById('sidebar-search-input');
                  setShowSearchModal(true);
                  setTimeout(() => input?.focus(), 50);
                }}
                className="w-9 h-9 rounded-full bg-[#f97316] hover:bg-[#ea580c] active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform cursor-pointer"
                title="New Chat"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
            {activeTab === 'status' && (
              <button
                onClick={() => onOpenStatusModal && onOpenStatusModal()}
                className="w-9 h-9 rounded-full bg-[#f97316] hover:bg-[#ea580c] active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform cursor-pointer"
                title="Add Moment"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* ── SEARCH INPUT CONTAINER (Desktop & Mobile) ── */}
        <div className="px-3.5 py-2 block">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#14202a] border border-slate-700/60 focus-within:border-[#f97316]/60 transition">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              id="sidebar-search-input"
              type="text"
              placeholder="Search by display name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
            {(searchQuery || showSearchModal) && (
              <button
                onClick={() => { setSearchQuery(''); setShowSearchModal(false); }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── 3. CHATS TAB VIEW ── */}
        {activeTab === 'chats' && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Mobile End-to-end Encryption Banner Card (Image 1) */}
            <div className="md:hidden mx-3.5 mt-2.5 mb-1.5 p-3 rounded-2xl bg-gradient-to-r from-[#072424]/90 via-[#0a3333]/90 to-[#072424]/90 border border-teal-800/50 flex items-center justify-between shadow-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.25)]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight">Your chats are end-to-end encrypted</h4>
                  <p className="text-[11px] text-teal-200/70">Your privacy. Our priority.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-teal-400/80" />
            </div>

            {/* Filter Chips (Image 1 & 2: All, Unread, Favourites, Groups) */}
            <div className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setChatFilter('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                  chatFilter === 'all'
                    ? 'bg-[#f97316] text-white shadow-md'
                    : 'bg-[#15222d] text-slate-300 border border-slate-700/60 hover:bg-[#1e2d3b]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChatFilter('unread')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  chatFilter === 'unread'
                    ? 'bg-[#f97316] text-white shadow-md'
                    : 'bg-[#15222d] text-slate-300 border border-slate-700/60 hover:bg-[#1e2d3b]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Unread</span>
                {totalUnread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-[#f97316] text-[10px] font-bold flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </button>
              <button
                onClick={() => setChatFilter('favourites')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  chatFilter === 'favourites'
                    ? 'bg-[#f97316] text-white shadow-md'
                    : 'bg-[#15222d] text-slate-300 border border-slate-700/60 hover:bg-[#1e2d3b]'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Favourites</span>
              </button>
              <button
                onClick={() => setChatFilter('groups')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  chatFilter === 'groups'
                    ? 'bg-[#f97316] text-white shadow-md'
                    : 'bg-[#15222d] text-slate-300 border border-slate-700/60 hover:bg-[#1e2d3b]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Groups</span>
              </button>
            </div>

            {/* Chat List Items */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">

              {/* When actively searching with display name, show User Profiles directly */}
              {query ? (
                <div className="space-y-2 py-1">
                  <div className="flex items-center justify-between px-2 pt-1 pb-1">
                    <p className="text-xs font-bold uppercase text-[#f97316] tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Matching Profiles ({queryMatchedUsers.length})</span>
                    </p>
                    <span className="text-[11px] text-slate-400">Search: "{searchQuery}"</span>
                  </div>

                  {queryMatchedUsers.length > 0 ? (
                    queryMatchedUsers.map((user) => {
                      const isUserActive = !isGlobalActive && activeChatTarget?.id === user.id;
                      const isOnline = checkIsOnline(user);

                      return (
                        <div
                          key={user.id}
                          className="p-3.5 rounded-2xl bg-[#14202a] hover:bg-[#1a2835] border border-slate-700/70 hover:border-[#f97316]/50 transition-all shadow-md group space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Profile Left: Avatar + Info */}
                            <div
                              onClick={() => {
                                if (onSelectChatTarget) onSelectChatTarget(user);
                                setSearchQuery('');
                                setShowSearchModal(false);
                              }}
                              className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                            >
                              <div className="relative shrink-0">
                                <img
                                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                                  alt={user.name}
                                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#f97316]/30 shadow-sm"
                                />
                                {isOnline ? (
                                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#22c55e] ring-2 ring-[#0d161d]" title="Online" />
                                ) : (
                                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-500 ring-2 ring-[#0d161d]" title="Offline" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                                  {isOnline && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-green-500/15 border border-green-500/30 text-[9px] font-bold text-green-400">
                                      Online
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-orange-400 font-medium truncate">
                                  @{((user.username || 'user').replace('@', ''))}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                                  {user.bio || '🔒 Protected by SecureChat Guard'}
                                </p>
                              </div>
                            </div>

                            {/* Call Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => onOpenVoiceCall && onOpenVoiceCall(user)}
                                className="p-2 text-slate-300 hover:text-[#f97316] hover:bg-[#f97316]/15 rounded-xl transition cursor-pointer"
                                title="Voice Call"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenVideoCall && onOpenVideoCall(user)}
                                className="p-2 text-slate-300 hover:text-purple-400 hover:bg-purple-500/15 rounded-xl transition cursor-pointer"
                                title="Video Call"
                              >
                                <Video className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Action Button: Message / Start Chat */}
                          <button
                            onClick={() => {
                              if (onSelectChatTarget) onSelectChatTarget(user);
                              setSearchQuery('');
                              setShowSearchModal(false);
                            }}
                            className="w-full py-2 px-3 bg-gradient-to-r from-[#f97316] to-[#fb923c] hover:brightness-110 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Message {user.name.split(' ')[0]}</span>
                          </button>

                          {/* Requirement 4: Below Send Message give Add Follow / Friends button */}
                          {(() => {
                            const isFriend = myFriendIds.has(user.id);
                            return (
                              <button
                                onClick={() => {
                                  if (isFriend) {
                                    if (onUnfollowUser) onUnfollowUser(user);
                                  } else {
                                    if (onFollowUser) onFollowUser(user);
                                  }
                                }}
                                className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer border ${
                                  isFriend
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400/40 text-cyan-300 active:scale-98'
                                }`}
                              >
                                {isFriend ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Friends (Added)</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Add Follow</span>
                                  </>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 px-4 bg-[#14202a]/60 rounded-2xl border border-slate-800 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <User className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-white">No profile found</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        No registered user found with display name "{searchQuery}". Please check the spelling or invite them to SecureChat.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Moments Stories Horizontal Bar (Instant Visibility on Web and Mobile) */}
                  {chatFilter !== 'unread' && (
                    <div className="pb-2.5 pt-0.5 border-b border-slate-800/80 mb-2">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse" />
                          <span>Moments</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            resumeAudioContext();
                            if (onOpenStatusModal) onOpenStatusModal();
                          }}
                          className="text-[11px] font-bold text-[#f97316] hover:text-[#fb923c] transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>Add Moment</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3 overflow-x-auto py-1 px-1 no-scrollbar">
                        {/* My Moment Item */}
                        <div
                          onClick={() => {
                            resumeAudioContext();
                            if (myStatusGroup) onOpenStatusViewer(myStatusGroup);
                            else if (onOpenStatusModal) onOpenStatusModal();
                          }}
                          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                        >
                          <div className="relative">
                            <div className={`p-0.5 rounded-full transition-transform group-hover:scale-105 ${
                              myStatusGroup ? 'ring-2 ring-[#f97316] ring-offset-2 ring-offset-[#0d161d]' : ''
                            }`}>
                              <img
                                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                                alt="Your Moment"
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            </div>
                            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#f97316] text-white flex items-center justify-center ring-2 ring-[#0d161d]">
                              <Plus className="w-3 h-3 stroke-[3]" />
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-300 max-w-[62px] truncate text-center">
                            {myStatusGroup ? 'My Moment' : 'Your Story'}
                          </span>
                        </div>

                        {/* Other Users' Moments */}
                        {otherStatusGroups.map(group => {
                          const userObj = allUsers.find(u => u.id === group.userId);
                          return (
                            <div
                              key={group.userId}
                              onClick={() => {
                                resumeAudioContext();
                                if (onOpenStatusViewer) onOpenStatusViewer(group);
                              }}
                              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                            >
                              <div className="relative p-0.5 rounded-full ring-2 ring-[#f97316] ring-offset-2 ring-offset-[#0d161d] transition-transform group-hover:scale-105">
                                <img
                                  src={group.userAvatar || userObj?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                                  alt={group.userName}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                                {group.statuses.some(s => s.songTitle) && (
                                  <span className="absolute -bottom-1 -right-1 p-0.5 bg-purple-500 text-white rounded-full text-[9px] ring-1 ring-[#0d161d]">
                                    <Music className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-white max-w-[66px] truncate text-center">
                                {group.userName || userObj?.name || 'Contact'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 1. SecureChat Community Room (Image 1 & 2) */}
                  {chatFilter !== 'unread' && (
                    <div
                      onClick={() => {
                        if (onSelectChatTarget) onSelectChatTarget('global');
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all relative ${
                        isGlobalActive
                          ? 'border border-[#f97316] bg-[#1a2530] shadow-md'
                          : 'hover:bg-[#15202b] border border-transparent'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f97316] to-[#fb923c] flex items-center justify-center text-white shadow-sm">
                          <Users className="w-6 h-6" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22c55e] ring-2 ring-[#0d161d]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-[15px] font-bold text-white flex items-center gap-1.5 truncate">
                            <span>SecureChat Community</span>
                            <Pin className="w-3.5 h-3.5 text-[#f97316] shrink-0 rotate-45" />
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.5 rounded-full bg-[#064e3b] text-[#34d399] text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                              LIVE
                            </span>
                            <span className="text-[11px] text-slate-400">Now</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-teal-400 font-medium mb-0.5 truncate">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Protected by AI Fraud Shield</span>
                        </div>

                        <p className="text-xs text-slate-400 truncate">
                          ~ All: Welcome to a safer messaging experience...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 2. Registered Direct Users */}
                  {filteredUsers.map((user) => {
                    const isUserActive = !isGlobalActive && activeChatTarget?.id === user.id;
                    const isOnline = checkIsOnline(user);
                    const unread = unreadCounts[user.id] || 0;
                    if (!user || !user.id || !user.name || !user.name.trim()) return null;

                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          if (onSelectChatTarget) onSelectChatTarget(user);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group relative ${
                          isUserActive
                            ? 'border border-[#f97316] bg-[#1a2530] shadow-md'
                            : 'hover:bg-[#15202b] border border-transparent'
                        }`}
                      >
                        {/* User Profile Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {isOnline ? (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22c55e] ring-2 ring-[#0d161d]" title="Online" />
                          ) : (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-500 ring-2 ring-[#0d161d]" title="Offline" />
                          )}
                        </div>

                        {/* Chat Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h3 className="text-[15px] font-bold text-white truncate">
                              {user.name}
                            </h3>
                            <span className={`text-[11px] shrink-0 ${unread > 0 ? 'text-[#f97316] font-bold' : 'text-slate-400'}`}>
                              {user.lastSeen || (isOnline ? 'Online' : 'Yesterday')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              {isOnline ? (
                                <span className="text-[#22c55e] font-semibold">● Online • </span>
                              ) : null}
                              <span>{user.bio || `@${(user.username || 'user').replace('@', '')}`}</span>
                            </p>

                            {unread > 0 ? (
                              <span className="px-2 py-0.5 min-w-[20px] rounded-full bg-[#f97316] text-white text-[10px] font-bold text-center shadow-sm">
                                {unread}
                              </span>
                            ) : (
                              <CheckCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Hover Quick Action Call Buttons (Desktop) */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-[#1a2632] p-1 rounded-xl shadow-lg border border-slate-700">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenVoiceCall) onOpenVoiceCall(user);
                            }}
                            className="p-1.5 text-slate-300 hover:text-[#f97316] hover:bg-[#f97316]/15 rounded-lg transition"
                            title="Voice Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenVideoCall) onOpenVideoCall(user);
                            }}
                            className="p-1.5 text-slate-300 hover:text-purple-400 hover:bg-purple-500/15 rounded-lg transition"
                            title="Video Call"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* 3. Security Updates Built-in Item (Image 1 & 2) */}
                  {chatFilter !== 'groups' && (
                    <div
                      onClick={() => setActiveTab('vault')}
                      className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-[#15202b] transition-all border border-transparent"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#f97316]/15 border border-[#f97316]/40 flex items-center justify-center text-[#f97316] shrink-0 shadow-sm">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-[15px] font-bold text-white truncate">Security Updates</h3>
                          <span className="text-[11px] text-slate-400">Yesterday</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-400 truncate">Your privacy report is ready</p>
                          <span className="w-5 h-5 rounded-full bg-[#f97316] text-white text-[11px] font-bold flex items-center justify-center">
                            2
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredUsers.length === 0 && chatFilter === 'unread' && totalUnread === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm font-medium">No unread messages</p>
                      <p className="text-xs mt-1">You're all caught up!</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mobile Circular Floating Action Button (FAB) (Image 1) */}
            <div className="md:hidden fixed right-5 bottom-20 z-30">
              <button
                onClick={() => {
                  const input = document.getElementById('sidebar-search-input');
                  setShowSearchModal(true);
                  setTimeout(() => input?.focus(), 100);
                }}
                className="w-14 h-14 rounded-full bg-[#f97316] hover:bg-[#ea580c] active:scale-95 text-white flex items-center justify-center shadow-2xl transition-transform cursor-pointer"
                title="Start New Chat"
              >
                <MessageSquare className="w-6 h-6 stroke-[2.2]" />
              </button>
            </div>
          </div>
        )}

        {/* ── 4. CALLS TAB VIEW (Beside Status in Mobile & Desktop) ── */}
        {activeTab === 'calls' && (
          <div className="flex-1 flex flex-col overflow-y-auto px-3 py-3 space-y-3.5">
            {/* Header / Start Call Card */}
            <div className="p-3.5 rounded-2xl bg-[#14202a] border border-slate-700/60 flex items-center justify-between shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-white">Encrypted Calls</h4>
                <p className="text-xs text-slate-400">P2P HD Voice & Video calls</p>
              </div>
              <button
                onClick={() => onOpenVoiceCall && onOpenVoiceCall(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#f97316] text-white text-xs font-bold hover:bg-[#ea580c] transition shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>New Call</span>
              </button>
            </div>

            {/* Call History Header with Filter & Clear option */}
            {(() => {
              const seen = new Set();
              const uniqueCalls = callHistory.filter(c => {
                if (!c) return false;
                const compositeKey = `${c.targetId || c.targetName}_${c.type || 'voice'}_${c.direction || 'outgoing'}_${c.dateFormatted || ''}_${c.timeFormatted || ''}`;
                if ((c.id && seen.has(c.id)) || seen.has(compositeKey)) return false;
                if (c.id) seen.add(c.id);
                seen.add(compositeKey);
                return true;
              });

              return (
                <>
                  <div className="flex items-center justify-between px-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">Recent Calls</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f97316]/20 text-[#f97316]">
                        {uniqueCalls.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {uniqueCalls.length > 0 && (
                        <button
                          onClick={onClearCallHistory}
                          className="text-[11px] font-semibold text-rose-400/90 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                          title="Clear Call History"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                      <div className="flex items-center p-0.5 rounded-lg bg-[#14202a] border border-slate-700/60 text-[11px]">
                        <button
                          onClick={() => setCallFilter('all')}
                          className={`px-2 py-0.5 rounded-md font-semibold transition ${
                            callFilter === 'all' ? 'bg-[#f97316] text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setCallFilter('missed')}
                          className={`px-2 py-0.5 rounded-md font-semibold transition ${
                            callFilter === 'missed' ? 'bg-[#f97316] text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Missed
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Call History List */}
                  {uniqueCalls.length > 0 ? (
                    <div className="space-y-2">
                      {uniqueCalls
                        .filter(c => callFilter === 'all' || c.direction === 'missed' || c.status === 'missed' || c.status === 'declined')
                        .map((call) => {
                    const matchedUser = allUsers.find(u => u.id === call.targetId) || { id: call.targetId, name: call.targetName, avatar: call.targetAvatar };
                    const isVideo = call.type === 'video';
                    const isMissed = call.direction === 'missed' || call.status === 'missed' || call.status === 'declined';
                    const isOutgoing = call.direction === 'outgoing';

                    return (
                      <div
                        key={call.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#121c25]/80 hover:bg-[#16232e] border border-slate-800/80 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={call.targetAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                              alt={call.targetName}
                              className="w-11 h-11 rounded-full object-cover border border-slate-700"
                            />
                            {checkIsOnline(matchedUser) && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#0e171f]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={`text-sm font-bold truncate ${isMissed ? 'text-rose-400' : 'text-white'}`}>
                                {call.targetName}
                              </p>
                              {/* Type Badge: Video or Audio Call */}
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                                isVideo
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {isVideo ? <Video className="w-2.5 h-2.5" /> : <Phone className="w-2.5 h-2.5" />}
                                <span>{isVideo ? 'Video Call' : 'Audio Call'}</span>
                              </span>
                            </div>

                            {/* Call Details: Direction icon + Exact Date + Exact Time + Duration */}
                            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                              <span className="flex items-center gap-1 font-semibold">
                                {isMissed ? (
                                  <>
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500 shrink-0 stroke-[2.5]" />
                                    <span className="text-rose-400">Missed</span>
                                  </>
                                ) : isOutgoing ? (
                                  <>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0 stroke-[2.5]" />
                                    <span>Outgoing</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                                    <span className="text-emerald-400">Incoming</span>
                                  </>
                                )}
                              </span>

                              <span>•</span>
                              <span className="text-slate-300">{call.dateFormatted}, {call.timeFormatted}</span>

                              <span>•</span>
                              <span className={`font-mono text-[11px] ${isMissed ? 'text-rose-400/90' : 'text-[#f97316]'}`}>
                                Duration: {call.durationFormatted}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Callback Button */}
                        <div className="shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (isVideo) {
                                if (onOpenVideoCall) onOpenVideoCall(matchedUser);
                              } else {
                                if (onOpenVoiceCall) onOpenVoiceCall(matchedUser);
                              }
                            }}
                            className={`p-2.5 rounded-xl transition cursor-pointer active:scale-95 ${
                              isVideo
                                ? 'bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                            }`}
                            title={`Call back (${isVideo ? 'Video' : 'Audio'})`}
                          >
                            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-[#121c25]/60 border border-slate-800/80 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                  <Phone className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-white">No calls yet</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  When you make or receive encrypted audio or video calls, your call history with exact date, time, duration, and call type will appear here.
                </p>
              </div>
            )}
                </>
              );
            })()}

            {/* Contacts Directory to place a call */}
            <div className="pt-2">
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider px-1 mb-2">Registered Contacts</p>
              <div className="space-y-1">
                {usersList.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#15202b] transition border border-transparent"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {checkIsOnline(user) && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#0e171f]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {checkIsOnline(user) ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenVoiceCall && onOpenVoiceCall(user)}
                        className="p-2 text-slate-300 hover:text-[#f97316] hover:bg-[#f97316]/15 rounded-xl transition cursor-pointer"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenVideoCall && onOpenVideoCall(user)}
                        className="p-2 text-slate-300 hover:text-purple-400 hover:bg-purple-500/15 rounded-xl transition cursor-pointer"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 5. MOMENTS TAB VIEW ── */}
        {activeTab === 'status' && (
          <div className="flex-1 flex flex-col overflow-y-auto px-3 py-2 space-y-3">
            {/* My Moments */}
            <div
              onClick={() => {
                resumeAudioContext();
                if (myStatusGroup) onOpenStatusViewer(myStatusGroup);
                else if (onOpenStatusModal) onOpenStatusModal();
              }}
              className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#15202b] transition cursor-pointer border border-transparent"
            >
              <div className="relative shrink-0">
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                  alt="My Moments"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#f97316] text-white flex items-center justify-center ring-2 ring-[#0d161d]">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white">My Moments</h4>
                <p className="text-xs text-slate-400">
                  {myStatusGroup ? `${myStatusGroup.statuses.length} Moments • Tap to view` : 'Tap to add Moments update'}
                </p>
              </div>
            </div>

            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider px-1">Recent Moments</p>

            <div className="space-y-1">
              {otherStatusGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-sm font-medium">No recent Moments</p>
                  <p className="text-xs mt-1">Moments from your contacts will appear here</p>
                </div>
              ) : (
                otherStatusGroups.map((group) => (
                  <div
                    key={group.userId}
                    onClick={() => {
                      resumeAudioContext();
                      if (onOpenStatusViewer) onOpenStatusViewer(group);
                    }}
                    className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#15202b] transition cursor-pointer"
                  >
                    <div className="relative shrink-0 p-0.5 rounded-full ring-2 ring-[#f97316] ring-offset-2 ring-offset-[#0d161d]">
                      <img
                        src={group.userAvatar || (allUsers.find(u => u.id === group.userId)?.avatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                        alt={group.userName}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                      {group.statuses.some(s => s.songTitle) && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-purple-500 text-white rounded-full text-[9px]">
                          <Music className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">
                        {group.userName || (allUsers.find(u => u.id === group.userId)?.name) || 'User'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {group.statuses.length} Moment{group.statuses.length > 1 ? 's' : ''} • Tap to view
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── 6. VAULT & SECURITY TAB VIEW ── */}
        {activeTab === 'vault' && (
          <div className="flex-1 flex flex-col overflow-y-auto px-4 py-3 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 to-slate-900 border border-teal-500/30 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">AI Fraud Shield Active</h4>
                  <p className="text-xs text-teal-300/80">Real-time anti-phishing protection</p>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                All messages and attachments are automatically scanned for phishing keywords, malicious links, and spoofed domains.
              </p>
            </div>

            {/* Link Detector Scanner */}
            <div className="p-4 rounded-2xl bg-[#14202a] border border-slate-700/60 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#f97316]" />
                <span>Link Risk Scanner</span>
              </h4>
              <p className="text-xs text-slate-400">
                Paste any suspicious URL to verify safety before opening.
              </p>
              <form onSubmit={handleScanUrl} className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://example.com/login"
                  value={scanUrlInput}
                  onChange={(e) => setScanUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#0a1218] border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f97316]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Scan
                </button>
              </form>

              {scannedResult && (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  scannedResult.riskLevel === 'DANGEROUS'
                    ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                    : scannedResult.riskLevel === 'SUSPICIOUS'
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                    : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                }`}>
                  <p className="font-bold flex items-center gap-1.5">
                    {scannedResult.riskLevel === 'DANGEROUS' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                    {scannedResult.riskLevel === 'SAFE' && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    Risk Level: {scannedResult.riskLevel}
                  </p>
                  <p className="text-[11px] opacity-90">{scannedResult.details || scannedResult.reason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 7. CONTACTS TAB VIEW ── */}
        {activeTab === 'contacts' && (
          <div className="flex-1 flex flex-col overflow-y-auto px-3 py-2 space-y-2">
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider px-1">
              Registered Users ({usersList.length})
            </p>

            <div className="space-y-1">
              {usersList.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#15202b] transition border border-transparent"
                >
                  <div
                    onClick={() => {
                      if (onSelectChatTarget) onSelectChatTarget(user);
                      setActiveTab('chats');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email || user.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (onSelectChatTarget) onSelectChatTarget(user);
                        setActiveTab('chats');
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="p-2 text-slate-300 hover:text-[#f97316] hover:bg-[#f97316]/15 rounded-xl transition"
                      title="Chat"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenVoiceCall && onOpenVoiceCall(user)}
                      className="p-2 text-slate-300 hover:text-[#f97316] hover:bg-[#f97316]/15 rounded-xl transition"
                      title="Voice Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MOBILE BOTTOM NAVIGATION BAR (Image 1: Chats, Calls, Vault, Profile) ── */}
        <div className="md:hidden flex items-center justify-around py-2.5 border-t border-slate-800/80 bg-[#0d161d]/95 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold cursor-pointer relative transition-colors ${
              activeTab === 'chats' ? 'text-[#f97316]' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 stroke-[2.2]" />
              {activeTab === 'chats' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] absolute -top-0.5 -right-0.5" />
              )}
            </div>
            <span>Chats</span>
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'calls' ? 'text-[#f97316]' : 'text-slate-400'
            }`}
          >
            <Phone className="w-5 h-5 stroke-[2.2]" />
            <span>Calls</span>
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'vault' ? 'text-[#f97316]' : 'text-slate-400'
            }`}
          >
            <Lock className="w-5 h-5 stroke-[2.2]" />
            <span>Vault</span>
          </button>

          <button
            onClick={() => onOpenSettings && onOpenSettings()}
            className={`flex flex-col items-center gap-1 text-xs font-semibold cursor-pointer transition-colors text-slate-400 hover:text-white`}
          >
            <User className="w-5 h-5 stroke-[2.2]" />
            <span>Profile</span>
          </button>
        </div>

      </div>
    </div>
  );
}
