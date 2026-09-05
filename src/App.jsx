import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LinkRiskModal from './components/LinkRiskModal';
import VoiceCallModal from './components/VoiceCallModal';
import VideoCallModal from './components/VideoCallModal';
import SettingsPanel from './components/SettingsPanel';
import AuthModal from './components/AuthModal';
import StatusModal from './components/StatusModal';
import StatusViewerModal from './components/StatusViewerModal';
import LiveTestReporter from './components/LiveTestReporter';
import { DEFAULT_SETTINGS } from './utils/initialData';
import { initChannel, destroyChannel, broadcastMessage, broadcastReadReceipt, broadcastUserUpdated, on } from './utils/realtimeChannel';
import { fetchAllUsers, fetchStoredMessages, saveStoredMessage, clearAllDatabaseData, syncUserWithBackend, sendPresenceHeartbeat, sendPresenceLeave, getOfflineUsersDB } from './utils/api';
import { getActiveStatuses } from './utils/statusManager';
import { recordAction } from './utils/testRecorder';

function App() {
  // ── Auth ──
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('securechat_user');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // ── Statuses & Music Stories State ──
  const [statuses, setStatuses] = useState(() => getActiveStatuses());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeStatusViewerGroup, setActiveStatusViewerGroup] = useState(null);

  // ── Registered Users Directory (seeded from saved DB & synced from backend) ──
  const [registeredUsers, setRegisteredUsers] = useState(() => getOfflineUsersDB());

  // ── Messages & Presence State ──
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

  // ── Active Chat Target ('global' or User object) ──
  const [activeChatTarget, setActiveChatTarget] = useState('global');
  const [unreadCounts, setUnreadCounts] = useState({});

  // ── Mobile Responsive Sidebar State ──
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // ── PWA Install Prompt State ──
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // ── Modals ──
  const [linkModalData, setLinkModalData] = useState(null);
  const [voiceCallActive, setVoiceCallActive] = useState(false);
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const activeChatTargetRef = useRef(activeChatTarget);
  useEffect(() => {
    activeChatTargetRef.current = activeChatTarget;
  }, [activeChatTarget]);

  // Catch PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // ── Real-time channel setup ──
  const cleanupRef = useRef([]);

  useEffect(() => {
    if (!currentUser) return;

    initChannel(currentUser);

    // Listen for messages from other users
    const unsub1 = on('message', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      saveStoredMessage(msg);

      if (msg.senderId !== currentUser.id) {
        const currentTarget = activeChatTargetRef.current;
        const isViewing = currentTarget && (
          (currentTarget === 'global' && (!msg.recipientId || msg.recipientId === 'global')) ||
          (currentTarget.id === msg.senderId && msg.recipientId === currentUser.id)
        );

        const newStatus = isViewing ? 'read' : 'delivered';
        broadcastReadReceipt([msg.id], newStatus, currentUser.id, msg.senderId);

        // If not actively viewing that chat, track unread count
        if (!isViewing && msg.recipientId && msg.recipientId === currentUser.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.senderId]: (prev[msg.senderId] || 0) + 1
          }));
        }
      }
    });

    // Listen for read receipts
    const unsub2 = on('read_receipt', ({ messageIds, status }) => {
      setMessages(prev => prev.map(m => {
        if (messageIds && messageIds.includes(m.id)) {
          return { ...m, status };
        }
        return m;
      }));
    });

    // Listen for presence changes & auto-upgrade sent messages to delivered for online users
    const unsub3 = on('presence', (users) => {
      setOnlineUsers(users);
      const onlineIds = users.map(u => u.id);
      setMessages(prev => prev.map(m => {
        if (m.senderId === currentUser.id && m.status === 'sent') {
          if (m.recipientId === 'global' || onlineIds.includes(m.recipientId)) {
            return { ...m, status: 'delivered' };
          }
        }
        return m;
      }));
    });

    // Listen for user joined
    const unsub4 = on('user_joined', (user) => {
      setMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        type: 'system',
        text: `${user.name} joined the chat`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    // Listen for profile updates in other tabs
    const unsub5 = on('user_updated', (user) => {
      setRegisteredUsers(prev => {
        const idx = prev.findIndex(u => u.id === user.id);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...user };
          return copy;
        }
        return [...prev, user];
      });
    });

    cleanupRef.current = [unsub1, unsub2, unsub3, unsub4, unsub5];

    return () => {
      cleanupRef.current.forEach(fn => fn());
      destroyChannel();
    };
  }, [currentUser]);

  // Server-side cross-device presence heartbeat
  useEffect(() => {
    if (!currentUser) return;

    const ping = async () => {
      await sendPresenceHeartbeat(currentUser);
    };

    ping();
    const heartbeatInterval = setInterval(ping, 3000);

    return () => {
      clearInterval(heartbeatInterval);
      sendPresenceLeave(currentUser.id);
    };
  }, [currentUser]);

  // Announce departure on tab close & periodically clean up expired 24h statuses
  useEffect(() => {
    const handleUnload = () => {
      destroyChannel();
      if (currentUser?.id) sendPresenceLeave(currentUser.id);
    };
    window.addEventListener('beforeunload', handleUnload);

    const statusTimer = setInterval(() => {
      setStatuses(getActiveStatuses());
    }, 60000); // Auto-purge expired 24h statuses every minute

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      clearInterval(statusTimer);
    };
  }, [currentUser?.id]);

  // ── Combine registered users & online users reactively ──
  const allAvailableUsers = useMemo(() => {
    const userMap = new Map();
    registeredUsers.forEach(u => {
      if (u && u.id && u.id !== currentUser?.id) {
        userMap.set(u.id, { ...u, isOnline: !!u.isOnline });
      }
    });
    onlineUsers.forEach(u => {
      if (u && u.id && u.id !== currentUser?.id) {
        const existing = userMap.get(u.id);
        userMap.set(u.id, { ...existing, ...u, isOnline: true });
      }
    });
    return Array.from(userMap.values());
  }, [registeredUsers, onlineUsers, currentUser?.id]);

  // Fetch registered users from backend
  const loadRegisteredUsers = useCallback(async () => {
    try {
      const users = await fetchAllUsers();
      if (Array.isArray(users)) {
        setRegisteredUsers(prev => {
          if (prev.length === users.length && JSON.stringify(prev) === JSON.stringify(users)) {
            return prev;
          }
          return users;
        });
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  // Fetch stored messages from backend
  const loadStoredMessages = useCallback(async () => {
    try {
      const history = await fetchStoredMessages();
      if (history && history.length > 0) {
        setMessages(prev => {
          // Merge history without duplicating existing messages
          const existingIds = new Set(prev.map(m => m.id));
          const newOnes = history.filter(m => !existingIds.has(m.id));
          if (newOnes.length === 0) return prev;
          return [...prev, ...newOnes];
        });
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  // Load users & messages on mount and poll periodically for dynamic sync
  useEffect(() => {
    if (!currentUser) return;
    
    loadRegisteredUsers();
    loadStoredMessages();

    // Auto-sync every 3 seconds so new registered users, profiles & messages sync seamlessly
    const syncInterval = setInterval(() => {
      loadRegisteredUsers();
      loadStoredMessages();
    }, 3000);

    const handleFocus = () => {
      loadRegisteredUsers();
      loadStoredMessages();
      sendPresenceHeartbeat(currentUser);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser, loadRegisteredUsers, loadStoredMessages]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setActiveChatTarget('global');
    syncUserWithBackend(user);
    sendPresenceHeartbeat(user);
    // Refresh user list and load message history after login
    loadRegisteredUsers();
    loadStoredMessages();
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('securechat_user', JSON.stringify(updatedUser));
    broadcastUserUpdated(updatedUser);
    syncUserWithBackend(updatedUser);
    sendPresenceHeartbeat(updatedUser);
    loadRegisteredUsers();
  };

  const handleLogout = () => {
    recordAction('Session Management', 'User logs out and returns to the login screen');
    if (currentUser?.id) sendPresenceLeave(currentUser.id);
    destroyChannel();
    clearAllDatabaseData();
    setCurrentUser(null);
    setRegisteredUsers([]);
    setMessages([]);
    setOnlineUsers([]);
    setShowSettings(false);
    setShowMobileSidebar(false);
    setActiveChatTarget('global');
  };

  const handleSelectChatTarget = useCallback((target) => {
    setActiveChatTarget(target);
    const targetName = target === 'global' ? 'Global Chat' : (target?.name || 'Contact');
    recordAction('Navigation', `User opens conversation with ${targetName}`);

    if (currentUser && target && target.id && target !== 'global') {
      // Clear unread count for selected target user
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[target.id];
        return updated;
      });

      // Mark any unread messages from this target user as 'read'
      setMessages(prev => {
        const unreadIds = prev
          .filter(m => m.senderId === target.id && m.recipientId === currentUser.id && m.status !== 'read')
          .map(m => m.id);

        if (unreadIds.length > 0) {
          broadcastReadReceipt(unreadIds, 'read', currentUser.id, target.id);
          return prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m);
        }
        return prev;
      });
    }
  }, [currentUser]);

  const handleSendMessage = useCallback((msgPayload) => {
    if (!currentUser) return;

    recordAction('CRUD Operations', 'User sends end-to-end encrypted message');

    const messageText = typeof msgPayload === 'string' ? msgPayload : msgPayload.text;
    const imageUrl = typeof msgPayload === 'object' ? msgPayload.imageUrl : null;
    const recipientId = activeChatTarget && activeChatTarget !== 'global' ? activeChatTarget.id : 'global';

    // Determine initial status: if recipient is online (or in global chat with online users), set 'delivered' (double ticks)
    let initialStatus = 'sent';
    if (recipientId === 'global') {
      initialStatus = onlineUsers.length > 0 ? 'delivered' : 'sent';
    } else {
      const isRecipientOnline = onlineUsers.some(u => u.id === recipientId);
      initialStatus = isRecipientOnline ? 'delivered' : 'sent';
    }

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      recipientId,
      text: messageText,
      imageUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: initialStatus
    };

    setMessages(prev => [...prev, newMsg]);
    broadcastMessage(newMsg);
    saveStoredMessage(newMsg);
  }, [currentUser, activeChatTarget, onlineUsers]);

  const handleOpenLinkModal = useCallback((linkData) => {
    recordAction('Input Validation', 'Security scanner flags link and opens safety advisory');
    setLinkModalData(linkData);
  }, []);

  const handleOpenVoiceCall = useCallback(() => {
    setVoiceCallActive(true);
  }, []);

  const handleOpenVideoCall = useCallback(() => {
    setVideoCallActive(true);
  }, []);

  // Gate app behind Login Modal
  if (!currentUser) {
    return (
      <>
        <AuthModal onLogin={handleLogin} />
        <LiveTestReporter />
      </>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--bg-primary)] relative">

      {/* Sidebar — Mobile Overlay Backdrop */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar — Desktop static & Mobile drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-40 md:relative md:z-auto transition-transform duration-300 ease-in-out
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          allUsers={allAvailableUsers}
          onlineUsers={onlineUsers}
          currentUser={currentUser}
          activeChatTarget={activeChatTarget}
          onSelectChatTarget={handleSelectChatTarget}
          unreadCounts={unreadCounts}
          onOpenSettings={() => { setShowSettings(true); setShowMobileSidebar(false); }}
          onLogout={handleLogout}
          onCloseMobile={() => setShowMobileSidebar(false)}
          canInstallApp={!!deferredPrompt}
          onInstallApp={handleInstallApp}
          statuses={statuses}
          onOpenStatusModal={() => { setShowStatusModal(true); setShowMobileSidebar(false); }}
          onOpenStatusViewer={(group) => { setActiveStatusViewerGroup(group); setShowMobileSidebar(false); }}
        />
      </div>

      {/* Chat Panel */}
      <ChatPanel
        messages={messages}
        allUsers={allAvailableUsers}
        activeChatTarget={activeChatTarget}
        onSelectChatTarget={handleSelectChatTarget}
        onSendMessage={handleSendMessage}
        onOpenLinkModal={handleOpenLinkModal}
        onOpenVoiceCall={handleOpenVoiceCall}
        onOpenVideoCall={handleOpenVideoCall}
        currentUser={currentUser}
        onlineUsers={onlineUsers}
        onToggleMobileSidebar={() => setShowMobileSidebar(prev => !prev)}
      />

      {/* ── Modals ── */}
      {showStatusModal && (
        <StatusModal
          currentUser={currentUser}
          onClose={() => setShowStatusModal(false)}
          onStatusCreated={() => setStatuses(getActiveStatuses())}
        />
      )}

      {activeStatusViewerGroup && (
        <StatusViewerModal
          statusGroup={activeStatusViewerGroup}
          currentUserId={currentUser?.id}
          allUsers={allAvailableUsers}
          onDeleteStatus={(_statusId) => {
            setStatuses(getActiveStatuses());
          }}
          onClose={() => {
            setActiveStatusViewerGroup(null);
            setStatuses(getActiveStatuses());
          }}
        />
      )}

      {linkModalData && (
        <LinkRiskModal
          linkData={linkModalData}
          onClose={() => setLinkModalData(null)}
        />
      )}

      {voiceCallActive && (
        <VoiceCallModal
          onClose={() => setVoiceCallActive(false)}
        />
      )}

      {videoCallActive && (
        <VideoCallModal
          onClose={() => setVideoCallActive(false)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdateSettings={setSettings}
          currentUser={currentUser}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
          onClose={() => setShowSettings(false)}
          canInstallApp={!!deferredPrompt}
          onInstallApp={handleInstallApp}
        />
      )}

      {/* Live Selenium Test Suite Reporter */}
      <LiveTestReporter />
    </div>
  );
}

export default App;
