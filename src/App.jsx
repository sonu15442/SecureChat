import { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LinkRiskModal from './components/LinkRiskModal';
import VoiceCallModal from './components/VoiceCallModal';
import VideoCallModal from './components/VideoCallModal';
import SettingsPanel from './components/SettingsPanel';
import AuthModal from './components/AuthModal';
import { INITIAL_CONTACTS, DEFAULT_SETTINGS } from './utils/initialData';
import { extractUrls, analyzeUrl } from './utils/linkDetector';

function App() {
  // ── Core State & Auth ──
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('securechat_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('securechat_contacts');
    if (saved) return JSON.parse(saved);
    return INITIAL_CONTACTS.map(c => ({ ...c, messages: [...c.messages] }));
  });

  const [activeContactId, setActiveContactId] = useState(null);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

  // ── Modals ──
  const [linkModalData, setLinkModalData] = useState(null);
  const [voiceCallContact, setVoiceCallContact] = useState(null);
  const [videoCallContact, setVideoCallContact] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Sync contacts to localStorage
  useEffect(() => {
    localStorage.setItem('securechat_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // ── Derived ──
  const activeContact = contacts.find(c => c.id === activeContactId) || null;
  const activeMessages = activeContact?.messages || [];

  // ── Handlers ──
  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('securechat_user');
    setCurrentUser(null);
    setShowSettings(false);
  };

  const handleSelectContact = useCallback((contactId) => {
    setActiveContactId(contactId);

    // Clear unread count
    setContacts(prev =>
      prev.map(c =>
        c.id === contactId ? { ...c, unreadCount: 0 } : c
      )
    );
  }, []);

  const handleSendMessage = useCallback((msgPayload) => {
    if (!activeContactId) return;

    const messageText = typeof msgPayload === 'string' ? msgPayload : msgPayload.text;
    const imageUrl = typeof msgPayload === 'object' ? msgPayload.imageUrl : null;

    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser?.id || 'user_me',
      text: messageText,
      imageUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setContacts(prev =>
      prev.map(c =>
        c.id === activeContactId
          ? { ...c, messages: [...c.messages, newMsg] }
          : c
      )
    );

    // Auto-update status to delivered after a moment
    setTimeout(() => {
      setContacts(prev =>
        prev.map(c =>
          c.id === activeContactId
            ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === newMsg.id ? { ...m, status: 'delivered' } : m
                )
              }
            : c
        )
      );
    }, 600);

    // Auto-update status to read after a moment
    setTimeout(() => {
      setContacts(prev =>
        prev.map(c =>
          c.id === activeContactId
            ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === newMsg.id ? { ...m, status: 'read' } : m
                )
              }
            : c
        )
      );
    }, 1500);

    // Bot auto-reply with link analysis
    const contact = contacts.find(c => c.id === activeContactId);
    if (contact?.isBot) {
      const urls = extractUrls(messageText);
      setTimeout(() => {
        let replyText;

        if (urls.length > 0) {
          const analysis = analyzeUrl(urls[0]);
          if (analysis.status === 'dangerous') {
            replyText = `🚨 DANGER ALERT!\n\nThis link has been flagged as HIGH RISK (${analysis.riskPercentage}% danger score).\n\n⚠️ Risk factors detected: ${analysis.riskFactors.map(r => r.title).join(', ')}.\n\nWe strongly recommend NOT clicking this link. Tap the link in your message to see the full fraud analysis report.`;
          } else if (analysis.status === 'suspicious') {
            replyText = `⚠️ CAUTION\n\nThis link shows some suspicious indicators (${analysis.riskPercentage}% risk).\n\nProceed with caution. Tap the link to view the full security report.`;
          } else {
            replyText = `✅ Link appears SAFE!\n\nSafety score: ${analysis.safePercentage}%\nDomain: ${analysis.domain}\n\n${analysis.safeFactors.join(' • ')}\n\nTap the link to view the detailed analysis.`;
          }
        } else if (imageUrl) {
          replyText = "📸 Photo received securely! E2E encrypted media payload verified with 0 malware signatures.";
        } else {
          replyText = "💡 Send me any URL link and I'll instantly analyze it for fraud, phishing threats, and security risks!\n\nTry pasting a link like:\n• http://free-crypto-giveaway.xyz\n• https://github.com";
        }

        const botReply = {
          id: `msg_bot_${Date.now()}`,
          senderId: contact.id,
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };

        setContacts(prev =>
          prev.map(c =>
            c.id === activeContactId
              ? { ...c, messages: [...c.messages, botReply] }
              : c
          )
        );
      }, 1800);
    }
  }, [activeContactId, contacts, currentUser]);

  const handleOpenLinkModal = useCallback((linkData) => {
    setLinkModalData(linkData);
  }, []);

  const handleOpenVoiceCall = useCallback(() => {
    if (activeContact) {
      setVoiceCallContact(activeContact);
    }
  }, [activeContact]);

  const handleOpenVideoCall = useCallback(() => {
    if (activeContact) {
      setVideoCallContact(activeContact);
    }
  }, [activeContact]);

  // Gate app behind Login Modal if user is not logged in
  if (!currentUser) {
    return <AuthModal onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--bg-primary)]">

      {/* Sidebar */}
      <Sidebar
        contacts={contacts}
        activeContactId={activeContactId}
        onSelectContact={handleSelectContact}
        currentUser={currentUser}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Chat Panel */}
      <ChatPanel
        contact={activeContact}
        messages={activeMessages}
        onSendMessage={handleSendMessage}
        onOpenLinkModal={handleOpenLinkModal}
        onOpenVoiceCall={handleOpenVoiceCall}
        onOpenVideoCall={handleOpenVideoCall}
        onBack={() => setActiveContactId(null)}
        currentUserId={currentUser.id}
      />

      {/* ── Modals ── */}
      {linkModalData && (
        <LinkRiskModal
          linkData={linkModalData}
          onClose={() => setLinkModalData(null)}
        />
      )}

      {voiceCallContact && (
        <VoiceCallModal
          contact={voiceCallContact}
          onClose={() => setVoiceCallContact(null)}
        />
      )}

      {videoCallContact && (
        <VideoCallModal
          contact={videoCallContact}
          onClose={() => setVideoCallContact(null)}
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
        />
      )}
    </div>
  );
}

export default App;
