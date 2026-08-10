import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LinkRiskModal from './components/LinkRiskModal';
import VoiceCallModal from './components/VoiceCallModal';
import VideoCallModal from './components/VideoCallModal';
import SettingsPanel from './components/SettingsPanel';
import AuthModal from './components/AuthModal';
import { DEFAULT_SETTINGS } from './utils/initialData';
import { initChannel, destroyChannel, broadcastMessage, on } from './utils/realtimeChannel';

function App() {
  // ── Auth ──
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('securechat_user');
    return saved ? JSON.parse(saved) : null;
  });

  // ── Single global chatroom messages ──
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

  // ── Mobile Responsive Sidebar State ──
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // ── PWA Install Prompt State ──
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // ── Modals ──
  const [linkModalData, setLinkModalData] = useState(null);
  const [voiceCallActive, setVoiceCallActive] = useState(false);
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
      setMessages(prev => [...prev, msg]);
    });

    // Listen for presence changes
    const unsub2 = on('presence', (users) => {
      setOnlineUsers(users);
    });

    // Listen for user joined
    const unsub3 = on('user_joined', (user) => {
      setMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        type: 'system',
        text: `${user.name} joined the chat`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    cleanupRef.current = [unsub1, unsub2, unsub3];

    return () => {
      cleanupRef.current.forEach(fn => fn());
      destroyChannel();
    };
  }, [currentUser]);

  // Announce departure on tab close
  useEffect(() => {
    const handleUnload = () => destroyChannel();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // ── Handlers ──
  const handleLogin = (user) => {
    setCurrentUser(user);
    setMessages([]);
  };

  const handleLogout = () => {
    destroyChannel();
    localStorage.removeItem('securechat_user');
    setCurrentUser(null);
    setMessages([]);
    setOnlineUsers([]);
    setShowSettings(false);
    setShowMobileSidebar(false);
  };

  const handleSendMessage = useCallback((msgPayload) => {
    if (!currentUser) return;

    const messageText = typeof msgPayload === 'string' ? msgPayload : msgPayload.text;
    const imageUrl = typeof msgPayload === 'object' ? msgPayload.imageUrl : null;

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: messageText,
      imageUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMsg]);
    broadcastMessage(newMsg);
  }, [currentUser]);

  const handleOpenLinkModal = useCallback((linkData) => {
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
    return <AuthModal onLogin={handleLogin} />;
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
          onlineUsers={onlineUsers}
          currentUser={currentUser}
          onOpenSettings={() => { setShowSettings(true); setShowMobileSidebar(false); }}
          onLogout={handleLogout}
          onCloseMobile={() => setShowMobileSidebar(false)}
          canInstallApp={!!deferredPrompt}
          onInstallApp={handleInstallApp}
        />
      </div>

      {/* Single Chat Panel */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        onOpenLinkModal={handleOpenLinkModal}
        onOpenVoiceCall={handleOpenVoiceCall}
        onOpenVideoCall={handleOpenVideoCall}
        currentUser={currentUser}
        onlineUsers={onlineUsers}
        onToggleMobileSidebar={() => setShowMobileSidebar(prev => !prev)}
      />

      {/* ── Modals ── */}
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
          onUpdateUser={setCurrentUser}
          onLogout={handleLogout}
          onClose={() => setShowSettings(false)}
          canInstallApp={!!deferredPrompt}
          onInstallApp={handleInstallApp}
        />
      )}
    </div>
  );
}

export default App;
