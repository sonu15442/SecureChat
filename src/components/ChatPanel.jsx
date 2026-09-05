import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Phone, Video, ShieldCheck, ShieldAlert, Check, CheckCheck, Lock, X, Users, Search, MessageCircle, ArrowLeft } from 'lucide-react';
import { extractUrls, analyzeUrl } from '../utils/linkDetector';
import { EMOJI_CATEGORIES } from '../utils/initialData';
import { broadcastTyping, on } from '../utils/realtimeChannel';
import { searchUsers } from '../utils/api';

export default function ChatPanel({
  messages,
  allUsers = [],
  activeChatTarget = 'global',
  onSelectChatTarget,
  onSendMessage,
  onOpenLinkModal,
  onOpenVoiceCall,
  onOpenVideoCall,
  currentUser,
  onlineUsers,
  onToggleMobileSidebar
}) {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // ── Search State ──
  const [showSearchHeader, setShowSearchHeader] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUserModal, setSearchedUserModal] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const isGlobal = !activeChatTarget || activeChatTarget === 'global';
  const targetUser = !isGlobal && typeof activeChatTarget === 'object' ? activeChatTarget : null;

  // Filter messages for current chat target (Global vs 1-on-1 Private)
  const displayedMessages = messages.filter(msg => {
    if (isGlobal) {
      return !msg.recipientId || msg.recipientId === 'global';
    } else if (targetUser) {
      return (
        (msg.senderId === currentUser.id && msg.recipientId === targetUser.id) ||
        (msg.senderId === targetUser.id && msg.recipientId === currentUser.id)
      );
    }
    return true;
  });

  useEffect(() => {
    scrollToBottom();
  }, [displayedMessages]);

  // Listen for typing indicators from other users
  useEffect(() => {
    const unsub = on('typing', ({ userId, userName, timestamp }) => {
      setTypingUsers(prev => {
        const existing = prev.filter(t => t.userId !== userId);
        return [...existing, { userId, userName, timestamp }];
      });
    });

    // Clear stale typing indicators
    const timer = setInterval(() => {
      setTypingUsers(prev => prev.filter(t => Date.now() - t.timestamp < 3000));
    }, 1000);

    return () => { unsub(); clearInterval(timer); };
  }, []);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmojiPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSelectedImage(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text && !selectedImage) return;

    onSendMessage({
      text: text || '',
      imageUrl: selectedImage || null
    });

    setInputText('');
    setSelectedImage(null);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    // Broadcast typing indicator
    if (currentUser) {
      broadcastTyping(currentUser.id, currentUser.name);
    }
  };

  const insertEmoji = (emoji) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || inputText.length;
      const newText = inputText.slice(0, start) + emoji + inputText.slice(start);
      setInputText(newText);
      setTimeout(() => {
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
      }, 10);
    } else {
      setInputText(prev => prev + emoji);
    }
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    const urls = extractUrls(text);
    if (urls.length === 0) return <span>{text}</span>;

    let result = [];
    let lastIdx = 0;

    urls.forEach((url, i) => {
      const urlIdx = text.indexOf(url, lastIdx);
      const rawIdx = urlIdx >= 0 ? urlIdx : text.indexOf(url.replace('https://', ''), lastIdx);
      const startIdx = Math.max(0, rawIdx >= 0 ? rawIdx : lastIdx);

      if (startIdx > lastIdx) {
        result.push(<span key={`t-${i}`}>{text.substring(lastIdx, startIdx)}</span>);
      }

      const analysis = analyzeUrl(url);
      result.push(
        <button
          key={`l-${i}`}
          onClick={() => onOpenLinkModal(analysis)}
          className="msg-link inline-flex items-center gap-1"
          title="Click to scan link"
        >
          {analysis.status === 'dangerous' ? (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 inline" />
          ) : analysis.status === 'suspicious' ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 inline" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
          )}
          <span>{url}</span>
        </button>
      );

      const urlInText = text.indexOf(url, lastIdx);
      if (urlInText >= 0) {
        lastIdx = urlInText + url.length;
      } else {
        const rawUrl = url.replace(/^https?:\/\//, '');
        const rawInText = text.indexOf(rawUrl, lastIdx);
        if (rawInText >= 0) {
          lastIdx = rawInText + rawUrl.length;
        } else {
          lastIdx = startIdx + url.length;
        }
      }
    });

    if (lastIdx < text.length) {
      result.push(<span key="end">{text.substring(lastIdx)}</span>);
    }

    return <>{result}</>;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'read':
        return (
          <span className="inline-flex items-center" title="Read / Seen (Blue Double Ticks)">
            <CheckCheck className="w-4 h-4 blue-tick-glow stroke-[2.5]" />
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center" title="Delivered / Recipient Online (Gray Double Ticks)">
            <CheckCheck className="w-4 h-4 text-slate-300 stroke-[2.2]" />
          </span>
        );
      case 'sent':
      default:
        return (
          <span className="inline-flex items-center" title="Sent / Recipient Offline (Single Gray Tick)">
            <Check className="w-4 h-4 text-slate-400 stroke-[2]" />
          </span>
        );
    }
  };

  const totalOnline = onlineUsers.length + 1;
  const q = searchQuery.toLowerCase().trim();
  const [serverMatchedUsers, setServerMatchedUsers] = useState([]);

  useEffect(() => {
    if (!q) {
      setServerMatchedUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(q);
        if (Array.isArray(results)) {
          setServerMatchedUsers(results.filter(u => u && u.id !== currentUser?.id));
        }
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [q, currentUser?.id]);

  // Combine currentUser and allUsers/onlineUsers plus server results for comprehensive search
  const baseUsers = currentUser
    ? [currentUser, ...allUsers.filter(u => u.id !== currentUser.id)]
    : allUsers;

  const searchMap = new Map();
  baseUsers.forEach(u => { if (u && u.id) searchMap.set(u.id, u); });
  serverMatchedUsers.forEach(u => { if (u && u.id) searchMap.set(u.id, { ...searchMap.get(u.id), ...u }); });
  const usersToSearch = Array.from(searchMap.values());

  // Search matches across all saved/registered users and messages
  const matchedUsers = q ? usersToSearch.filter(u => {
    if (!u) return false;
    const nameStr = (u.name || '').toLowerCase();
    const usernameStr = (u.username || '').toLowerCase();
    const cleanUsername = usernameStr.startsWith('@') ? usernameStr.slice(1) : usernameStr;
    const emailStr = (u.email || '').toLowerCase();
    const phoneStr = (u.phone || '').toLowerCase();
    const cleanQuery = q.startsWith('@') ? q.slice(1) : q;
    return (
      nameStr.includes(q) ||
      usernameStr.includes(q) ||
      cleanUsername.includes(cleanQuery) ||
      emailStr.includes(q) ||
      phoneStr.includes(q)
    );
  }) : [];

  const matchedMessages = q ? displayedMessages.filter(m => 
    m.text && m.text.toLowerCase().includes(q)
  ) : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)]">

      {/* ── Chat Header ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)] bg-[#0d1622]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* Mobile drawer toggle button */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition"
            title="Open Online Users"
          >
            <Users className="w-5 h-5" />
          </button>

          {isGlobal ? (
            <>
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-400/40 shadow-lg shadow-cyan-500/10">
                <ShieldCheck className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span className="gradient-text-rainbow">SecureChat Global Room</span>
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                </h2>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <Users className="w-3 h-3 text-purple-400" />
                  <span className="text-emerald-400 font-bold">{totalOnline}</span> {totalOnline === 1 ? 'user' : 'users'} online
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectChatTarget('global')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                title="Back to Global Room"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative p-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 shadow-md">
                <img
                  src={targetUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                  alt={targetUser?.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#0d1622]"
                />
                {targetUser?.isOnline || onlineUsers.some(u => u.id === targetUser?.id) ? (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full status-online border-2 border-[var(--bg-secondary)]" />
                ) : (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-500 border-2 border-[var(--bg-secondary)]" />
                )}
              </div>

              <div>
                <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>{targetUser?.name}</span>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                </h2>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span>Direct Encrypted Chat</span>
                  {targetUser?.username && <span className="text-purple-300 font-normal">• @{targetUser.username.replace('@', '')}</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isGlobal && (
            <button
              onClick={() => onSelectChatTarget('global')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cyan-300 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 hover:brightness-125 rounded-xl transition mr-1 shadow-sm"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Global Chat
            </button>
          )}

          {/* Search Icon Toggle Button */}
          <button
            id="search-toggle-btn"
            onClick={() => setShowSearchHeader(!showSearchHeader)}
            className={`p-2.5 rounded-xl transition-all border ${
              showSearchHeader
                ? 'text-cyan-300 bg-cyan-500/20 border-cyan-400/50 shadow-md'
                : 'text-slate-300 bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/80 hover:text-white'
            }`}
            title="Search Users & Messages"
          >
            <Search className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            id="voice-call-btn"
            onClick={onOpenVoiceCall}
            className="p-2.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 rounded-xl transition shadow-sm hover:scale-105"
            title="Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button 
            id="video-call-btn"
            onClick={onOpenVideoCall}
            className="p-2.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 rounded-xl transition shadow-sm hover:scale-105" 
            title="HD Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Header Slide-Down Search Bar ── */}
      {showSearchHeader && (
        <div className="px-4 py-3 bg-[var(--bg-secondary)]/95 border-b border-[var(--border-color)] animate-slide-down shadow-lg">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="chat-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users or messages..."
                className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm pl-9 pr-8 py-2 rounded-xl border border-[var(--bg-accent)]/30 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => { setShowSearchHeader(false); setSearchQuery(''); }}
              className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition"
            >
              Cancel
            </button>
          </div>

          {/* Search Dropdown / Live Results */}
          {q && (
            <div className="mt-3 max-h-60 overflow-y-auto space-y-3 pt-2 border-t border-[var(--border-color)]">
              {/* Users matching */}
              <div>
                <p className="text-[11px] font-bold text-[var(--bg-accent)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Matching Users ({matchedUsers.length})
                </p>
                {matchedUsers.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)] italic pl-2">No user matches found</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {matchedUsers.map(u => {
                      const isOnline = u.isOnline || onlineUsers.some(o => o.id === u.id);
                      return (
                        <div
                          key={u.id || u.username}
                          onClick={() => {
                            if (u.id !== currentUser.id && onSelectChatTarget) {
                              onSelectChatTarget(u);
                              setShowSearchHeader(false);
                              setSearchQuery('');
                            } else {
                              setSearchedUserModal(u);
                            }
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-tertiary)]/70 hover:bg-[var(--bg-tertiary)] cursor-pointer transition group"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            {isOnline ? (
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400" />
                            ) : (
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--bg-accent)] truncate">{u.name}</p>
                            <p className="text-[10px] text-emerald-400 truncate">
                              {u.id === currentUser.id ? 'You' : (isOnline ? 'Online • Click to Chat' : 'Saved • Click to Chat')}
                            </p>
                          </div>
                          {u.id !== currentUser.id && (
                            <MessageCircle className="w-4 h-4 text-[var(--bg-accent)] opacity-80 group-hover:scale-110 transition" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messages matching */}
              <div>
                <p className="text-[11px] font-bold text-[var(--bg-accent)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Matching Messages ({matchedMessages.length})
                </p>
                {matchedMessages.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)] italic pl-2">No message matches found</p>
                ) : (
                  <div className="space-y-1">
                    {matchedMessages.map((m, idx) => (
                      <div key={m.id || idx} className="p-2 rounded-xl bg-[var(--bg-tertiary)]/50 text-xs">
                        <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] mb-0.5">
                          <span className="font-semibold text-[var(--bg-accent)]">{m.senderName}</span>
                          <span>{m.timestamp}</span>
                        </div>
                        <p className="text-[var(--text-primary)] line-clamp-2">{m.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Profile Modal from Header Search */}
      {searchedUserModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSearchedUserModal(null)}
        >
          <div
            className="w-80 glass-modal rounded-2xl p-5 border border-[var(--border-color)] shadow-2xl animate-scale-in text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSearchedUserModal(null)}
              className="absolute top-3 right-3 p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>

            <img
              src={searchedUserModal.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
              alt={searchedUserModal.name}
              className="w-20 h-20 rounded-full object-cover mx-auto ring-4 ring-[var(--bg-accent)]/30 mb-3"
            />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{searchedUserModal.name}</h3>
            <p className="text-xs text-[var(--bg-accent)] font-medium mb-1">
              {searchedUserModal.id === currentUser.id ? 'You' : `@${(searchedUserModal.username || 'user').replace('@', '')}`}
            </p>
            {searchedUserModal.email && (
              <p className="text-[11px] text-slate-400 mb-2 truncate">{searchedUserModal.email}</p>
            )}
            {searchedUserModal.bio && (
              <p className="text-xs text-slate-300 italic mb-3 px-2">"{searchedUserModal.bio}"</p>
            )}
            
            {searchedUserModal.isOnline || onlineUsers.some(o => o.id === searchedUserModal.id) || searchedUserModal.id === currentUser.id ? (
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

            {searchedUserModal.id !== currentUser.id && (
              <button
                onClick={() => {
                  if (onSelectChatTarget) onSelectChatTarget(searchedUserModal);
                  setSearchedUserModal(null);
                  setShowSearchHeader(false);
                  setSearchQuery('');
                }}
                className="w-full py-2.5 mb-2 bg-[var(--bg-accent)] hover:bg-[var(--bg-accent-hover)] text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Start Private Chat
              </button>
            )}

            <button
              onClick={() => setSearchedUserModal(null)}
              className="w-full py-2 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 chat-bg-pattern">
        {/* Encryption & Tick Legend Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {isGlobal 
                ? 'Global Room • End-to-End Encrypted'
                : `Encrypted 1-on-1 Chat with ${targetUser?.name}`}
            </span>
          </div>

          {/* Tick Status Legend */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900/80 border border-gray-800 rounded-xl text-[10px] text-gray-300 font-medium shadow-sm">
            <span className="flex items-center gap-1" title="Sent to offline user">
              <Check className="w-3 h-3 text-slate-400" /> Sent
            </span>
            <span className="flex items-center gap-1" title="Delivered (Recipient is Online)">
              <CheckCheck className="w-3 h-3 text-slate-300 font-semibold" /> Delivered (Online)
            </span>
            <span className="flex items-center gap-1 font-bold text-sky-400" title="Read / Seen by recipient">
              <CheckCheck className="w-3 h-3 blue-tick-glow" /> Read (Seen)
            </span>
          </div>
        </div>

        <div className="space-y-3.5">
          {displayedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="w-12 h-12 text-[var(--bg-accent)]/30 mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {isGlobal ? 'No messages yet in Global Room' : `Start private chat with ${targetUser?.name}`}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {isGlobal ? 'Say hi to everyone online!' : 'Messages sent here are private between you two.'}
              </p>
            </div>
          ) : (
            displayedMessages.map((msg, idx) => {
              // System messages (user joined, etc.)
              if (msg.type === 'system') {
                return (
                  <div key={msg.id || idx} className="flex justify-center animate-message">
                    <span className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 px-3.5 py-1 rounded-full font-medium shadow-sm">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isMe = msg.senderId === currentUser?.id;
              return (
                <div
                  key={msg.id || idx}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-message`}
                  style={{ animationDelay: `${Math.min(idx * 0.02, 0.2)}s` }}
                >
                  {/* Other user's avatar */}
                  {!isMe && (
                    <div className="relative p-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mr-2.5 mt-1 shrink-0 shadow-md">
                      <img
                        src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover border border-[#0d1622]"
                      />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[82%] sm:max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xl transition-all ${
                      isMe
                        ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 text-white rounded-br-xs border border-cyan-300/30 shadow-cyan-950/40'
                        : 'bg-gradient-to-r from-[#162338] via-[#1a2942] to-[#131d2e] text-slate-100 rounded-bl-xs border border-indigo-500/30 shadow-indigo-950/40'
                    }`}
                  >
                    {/* Sender name for group/private chat */}
                    {!isMe && msg.senderName && (
                      <p className="text-[11px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-1 flex items-center gap-1">
                        <span>{msg.senderName}</span>
                      </p>
                    )}

                    {/* Photo Attachment */}
                    {msg.imageUrl && (
                      <div 
                        className="mb-2 overflow-hidden rounded-xl cursor-pointer transition-transform hover:scale-[1.02]"
                        onClick={() => setPreviewImageModal(msg.imageUrl)}
                      >
                        <img 
                          src={msg.imageUrl} 
                          alt="Shared media" 
                          className="max-h-60 rounded-xl object-cover border border-white/10"
                        />
                      </div>
                    )}

                    {/* Text Message */}
                    {msg.text && (
                      <div className="break-words whitespace-pre-wrap">{renderMessageText(msg.text)}</div>
                    )}

                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                      {isMe && getStatusIcon(msg.status)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start animate-message">
              <div className="bg-[var(--msg-in-bg)] px-4 py-3 rounded-2xl rounded-bl-md">
                <p className="text-[10px] text-[var(--bg-accent)] mb-1 font-medium">
                  {typingUsers.map(t => t.userName).join(', ')}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Image Upload Preview */}
      {selectedImage && (
        <div className="px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center gap-3">
          <div className="relative">
            <img src={selectedImage} alt="Attachment preview" className="w-14 h-14 object-cover rounded-xl border border-emerald-500/40" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-emerald-400 font-medium">Image attached ready to send</p>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] relative">

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-full left-4 mb-2 w-[340px] max-h-[360px] glass-modal rounded-2xl border border-[var(--border-color)] shadow-2xl animate-slide-up overflow-hidden flex flex-col z-50"
          >
            {/* Category tabs */}
            <div className="flex items-center gap-0.5 px-2 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 overflow-x-auto shrink-0">
              {EMOJI_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveEmojiCategory(i)}
                  className={`px-2.5 py-1.5 text-base rounded-lg transition-all shrink-0 ${
                    activeEmojiCategory === i
                      ? 'bg-[var(--bg-accent)]/20 scale-110'
                      : 'hover:bg-[var(--bg-tertiary)]'
                  }`}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              ))}
            </div>

            {/* Category label */}
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                {EMOJI_CATEGORIES[activeEmojiCategory]?.name}
              </p>
            </div>

            {/* Emoji grid */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="grid grid-cols-8 gap-0.5">
                {EMOJI_CATEGORIES[activeEmojiCategory]?.emojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    onClick={() => insertEmoji(emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-[var(--bg-tertiary)] transition-all hover:scale-125 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl transition shrink-0 border ${
              showEmojiPicker
                ? 'text-cyan-300 bg-cyan-500/20 border-cyan-400/50 shadow-md'
                : 'text-purple-400 bg-slate-800/60 border-slate-700/60 hover:bg-purple-500/15 hover:border-purple-400/40'
            }`}
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          {/* File Upload Trigger */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-cyan-400 bg-slate-800/60 border border-slate-700/60 hover:bg-cyan-500/15 hover:border-cyan-400/40 rounded-xl transition shrink-0" 
            title="Attach Photo / File"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              id="message-input"
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-[#111c29]/90 text-white placeholder:text-slate-500 text-sm px-4 py-2.5 rounded-2xl border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none resize-none max-h-32 transition-all shadow-inner"
              style={{ minHeight: '42px' }}
            />
          </div>

          <button
            id="send-btn"
            onClick={handleSend}
            disabled={!inputText.trim() && !selectedImage}
            className={`p-2.5 rounded-xl transition-all duration-200 shrink-0 ${
              inputText.trim() || selectedImage
                ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 font-bold'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
            }`}
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-[var(--text-secondary)] opacity-50">
          <ShieldCheck className="w-3 h-3" />
          <span>Protected by SecureChat Guard™ — Links auto-scanned</span>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImageModal} alt="Expanded preview" className="max-w-full max-h-[85vh] rounded-2xl border border-gray-700 shadow-2xl" />
            <button 
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-4 -right-4 p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
