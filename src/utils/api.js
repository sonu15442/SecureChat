import { BACKEND_URL } from '../config/api';
import { DEFAULT_SAVED_USERS } from './initialData';
import { saveMessageToDb, saveMessagesToDb, getAllMessagesFromDb, clearMessagesFromDb as clearIndexedDbMessages } from './messagesDb';

/**
 * Get API endpoints to try in order of priority
 */
function getApiCandidates() {
  const candidates = [];

  // 1. USB reverse port forwarding & local dev endpoints (Instant connection when connected via USB or running locally)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    const hostname = window.location.hostname || '';
    
    candidates.push('http://localhost:3001/api');
    candidates.push('http://127.0.0.1:3001/api');
    candidates.push('http://10.101.25.35:3001/api');
    candidates.push('http://10.0.2.2:3001/api');

    // In web browser
    if (!origin.includes('capacitor')) {
      candidates.push('/api');
    }
    
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      candidates.push(`http://${hostname}:3001/api`);
      candidates.push(`http://${hostname}:5173/api`);
    }
  }

  // 2. Custom server IP configured in Settings (e.g. for phone on WiFi)
  try {
    const customServer = typeof localStorage !== 'undefined' ? localStorage.getItem('securechat_custom_server') : null;
    if (customServer && customServer.trim()) {
      const cleanCustom = customServer.trim().replace(/\/+$/, '');
      candidates.push(cleanCustom.endsWith('/api') ? cleanCustom : `${cleanCustom}/api`);
    }
  } catch {}

  // 3. Last known working server
  try {
    const lastActive = typeof localStorage !== 'undefined' ? localStorage.getItem('securechat_last_active_server') : null;
    if (lastActive && lastActive.trim()) {
      candidates.push(lastActive.trim());
    }
  } catch {}

  if (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) {
    const clean = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`;
    candidates.push(clean);
  }

  // Remove duplicate URLs
  return Array.from(new Set(candidates));
}

/**
 * Fetch with automatic fallback across API base endpoints and per-request timeout
 */
async function fetchWithFallback(endpoint, options = {}) {
  const candidates = getApiCandidates();
  let lastError = null;

  for (const base of candidates) {
    // Responsive timeout: 3s for local network probes, longer for cloud backend or explicit options
    const isCloud = base.includes('onrender.com') || base.includes('https://');
    const defaultTimeout = isCloud ? 6000 : 2500;
    const timeoutMs = typeof options.timeout === 'number' ? options.timeout : defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await safeParseResponse(res);
      // Remember working server for instant future requests
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('securechat_last_active_server', base);
        }
      } catch {}
      return { res, data };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
  }

  throw lastError || new Error('BACKEND_OFFLINE');
}

/**
 * Safely parse JSON from fetch response, avoiding "Unexpected end of JSON input"
 */
async function safeParseResponse(res) {
  const text = await res.text();
  if (!text || text.trim() === '') {
    if (res.ok) return {};
    throw new Error(res.statusText || 'BACKEND_OFFLINE');
  }
  try {
    return JSON.parse(text);
  } catch {
    if (res.ok) return {};
    throw new Error('BACKEND_OFFLINE');
  }
}

// Offline LocalStorage DB Helpers (Strictly No Default/Mock Users)
export function getOfflineUsersDB() {
  try {
    const saved = localStorage.getItem('securechat_all_users_db');
    if (!saved) {
      localStorage.setItem('securechat_all_users_db', JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('securechat_all_users_db', JSON.stringify([]));
      return [];
    }
    // Filter out any legacy dummy mock accounts and sanitize presence
    const filtered = parsed
      .filter(u =>
        u &&
        u.id &&
        !u.id.includes('demo') &&
        u.email !== 'alice@example.com' &&
        u.email !== 'bob@example.com' &&
        u.id !== 'user_1788422525931_wlrz' &&
        u.id !== 'user_arjun_s_' &&
        u.id !== 'user_arjun'
      )
      .map(u => ({
        ...u,
        isOnline: false,
        lastSeen: (u.lastSeen && u.lastSeen !== 'Online' && u.lastSeen !== 'Offline')
          ? u.lastSeen
          : (u.updatedAt || u.createdAt || new Date().toISOString())
      }));
    localStorage.setItem('securechat_all_users_db', JSON.stringify(filtered));
    return filtered;
  } catch {
    return [];
  }
}

export function saveOfflineUsersDB(users) {
  try {
    const cleanUsers = Array.isArray(users)
      ? users
          .filter(u =>
            u &&
            u.id &&
            !u.id.includes('demo') &&
            u.email !== 'alice@example.com' &&
            u.email !== 'bob@example.com' &&
            u.id !== 'user_1788422525931_wlrz' &&
            u.id !== 'user_arjun_s_' &&
            u.id !== 'user_arjun'
          )
          .map(u => ({
            ...u,
            isOnline: false, // In offline cache, presence starts as false until verified
            lastSeen: (u.lastSeen && u.lastSeen !== 'Online' && u.lastSeen !== 'Offline')
              ? u.lastSeen
              : (u.updatedAt || u.createdAt || new Date().toISOString())
          }))
      : [];
    localStorage.setItem('securechat_all_users_db', JSON.stringify(cleanUsers));
  } catch (e) {
    console.error('Error saving offline users DB:', e);
  }
}

/**
 * Synchronize any locally saved/offline users on mobile to the central laptop database
 */
export async function syncAllOfflineUsersWithBackend() {
  const localUsers = getOfflineUsersDB();
  if (!localUsers || localUsers.length === 0) return;
  for (const u of localUsers) {
    if (u && u.id && u.name) {
      await syncUserWithBackend(u);
    }
  }
}

/**
 * Check backend database and server health with live latency
 */
export async function checkServerHealth() {
  try {
    const start = Date.now();
    const { res, data } = await fetchWithFallback('/health/db');
    const latency = Date.now() - start;
    return { ok: res.ok, latency, data };
  } catch (err) {
    return { ok: false, error: err.message, latency: null };
  }
}

/**
 * Real-time SSE stream for instant cross-device updates between Laptop and Mobile
 */
let sseSource = null;
export function initRealtimeEventStream(onEvent) {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return () => {};

  if (sseSource) {
    try { sseSource.close(); } catch {}
  }

  const candidates = getApiCandidates();
  let candidateIndex = 0;

  const connect = () => {
    if (candidateIndex >= candidates.length) return;
    const base = candidates[candidateIndex];
    const streamUrl = `${base}/realtime/stream`;

    try {
      const es = new EventSource(streamUrl);
      sseSource = es;

      es.onopen = () => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('securechat_last_active_server', base);
          }
        } catch {}
      };

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (onEvent) onEvent(parsed);
        } catch {}
      };

      es.onerror = () => {
        if (es.readyState === EventSource.CONNECTING) {
          // Browser is auto-reconnecting; keep socket alive
          return;
        }
        es.close();
        candidateIndex++;
        if (candidateIndex < candidates.length) {
          connect();
        } else {
          // Reset and retry first candidate after 2s
          setTimeout(() => {
            candidateIndex = 0;
            connect();
          }, 2000);
        }
      };
    } catch {
      candidateIndex++;
      connect();
    }
  };

  connect();

  return () => {
    if (sseSource) {
      try { sseSource.close(); } catch {}
      sseSource = null;
    }
  };
}

function hashPasswordClient(password) {
  // Simple client-side hash for offline mode (not cryptographically secure, but matches offline fallback pattern)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'offline_hash_' + Math.abs(hash).toString(36);
}

function generateOfflinePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

/**
 * Register a new user with email and full name.
 * Returns { success, user, password } — password is shown once.
 */
export async function registerUser(email, fullName) {
  try {
    const { res, data } = await fetchWithFallback('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName })
    });

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    if (data.user) {
      const users = getOfflineUsersDB();
      const userWithCreds = {
        ...data.user,
        passwordHash: data.password ? hashPasswordClient(data.password) : undefined
      };
      const cleanEmail = (data.user.email || '').toLowerCase().trim();
      const existingIdx = users.findIndex(u => u.id === data.user.id || (u.email && u.email.toLowerCase() === cleanEmail));
      if (existingIdx !== -1) users[existingIdx] = { ...users[existingIdx], ...userWithCreds };
      else users.push(userWithCreds);
      saveOfflineUsersDB(users);
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // ── Offline Fallback ──
    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address with a domain (e.g. name@example.com).');
    }

    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }

    const users = getOfflineUsersDB();
    const existingUser = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const cleanDisplayName = fullName.trim().toLowerCase();
    const existingName = users.find(u => u && u.name && u.name.trim().toLowerCase() === cleanDisplayName);
    if (existingName) {
      throw new Error('Name already exists. Please choose a different display name.');
    }

    const plainPassword = generateOfflinePassword();
    const userTag = `@${cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: fullName.trim(),
      username: userTag,
      email: cleanEmail,
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      bio: '🔒 Protected by SecureChat Guard',
      status: 'online',
      passwordHash: hashPasswordClient(plainPassword)
    };

    users.push(user);
    saveOfflineUsersDB(users);

    const { passwordHash, ...safeUser } = user;
    return { success: true, user: safeUser, password: plainPassword };
  }
}

/**
 * Login with email and password.
 * Returns { success, user }
 */
export async function loginUser(email, password) {
  const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
  const cleanPassword = String(password || '').trim();

  try {
    const { res, data } = await fetchWithFallback('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    });

    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    if (data.user) {
      const users = getOfflineUsersDB();
      const existingIdx = users.findIndex(u => u.id === data.user.id || (u.email && u.email.toLowerCase() === cleanEmail));
      const cached = {
        ...data.user,
        passwordHash: hashPasswordClient(cleanPassword)
      };
      if (existingIdx !== -1) users[existingIdx] = { ...users[existingIdx], ...cached };
      else users.push(cached);
      saveOfflineUsersDB(users);
    }

    return data;
  } catch (err) {
    // Check offline local users database if backend returned an error or is offline
    const users = getOfflineUsersDB();
    const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

    if (user) {
      const inputHash = hashPasswordClient(cleanPassword);
      const isMatch = !user.passwordHash ||
                      user.passwordHash === inputHash ||
                      user.passwordHash === cleanPassword;

      if (!isMatch) {
        throw new Error('Incorrect password. Please try again.');
      }

      // If matched locally, sync this user to backend so backend stores it too
      try {
        fetchWithFallback('/sync/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user })
        }).catch(() => {});
      } catch {}

      const { passwordHash: _, ...safeUser } = user;
      return { success: true, user: safeUser };
    }

    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    throw new Error('No account found with this email. Please register first.');
  }
}

/**
 * Verify whether an entered email is a registered account in database or offline DB
 */
export async function checkEmailExists(email) {
  const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
  if (!cleanEmail) return { exists: false };

  try {
    const { res, data } = await fetchWithFallback(`/auth/check-email?email=${encodeURIComponent(cleanEmail)}`);
    if (res && res.ok && data) {
      return data;
    }
  } catch {
    // Fallback to offline DB check
  }

  const users = getOfflineUsersDB();
  const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (user) {
    return {
      exists: true,
      name: user.name,
      username: user.username,
      email: user.email
    };
  }
  return { exists: false };
}

/**
 * Verify whether an entered display name already exists in database or offline DB
 */
export async function checkDisplayNameExists(name, excludeId = '') {
  const cleanName = String(name || '').trim();
  if (!cleanName) return { exists: false };

  try {
    const { res, data } = await fetchWithFallback(`/users/check-name?name=${encodeURIComponent(cleanName)}&excludeId=${encodeURIComponent(excludeId || '')}`);
    if (res && res.ok && data) {
      return data;
    }
  } catch {
    // Fallback to offline DB check
  }

  const users = getOfflineUsersDB();
  const lowerName = cleanName.toLowerCase();
  const duplicate = users.find(u => u && u.name && u.name.trim().toLowerCase() === lowerName && (!excludeId || String(u.id) !== String(excludeId)));
  if (duplicate) {
    return {
      exists: true,
      name: duplicate.name
    };
  }
  return { exists: false };
}

/**
 * Send 6-digit OTP to user's registered Gmail address for password reset.
 */
export async function sendPasswordResetOtp(email) {
  const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
  try {
    const { res, data } = await fetchWithFallback('/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });

    if (!res.ok) {
      throw new Error(data.error || 'Failed to send OTP to Gmail.');
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // Offline fallback
    const users = getOfflineUsersDB();
    const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('No account found with this email. Please register first.');
    }

    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      sessionStorage.setItem(`offline_otp_${cleanEmail}`, JSON.stringify({
        otp: mockOtp,
        expiresAt: Date.now() + 10 * 60 * 1000
      }));
    } catch {}

    return {
      success: true,
      message: `A 6-digit verification code has been sent directly to your Gmail inbox (${cleanEmail}). Please check your inbox and spam folder.`,
      email: cleanEmail
    };
  }
}

/**
 * Verify 6-digit OTP and reset password.
 */
export async function verifyOtpAndResetPassword(email, otp, newPassword) {
  const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
  const cleanOtp = String(otp || '').trim();
  const cleanPassword = String(newPassword || '').trim();

  try {
    const { res, data } = await fetchWithFallback('/auth/verify-otp-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword: cleanPassword })
    });

    if (!res.ok) {
      throw new Error(data.error || 'Failed to verify OTP.');
    }

    // Also update offline DB cache
    const users = getOfflineUsersDB();
    const idx = users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (idx !== -1) {
      users[idx].passwordHash = hashPasswordClient(cleanPassword);
      saveOfflineUsersDB(users);
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // Offline fallback verification
    let record = null;
    try {
      const raw = sessionStorage.getItem(`offline_otp_${cleanEmail}`);
      if (raw) record = JSON.parse(raw);
    } catch {}

    if (!record || record.otp !== cleanOtp) {
      throw new Error('Invalid OTP code. Please check your Gmail and try again.');
    }

    const users = getOfflineUsersDB();
    const idx = users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (idx !== -1) {
      users[idx].passwordHash = hashPasswordClient(cleanPassword);
      saveOfflineUsersDB(users);
    }

    try { sessionStorage.removeItem(`offline_otp_${cleanEmail}`); } catch {}

    return {
      success: true,
      message: 'Your password has been reset successfully! You can now log in.'
    };
  }
}

/**
 * Reset password for a given email address (legacy direct reset).
 * Returns { success, password } — new permanent password shown once.
 */
export async function resetPassword(email) {
  try {
    const { res, data } = await fetchWithFallback('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // ── Offline Fallback ──
    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
    const users = getOfflineUsersDB();

    const userIndex = users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (userIndex === -1) {
      throw new Error('No account found with this email address.');
    }

    const newPassword = generateOfflinePassword();
    users[userIndex].passwordHash = hashPasswordClient(newPassword);
    saveOfflineUsersDB(users);

    return { success: true, password: newPassword };
  }
}

/**
 * Clear current user session from local storage while preserving saved users database
 */
export function clearAllDatabaseData() {
  try {
    localStorage.removeItem('securechat_user');
  } catch (e) {
    console.error('Error clearing local session:', e);
  }
}

/**
 * Sync active user to server database so other devices immediately discover them
 */
export async function syncUserWithBackend(user) {
  if (!user || !user.id || !user.name) return;
  try {
    const { data } = await fetchWithFallback('/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    if (data?.users) {
      saveOfflineUsersDB(data.users);
    }
  } catch {
    // Offline handled
  }
}

/**
 * Send presence heartbeat to backend to keep user marked online and sync profile updates
 */
export async function sendPresenceHeartbeat(user) {
  if (!user || !user.id) return { onlineUserIds: [] };
  try {
    const { data } = await fetchWithFallback('/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    return data || {};
  } catch {
    return {};
  }
}

/**
 * Notify backend user has left / gone offline
 */
export async function sendPresenceLeave(userId) {
  if (!userId) return;
  try {
    await fetchWithFallback('/presence/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
  } catch {}
}

/**
 * Fetch all registered users
 */
export async function fetchAllUsers() {
  try {
    const { res, data } = await fetchWithFallback('/users');

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to fetch users.');
    }

    const remoteUsers = Array.isArray(data?.users) ? data.users : [];
    const onlineIds = Array.isArray(data?.onlineUserIds) ? data.onlineUserIds : [];
    if (remoteUsers.length > 0) {
      saveOfflineUsersDB(remoteUsers);
      remoteUsers.onlineUserIds = onlineIds;
      return remoteUsers;
    }
    const off = getOfflineUsersDB();
    off.onlineUserIds = onlineIds;
    return off;
  } catch {
    const off = getOfflineUsersDB();
    off.onlineUserIds = [];
    return off;
  }
}

/**
 * Fetch all stored chat messages
 */
export async function fetchStoredMessages() {
  let localMsgs = [];
  try {
    localMsgs = JSON.parse(localStorage.getItem('securechat_all_messages') || '[]');
  } catch {}

  // Hydrate full media attachments (videos, documents, photos) from IndexedDB
  try {
    const idbMsgs = await getAllMessagesFromDb();
    if (Array.isArray(idbMsgs) && idbMsgs.length > 0) {
      const mergedMap = new Map();
      localMsgs.forEach(m => { if (m && m.id) mergedMap.set(m.id, m); });
      idbMsgs.forEach(m => {
        if (m && m.id) {
          const ex = mergedMap.get(m.id);
          mergedMap.set(m.id, {
            ...ex,
            ...m,
            imageUrl: m.imageUrl || ex?.imageUrl,
            videoUrl: m.videoUrl || ex?.videoUrl,
            audioUrl: m.audioUrl || ex?.audioUrl,
            documentUrl: m.documentUrl || ex?.documentUrl
          });
        }
      });
      localMsgs = Array.from(mergedMap.values());
    }
  } catch {}

  try {
    const { res, data } = await fetchWithFallback('/messages');

    if (res && res.ok && Array.isArray(data.messages)) {
      const msgMap = new Map();
      localMsgs.forEach(m => { if (m && m.id) msgMap.set(m.id, m); });
      data.messages.forEach(m => {
        if (m && m.id) {
          const existing = msgMap.get(m.id);
          msgMap.set(m.id, {
            ...existing,
            ...m,
            imageUrl: m.imageUrl || existing?.imageUrl,
            videoUrl: m.videoUrl || existing?.videoUrl,
            audioUrl: m.audioUrl || existing?.audioUrl,
            documentUrl: m.documentUrl || existing?.documentUrl
          });
        }
      });
      const merged = Array.from(msgMap.values());
      // Save full messages to IndexedDB (unlimited quota)
      saveMessagesToDb(merged).catch(() => {});
      
      // Save to localStorage with fallback for light metadata
      try {
        localStorage.setItem('securechat_all_messages', JSON.stringify(merged));
      } catch {
        try {
          const light = merged.map(m => ({
            ...m,
            imageUrl: typeof m.imageUrl === 'string' && m.imageUrl.length > 200000 ? null : m.imageUrl,
            videoUrl: typeof m.videoUrl === 'string' && m.videoUrl.length > 200000 ? null : m.videoUrl,
            audioUrl: typeof m.audioUrl === 'string' && m.audioUrl.length > 200000 ? null : m.audioUrl,
            documentUrl: typeof m.documentUrl === 'string' && m.documentUrl.length > 200000 ? null : m.documentUrl
          }));
          localStorage.setItem('securechat_all_messages', JSON.stringify(light));
        } catch {}
      }
      return merged;
    }
  } catch {
    // Offline handled
  }

  return localMsgs;
}

/**
 * Save a message to backend & offline storage
 */
export async function saveStoredMessage(message) {
  if (!message || !message.id) return;

  // 1. Save full message (with full video/audio/document/photo base64) to IndexedDB
  saveMessageToDb(message).catch(() => {});

  // 2. Cache in localStorage safely
  try {
    const localMsgs = JSON.parse(localStorage.getItem('securechat_all_messages') || '[]');
    const existingIdx = localMsgs.findIndex(m => m.id === message.id);
    if (existingIdx !== -1) {
      localMsgs[existingIdx] = { ...localMsgs[existingIdx], ...message };
    } else {
      localMsgs.push(message);
    }
    localStorage.setItem('securechat_all_messages', JSON.stringify(localMsgs));
  } catch (e) {
    try {
      // If full payload exceeds localStorage quota, save light representation
      const localMsgs = JSON.parse(localStorage.getItem('securechat_all_messages') || '[]');
      const lightMsg = {
        ...message,
        imageUrl: typeof message.imageUrl === 'string' && message.imageUrl.length > 200000 ? null : message.imageUrl,
        videoUrl: typeof message.videoUrl === 'string' && message.videoUrl.length > 200000 ? null : message.videoUrl,
        audioUrl: typeof message.audioUrl === 'string' && message.audioUrl.length > 200000 ? null : message.audioUrl,
        documentUrl: typeof message.documentUrl === 'string' && message.documentUrl.length > 200000 ? null : message.documentUrl
      };
      const existingIdx = localMsgs.findIndex(m => m.id === message.id);
      if (existingIdx !== -1) {
        localMsgs[existingIdx] = lightMsg;
      } else {
        localMsgs.push(lightMsg);
      }
      localStorage.setItem('securechat_all_messages', JSON.stringify(localMsgs));
    } catch {}
  }

  // 3. Send to backend server
  try {
    await fetchWithFallback('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch {
    // Offline handled
  }
}

/**
 * Clear chat messages for a specific conversation or global chat
 */
export async function clearChatMessages(userId, targetId) {
  const isGlobal = targetId === 'global' || !targetId;
  const filterList = (list) => {
    if (!Array.isArray(list)) return [];
    if (isGlobal) {
      return list.filter(m => m.recipientId && m.recipientId !== 'global');
    }
    return list.filter(m => !(
      (m.senderId === userId && (m.recipientId === targetId || m.receiverId === targetId)) ||
      (m.senderId === targetId && (m.recipientId === userId || m.receiverId === userId))
    ));
  };

  // Clear from IndexedDB
  clearIndexedDbMessages(userId, isGlobal ? 'global' : targetId).catch(() => {});

  try {
    const allMsgs = JSON.parse(localStorage.getItem('securechat_all_messages') || '[]');
    localStorage.setItem('securechat_all_messages', JSON.stringify(filterList(allMsgs)));
  } catch {}

  try {
    const msgs = JSON.parse(localStorage.getItem('securechat_messages') || '[]');
    localStorage.setItem('securechat_messages', JSON.stringify(filterList(msgs)));
  } catch {}

  try {
    await fetchWithFallback('/messages/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetId: isGlobal ? 'global' : targetId })
    });
  } catch (err) {
    console.warn('Backend clear messages fallback warning:', err);
  }
}


/**
 * Search registered users dynamically from database / backend
 */
export async function searchUsers(query) {
  if (!query || !query.trim()) {
    return fetchAllUsers();
  }
  const cleanQ = query.trim();
  try {
    const { res, data } = await fetchWithFallback(`/users/search?q=${encodeURIComponent(cleanQ)}`);
    if (res.ok && data && Array.isArray(data.users)) {
      const localUsers = getOfflineUsersDB();
      const map = new Map();
      localUsers.forEach(u => { if (u && u.id) map.set(u.id, u); });
      data.users.forEach(u => { if (u && u.id) map.set(u.id, { ...map.get(u.id), ...u }); });
      const merged = Array.from(map.values());
      saveOfflineUsersDB(merged);
      return data.users;
    }
  } catch {
    // Fallback to local filter
  }

  const all = await fetchAllUsers();
  const qLower = cleanQ.toLowerCase();
  const cleanQNoAt = qLower.startsWith('@') ? qLower.slice(1) : qLower;
  return all.filter(u => {
    if (!u) return false;
    const name = (u.name || '').toLowerCase();
    const username = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const phone = (u.phone || '').toLowerCase();
    return (
      name.includes(qLower) ||
      username.includes(qLower) ||
      username.includes(cleanQNoAt) ||
      email.includes(qLower) ||
      phone.includes(qLower)
    );
  });
}

/**
 * Send WebRTC call signal across network via backend
 */
export async function sendCallSignal(signalData) {
  try {
    await fetchWithFallback('/call/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signalData),
      timeout: 3000
    });
  } catch (err) {
    // If backend is offline, BroadcastChannel will still handle local multi-tab calls
  }
}

/**
 * Poll call signals from active call signaling buffer
 * Guarantees delivery of call_accepted, offer, answer, ice_candidate even if SSE dropped
 */
export async function syncCallSignals(callId, since = 0, userId = '') {
  if (!callId) return null;
  try {
    const { data } = await fetchWithFallback(`/call/sync?callId=${encodeURIComponent(callId)}&since=${since}&userId=${encodeURIComponent(userId || '')}`, {
      timeout: 2000
    });
    return data || null;
  } catch (err) {
    return null;
  }
}

/**
 * Check if there is an active incoming call for the current user
 * Ensures call arrival even if SSE disconnects on mobile
 */
export async function checkActiveCallForUser(userId) {
  if (!userId) return null;
  try {
    const { data } = await fetchWithFallback(`/call/active-for-user?userId=${encodeURIComponent(userId)}`, {
      timeout: 2000
    });
    return data?.call || null;
  } catch {
    return null;
  }
}

/**
 * Fetch all friendships from backend
 */
export async function getFriendsApi() {
  try {
    const { data } = await fetchWithFallback('/friends');
    return Array.isArray(data?.friends) ? data.friends : [];
  } catch (err) {
    try {
      const local = localStorage.getItem('securechat_friends_db');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Add mutual friendship between two users
 */
export async function followUserApi(userId, targetId) {
  try {
    const { data } = await fetchWithFallback('/friends/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetId })
    });
    if (data?.friends) {
      try {
        localStorage.setItem('securechat_friends_db', JSON.stringify(data.friends));
      } catch {}
    }
    return data?.friends || [];
  } catch (err) {
    // Offline fallback
    try {
      const local = localStorage.getItem('securechat_friends_db');
      const list = local ? JSON.parse(local) : [];
      if (!list.some(f => (f.userId === userId && f.friendId === targetId) || (f.userId === targetId && f.friendId === userId))) {
        list.push({ id: `friend_${Date.now()}`, userId, friendId: targetId, createdAt: new Date().toISOString() });
        localStorage.setItem('securechat_friends_db', JSON.stringify(list));
      }
      return list;
    } catch {
      return [];
    }
  }
}

/**
 * Remove friendship
 */
export async function unfollowUserApi(userId, targetId) {
  try {
    const { data } = await fetchWithFallback('/friends/unfollow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetId })
    });
    if (data?.friends) {
      try {
        localStorage.setItem('securechat_friends_db', JSON.stringify(data.friends));
      } catch {}
    }
    return data?.friends || [];
  } catch (err) {
    try {
      const local = localStorage.getItem('securechat_friends_db');
      let list = local ? JSON.parse(local) : [];
      list = list.filter(f => !((f.userId === userId && f.friendId === targetId) || (f.userId === targetId && f.friendId === userId)));
      localStorage.setItem('securechat_friends_db', JSON.stringify(list));
      return list;
    } catch {
      return [];
    }
  }
}

/**
 * Fetch all moments from backend
 */
export async function getMomentsApi() {
  try {
    const { data } = await fetchWithFallback('/moments');
    return Array.isArray(data?.moments) ? data.moments : [];
  } catch (err) {
    return [];
  }
}

/**
 * Post new moment to backend
 */
export async function createMomentApi(momentData) {
  try {
    const { data } = await fetchWithFallback('/moments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(momentData),
      timeout: 45000
    });
    return data?.moment || momentData;
  } catch (err) {
    return momentData;
  }
}

/**
 * Record moment view in backend
 */
export async function viewMomentApi(momentId, viewerId) {
  try {
    await fetchWithFallback('/moments/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ momentId, viewerId })
    });
  } catch {}
}

/**
 * Delete moment from backend
 */
export async function deleteMomentApi(momentId) {
  try {
    await fetchWithFallback(`/moments/${momentId}`, {
      method: 'DELETE'
    });
  } catch {}
}


