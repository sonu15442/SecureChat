import express from 'express';
import dotenv from 'dotenv';
import { createHash, randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  getAllUsers,
  searchUsersInDb,
  getUserByEmail,
  createUser,
  updateUserPassword,
  upsertUser,
  updateUserProfile,
  getAllMessages,
  saveMessage,
  getDbHealth
} from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// In-memory active presence tracking across devices
const activePresenceMap = new Map(); // userId -> { user, lastSeen }
const PRESENCE_TIMEOUT_MS = 8000;

function cleanStalePresence() {
  const now = Date.now();
  for (const [userId, record] of activePresenceMap.entries()) {
    if (now - record.lastSeen > PRESENCE_TIMEOUT_MS) {
      activePresenceMap.delete(userId);
    }
  }
}

// Serve static frontend files from dist/
const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      if (path.endsWith('.html') || path.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
}

// ── Helpers ──
function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(8);
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80',
];

// ── API Routes ──

/**
 * GET /api/health/db
 * Returns MySQL connection health status
 */
app.get('/api/health/db', (req, res) => {
  res.json(getDbHealth());
});

/**
 * POST /api/auth/register
 * Body: { email, fullName }
 * Creates a new user with a generated permanent password.
 * Returns: { success: true, user, password } (password shown once)
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, fullName } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    // Check if email already exists in DB
    const existingUser = await getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }

    // Generate permanent password
    const plainPassword = generatePassword();
    const hashedPassword = hashPassword(plainPassword);

    const userTag = `@${cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

    const allUsers = await getAllUsers();
    const avatar = AVATARS[allUsers.length % AVATARS.length];

    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: fullName.trim(),
      username: userTag,
      email: cleanEmail,
      phone: '',
      avatar,
      bio: '🔒 Protected by SecureChat Guard',
      status: 'online',
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString()
    };

    await createUser(newUser);

    // Return safe user without passwordHash
    const { passwordHash, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      user: safeUser,
      password: plainPassword
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { success: true, user }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your email address.' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Please enter your password.' });
    }

    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please register first.' });
    }

    const inputHash = hashPassword(password.trim());
    if (user.passwordHash !== inputHash) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Return user data WITHOUT passwordHash
    const { passwordHash, ...safeUser } = user;

    res.status(200).json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { email }
 * Resets the user's password and generates a new permanent password.
 * Returns: { success: true, password: newPassword }
 */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Click "Register" to create a new account.' });
    }

    // Generate new permanent password
    const newPassword = generatePassword();
    const hashedPassword = hashPassword(newPassword);

    await updateUserPassword(cleanEmail, hashedPassword);

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully.',
      password: newPassword
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

/**
 * GET /api/users
 */
app.get('/api/users', async (req, res) => {
  try {
    cleanStalePresence();
    const rawUsers = await getAllUsers();
    const users = rawUsers.map(({ passwordHash, ...u }) => {
      const isOnline = activePresenceMap.has(u.id);
      const activeData = activePresenceMap.get(u.id)?.user;
      return {
        ...u,
        ...(activeData || {}),
        isOnline
      };
    });
    res.json({ users, onlineUserIds: Array.from(activePresenceMap.keys()) });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * GET /api/users/search?q=...
 * Searches registered users across database
 */
app.get('/api/users/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    cleanStalePresence();
    const rawUsers = await searchUsersInDb(q);
    const users = rawUsers.map(({ passwordHash: _discarded, ...u }) => {
      const isOnline = activePresenceMap.has(u.id);
      const activeData = activePresenceMap.get(u.id)?.user;
      return {
        ...u,
        ...(activeData || {}),
        isOnline
      };
    });
    res.json({ users });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

/**
 * POST /api/users/sync
 * Upserts a user in the server database (e.g. registered locally/offline or profile updated)
 */
app.post('/api/users/sync', async (req, res) => {
  try {
    const { user } = req.body;
    if (!user || !user.id || !user.name) {
      return res.status(400).json({ error: 'Valid user object required.' });
    }

    await upsertUser({
      ...user,
      passwordHash: user.passwordHash || hashPassword('12345678')
    });

    activePresenceMap.set(user.id, { user, lastSeen: Date.now() });
    cleanStalePresence();

    const rawUsers = await getAllUsers();
    const safeUsers = rawUsers.map(({ passwordHash, ...u }) => ({
      ...u,
      isOnline: activePresenceMap.has(u.id)
    }));

    res.status(200).json({ success: true, users: safeUsers });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync user.' });
  }
});

/**
 * POST /api/presence/heartbeat
 * Records live cross-device user presence and profile updates
 */
app.post('/api/presence/heartbeat', async (req, res) => {
  try {
    const { user } = req.body;
    if (!user || !user.id) {
      return res.status(400).json({ error: 'Valid user object required.' });
    }

    activePresenceMap.set(user.id, { user, lastSeen: Date.now() });

    // Sync profile updates to DB if needed
    if (user.name || user.avatar || user.bio !== undefined) {
      await updateUserProfile(user.id, {
        name: user.name,
        avatar: user.avatar,
        bio: user.bio
      });
    }

    cleanStalePresence();
    res.json({ success: true, onlineUserIds: Array.from(activePresenceMap.keys()) });
  } catch (err) {
    console.error('Heartbeat error:', err);
    res.status(500).json({ error: 'Heartbeat error.' });
  }
});

/**
 * POST /api/presence/leave
 */
app.post('/api/presence/leave', (req, res) => {
  const { userId } = req.body;
  if (userId) {
    activePresenceMap.delete(userId);
  }
  res.json({ success: true });
});

/**
 * GET /api/messages
 */
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await getAllMessages();
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

/**
 * POST /api/messages
 */
app.post('/api/messages', async (req, res) => {
  try {
    const message = req.body;
    if (!message || !message.id) {
      return res.status(400).json({ error: 'Invalid message payload.' });
    }

    const saved = await saveMessage(message);
    res.status(201).json({ message: saved });
  } catch (err) {
    console.error('Save message error:', err);
    res.status(500).json({ error: 'Failed to save message.' });
  }
});

// ── Catch-all: serve index.html for client-side routing ──
app.use((req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(indexPath);
  } else {
    res.status(404).send('App not built yet. Run npm run build first.');
  }
});

app.listen(PORT, async () => {
  await initDatabase();
  const users = await getAllUsers();
  console.log(`\n🔐 SecureChat Backend Server running on port ${PORT}`);
  console.log(`📦 ${users.length} registered account(s) loaded in system`);
});
