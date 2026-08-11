/**
 * API helper functions for SecureChat backend
 * Backend runs on the same origin via Vite proxy (/api → localhost:3001)
 * Includes graceful fallback to LocalStorage if backend server is offline.
 */

const API_BASE = '/api';

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

// Simple browser-compatible SHA-256 password hash helper for offline fallback
async function hashPasswordBrowser(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Offline LocalStorage DB Helpers
function getOfflineUsersDB() {
  try {
    return JSON.parse(localStorage.getItem('securechat_all_users_db') || '[]');
  } catch {
    return [];
  }
}

function saveOfflineUsersDB(users) {
  localStorage.setItem('securechat_all_users_db', JSON.stringify(users));
}

/**
 * Register a new account
 */
export async function registerUser(username, password, fullName) {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, fullName })
    });

    const data = await safeParseResponse(res);

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      // Re-throw genuine server error messages (e.g. "Username already taken")
      throw err;
    }

    // ── Fallback: LocalStorage DB ──
    const users = getOfflineUsersDB();
    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const userTag = `@${normalizedUsername}`;

    if (users.some(u => u.username === userTag)) {
      throw new Error('Username already taken. Please choose another.');
    }

    const passwordHash = await hashPasswordBrowser(password);
    const newUser = {
      id: `user_${normalizedUsername}`,
      name: fullName?.trim() || username,
      username: userTag,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      bio: '🔒 Protected by SecureChat Guard | Online',
      phone: '+1 (555) 019-8822',
      status: 'online',
      passwordHash
    };

    users.push(newUser);
    saveOfflineUsersDB(users);

    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser };
  }
}

/**
 * Login with username and password
 */
export async function loginUser(username, password) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await safeParseResponse(res);

    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      // Re-throw genuine server error messages (e.g. "Password is invalid")
      throw err;
    }

    // ── Fallback: LocalStorage DB ──
    const users = getOfflineUsersDB();
    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const userTag = `@${normalizedUsername}`;

    const user = users.find(u => u.username === userTag);
    if (!user) {
      throw new Error('Account not found. Please create an account first.');
    }

    const attemptHash = await hashPasswordBrowser(password);
    if (user.passwordHash && attemptHash !== user.passwordHash) {
      throw new Error('Password is invalid. Please try again.');
    }

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser };
  }
}

/**
 * Fetch all registered users
 */
export async function fetchAllUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`);
    const data = await safeParseResponse(res);

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch users.');
    }

    return data.users || [];
  } catch {
    // ── Fallback: LocalStorage DB ──
    const users = getOfflineUsersDB();
    return users.map(({ passwordHash, ...safe }) => safe);
  }
}

/**
 * Fetch all stored chat messages
 */
export async function fetchStoredMessages() {
  try {
    const res = await fetch(`${API_BASE}/messages`);
    const data = await safeParseResponse(res);

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch messages.');
    }

    return data.messages || [];
  } catch {
    // ── Fallback: LocalStorage DB ──
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

  // Always sync to localStorage as offline safety net
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

  // Also send to backend
  try {
    await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch {
    // Backend offline — local storage fallback already handled
  }
}


