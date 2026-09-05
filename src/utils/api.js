import { BACKEND_URL } from '../config/api';
import { DEFAULT_SAVED_USERS } from './initialData';

/**
 * Get API endpoints to try in order of priority
 */
function getApiCandidates() {
  const candidates = [];
  if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    const hostname = window.location.hostname || '';
    
    // In browser on localhost or local IP
    if (!origin.includes('capacitor')) {
      candidates.push('/api');
    }
    
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      candidates.push(`http://${hostname}:3001/api`);
      candidates.push(`http://${hostname}:5173/api`);
    }
    candidates.push('http://localhost:3001/api');
    candidates.push('http://127.0.0.1:3001/api');
    candidates.push('http://10.15.104.35:3001/api');
  }

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await safeParseResponse(res);
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
    throw new Error('BACKEND_OFFLINE');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('BACKEND_OFFLINE');
  }
}

// Offline LocalStorage DB Helpers
export function getOfflineUsersDB() {
  try {
    const saved = localStorage.getItem('securechat_all_users_db');
    if (!saved) {
      localStorage.setItem('securechat_all_users_db', JSON.stringify(DEFAULT_SAVED_USERS));
      return DEFAULT_SAVED_USERS;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('securechat_all_users_db', JSON.stringify(DEFAULT_SAVED_USERS));
      return DEFAULT_SAVED_USERS;
    }
    // Filter out any fake demo mock users (Alice, Bob, etc.)
    const filtered = parsed.filter(u =>
      u &&
      u.id &&
      !u.id.includes('demo') &&
      u.email !== 'alice@example.com' &&
      u.email !== 'bob@example.com'
    );
    const userMap = new Map();
    DEFAULT_SAVED_USERS.forEach(u => { if (u?.id) userMap.set(u.id, u); });
    filtered.forEach(u => { if (u?.id) userMap.set(u.id, { ...userMap.get(u.id), ...u }); });
    const result = Array.from(userMap.values());
    localStorage.setItem('securechat_all_users_db', JSON.stringify(result));
    return result;
  } catch {
    return DEFAULT_SAVED_USERS;
  }
}

export function saveOfflineUsersDB(users) {
  try {
    localStorage.setItem('securechat_all_users_db', JSON.stringify(users));
  } catch (e) {
    console.error('Error saving offline users DB:', e);
  }
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
      const existingIdx = users.findIndex(u => u.id === data.user.id);
      if (existingIdx !== -1) users[existingIdx] = data.user;
      else users.push(data.user);
      saveOfflineUsersDB(users);
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // ── Offline Fallback ──
    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      throw new Error('Invalid email address format.');
    }

    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }

    const users = getOfflineUsersDB();
    const existingUser = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      throw new Error('An account with this email already exists. Please sign in instead.');
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
  try {
    const { res, data } = await fetchWithFallback('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    if (data.user) {
      const users = getOfflineUsersDB();
      const existingIdx = users.findIndex(u => u.id === data.user.id);
      if (existingIdx !== -1) users[existingIdx] = data.user;
      else users.push(data.user);
      saveOfflineUsersDB(users);
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // ── Offline Fallback ──
    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
    const users = getOfflineUsersDB();

    const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('No account found with this email. Please register first.');
    }

    const inputHash = hashPasswordClient(password.trim());
    if (user.passwordHash !== inputHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    const { passwordHash, ...safeUser } = user;
    return { success: true, user: safeUser };
  }
}

/**
 * Reset password for a given email address.
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
  // Attempt to sync current user from local storage to backend database
  try {
    const saved = localStorage.getItem('securechat_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id) {
        syncUserWithBackend(parsed);
      }
    }
  } catch {
    // Ignore JSON errors
  }

  try {
    const { res, data } = await fetchWithFallback('/users');

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch users.');
    }

    const remoteUsers = data.users || [];
    const localUsers = getOfflineUsersDB();

    // Merge remote users with local offline database
    const map = new Map();
    localUsers.forEach(u => { if (u && u.id) map.set(u.id, u); });
    remoteUsers.forEach(u => { if (u && u.id) map.set(u.id, { ...map.get(u.id), ...u }); });
    const merged = Array.from(map.values());
    saveOfflineUsersDB(merged);
    return merged;
  } catch {
    return getOfflineUsersDB();
  }
}

/**
 * Fetch all stored chat messages
 */
export async function fetchStoredMessages() {
  try {
    const { res, data } = await fetchWithFallback('/messages');

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch messages.');
    }

    const messages = data.messages || [];
    localStorage.setItem('securechat_all_messages', JSON.stringify(messages));
    return messages;
  } catch {
    try {
      return JSON.parse(localStorage.getItem('securechat_all_messages') || '[]');
    } catch {
      return [];
    }
  }
}

/**
 * Save a message to backend & offline storage
 */
export async function saveStoredMessage(message) {
  if (!message || !message.id) return;

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
    console.error('LocalStorage message save error:', e);
  }

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

