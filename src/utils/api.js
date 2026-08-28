/**
 * API helper functions for SecureChat backend
 * Handles user registration, login, user directory, and chat message storage.
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
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName })
    });

    const data = await safeParseResponse(res);

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // ── Offline Fallback ──
    const cleanEmail = email.trim().toLowerCase();

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
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await safeParseResponse(res);

    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // ── Offline Fallback ──
    const cleanEmail = email.trim().toLowerCase();
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
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await safeParseResponse(res);

    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }

    return data;
  } catch (err) {
    if (err.message !== 'BACKEND_OFFLINE' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // ── Offline Fallback ──
    const cleanEmail = email.trim().toLowerCase();
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
 * Clear all local storage database entries
 */
export function clearAllDatabaseData() {
  try {
    localStorage.removeItem('securechat_user');
    localStorage.removeItem('securechat_all_users_db');
    localStorage.removeItem('securechat_all_messages');
  } catch (e) {
    console.error('Error clearing local database:', e);
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

    const users = data.users || [];
    saveOfflineUsersDB(users);
    return users;
  } catch {
    return getOfflineUsersDB();
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
    await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch {
    // Offline handled
  }
}
