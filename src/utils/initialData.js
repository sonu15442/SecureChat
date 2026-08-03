export const DEFAULT_USER = {
  id: 'user_me',
  name: 'Alex Rivera',
  username: '@alex_rivera',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  bio: '🔒 Protected by SecureChat Guard | Always stay safe online! ✨',
  phone: '+1 (555) 019-2834',
  status: 'online'
};

export const INITIAL_CONTACTS = [
  {
    id: 'contact_bot',
    name: 'SecureChat Guard Bot 🛡️',
    username: '@security_shield',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=250&q=80',
    bio: 'Official Automated Fraud & Cyber Security Assistant.',
    status: 'online',
    isBot: true,
    unreadCount: 1,
    lastSeen: 'Online',
    messages: [
      {
        id: 'msg_b1',
        senderId: 'contact_bot',
        text: 'Welcome to SecureChat! 🛡️ Send any link here or in any chat to instantly detect fraud, phishing threats, safe % and risk %!',
        timestamp: '10:00 AM',
        status: 'read'
      },
      {
        id: 'msg_b2',
        senderId: 'contact_bot',
        text: 'Try sending: http://free-crypto-giveaway-claim-now.xyz/login or https://github.com to see real-time analysis!',
        timestamp: '10:01 AM',
        status: 'read'
      }
    ]
  },
  {
    id: 'contact_sonu',
    name: 'Sonu 💻 (Lead Developer)',
    username: '@sonu_dev',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    bio: 'Creator & Lead Architect of SecureChat 🚀',
    status: 'online',
    unreadCount: 2,
    lastSeen: 'Online',
    messages: [
      {
        id: 'msg_s1',
        senderId: 'contact_sonu',
        text: 'Hey Alex! Welcome to SecureChat. I built this app with custom real-time fraud link detection, HD voice/video calls, and sleek dark mode theme.',
        timestamp: '10:15 AM',
        status: 'read'
      },
      {
        id: 'msg_s2',
        senderId: 'contact_sonu',
        text: 'Check out the settings at the bottom for developer details! Try out the link scanner with this test link: http://paypaI-security-verify-login.net/claim-reward',
        timestamp: '10:16 AM',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'contact_alice',
    name: 'Alice Smith',
    username: '@alice_s',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    bio: 'Designing digital experiences ✨ | Coffee lover ☕',
    status: 'online',
    unreadCount: 0,
    lastSeen: 'Online',
    messages: [
      {
        id: 'msg_a1',
        senderId: 'contact_alice',
        text: 'Hey Alex, check out this documentation page for our design system:',
        timestamp: '09:30 AM',
        status: 'read'
      },
      {
        id: 'msg_a2',
        senderId: 'contact_alice',
        text: 'https://google.com',
        timestamp: '09:31 AM',
        status: 'read'
      },
      {
        id: 'msg_a3',
        senderId: 'user_me',
        text: 'Thanks Alice! Looks super clean.',
        timestamp: '09:33 AM',
        status: 'read'
      }
    ]
  },
  {
    id: 'contact_david',
    name: 'David Miller',
    username: '@david_m',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    bio: 'Cybersecurity Analyst 🔒',
    status: 'offline',
    unreadCount: 0,
    lastSeen: 'Yesterday at 8:45 PM',
    messages: [
      {
        id: 'msg_d1',
        senderId: 'contact_david',
        text: 'Hey man, someone sent me this weird link claiming I won $10,000:',
        timestamp: 'Yesterday',
        status: 'read'
      },
      {
        id: 'msg_d2',
        senderId: 'contact_david',
        text: 'http://192.168.1.100/free-gift-card-claim.xyz/login',
        timestamp: 'Yesterday',
        status: 'read'
      }
    ]
  }
];

export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=250&q=80'
];

export const DEFAULT_SETTINGS = {
  linkSecurity: 'strict', // 'strict', 'balanced', 'basic'
  autoScanLinks: true,
  blockHighRiskLinks: true,
  soundEnabled: true,
  notifications: true,
  theme: 'cyber-dark', // 'cyber-dark', 'emerald-dark', 'light'
  readReceipts: true,
  lastSeenPrivacy: 'everyone'
};
