import express from 'express';
import nodemailer from 'nodemailer';
import { createHash, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import {
  getAllUsers,
  searchUsersInDb,
  getUserByEmail,
  getUserByDisplayName,
  createUser,
  updateUserPassword,
  upsertUser,
  updateUserProfile,
  clearAllUsersFromDb,
  updateUserLastSeen
} from '../db.js';
import { activePresenceMap, PRESENCE_TIMEOUT_MS, broadcastEvent } from './sharedState.js';

export const userRouter = express.Router();

const passwordResetOtpStore = new Map();

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function hashPasswordClient(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'offline_hash_' + Math.abs(hash).toString(36);
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

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!regex.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false;
  const tld = domain.split('.').pop();
  return tld && tld.length >= 2;
}

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80',
];

// Nodemailer transporter
let mailerTransporter = null;
try {
  mailerTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER || 'mcsonu143@gmail.com',
      pass: process.env.SMTP_PASS || 'dptm jwcb fdfk nqwb'
    }
  });
} catch {}

/**
 * POST /api/auth/register
 */
userRouter.post('/api/auth/register', async (req, res) => {
  try {
    const { email, fullName } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address with a domain (e.g. name@example.com).' });
    }

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    const existingUser = await getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }

    const cleanDisplayName = fullName.trim();
    const existingNameUser = await getUserByDisplayName(cleanDisplayName);
    if (existingNameUser) {
      return res.status(409).json({ error: 'Name already exists. Please choose a different display name.' });
    }

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
    const { passwordHash, ...safeUser } = newUser;

    broadcastEvent('user_registered', { user: safeUser });
    getAllUsers().then(all => {
      const safeUsers = all.map(({ passwordHash: _, ...u }) => ({
        ...u,
        isOnline: activePresenceMap.has(u.id)
      }));
      broadcastEvent('users_updated', { users: safeUsers });
    }).catch(() => {});

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
 */
userRouter.post('/api/auth/login', async (req, res) => {
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

    const cleanInputPassword = password.trim();
    const inputHash = hashPassword(cleanInputPassword);
    const clientHash = hashPasswordClient(cleanInputPassword);

    const matchSha256 = user.passwordHash === inputHash;
    const matchClient = user.passwordHash === clientHash;
    const matchPlain = user.passwordHash === cleanInputPassword;

    if (!matchSha256 && !matchClient && !matchPlain) {
      return res.status(401).json({ error: 'Incorrect password. Please try again or reset your password.' });
    }

    // Auto-upgrade client hash or plaintext to SHA-256
    if (!matchSha256) {
      await updateUserPassword(user.id, inputHash);
    }

    activePresenceMap.set(user.id, {
      user: { id: user.id, name: user.name, email: user.email, username: user.username },
      lastSeen: Date.now()
    });

    const { passwordHash, ...safeUser } = user;
    const onlineUserIds = Array.from(activePresenceMap.keys());
    broadcastEvent('presence', { onlineUserIds });

    res.json({
      success: true,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/check-email
 */
userRouter.get('/api/auth/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email query parameter required.' });
    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);
    res.json({
      registered: !!user,
      exists: !!user,
      email: cleanEmail,
      user: user ? { id: user.id, name: user.name, username: user.username } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Error checking email.' });
  }
});

/**
 * POST /api/auth/send-otp
 */
userRouter.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your registered Gmail address.' });
    }

    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Please register first.' });
    }

    if (!cleanEmail.endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Please enter a valid Gmail address (@gmail.com).' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    passwordResetOtpStore.set(cleanEmail, { otp, expiresAt, attempts: 0 });

    console.log(`\n======================================================`);
    console.log(`🔑 [SecureChat Password Reset OTP for ${cleanEmail}]: ${otp}`);
    console.log(`⏳ Valid for 10 minutes`);
    console.log(`======================================================\n`);

    if (mailerTransporter) {
      mailerTransporter.sendMail({
        from: '"SecureChat Security" <mcsonu143@gmail.com>',
        to: cleanEmail,
        subject: `Your SecureChat OTP: ${otp}`,
        text: `Your password reset code is: ${otp}. Valid for 10 minutes.`
      }).catch(err => console.warn('[Nodemailer Warning]', err.message));
    }

    res.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please check your inbox.`,
      expiresInMinutes: 10
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

/**
 * POST /api/auth/verify-otp-reset
 */
userRouter.post('/api/auth/verify-otp-reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
    const record = passwordResetOtpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ error: 'No OTP requested for this email or OTP expired. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetOtpStore.delete(cleanEmail);
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }

    if (record.otp.trim() !== String(otp).trim()) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 5) {
        passwordResetOtpStore.delete(cleanEmail);
        return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
      }
      return res.status(400).json({ error: `Incorrect OTP code. ${5 - record.attempts} attempts remaining.` });
    }

    const user = await getUserByEmail(cleanEmail);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newHashed = hashPassword(newPassword.trim());
    await updateUserPassword(user.id, newHashed);
    passwordResetOtpStore.delete(cleanEmail);

    res.json({
      success: true,
      message: 'Password successfully updated! You can now sign in with your new password.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error resetting password.' });
  }
});

/**
 * POST /api/auth/reset-password
 */
userRouter.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password required.' });

    const cleanEmail = String(email || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '').toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await updateUserPassword(user.id, hashPassword(newPassword.trim()));
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

/**
 * POST /api/auth/clean-slate
 */
userRouter.post('/api/auth/clean-slate', async (req, res) => {
  try {
    await clearAllUsersFromDb();
    activePresenceMap.clear();
    broadcastEvent('users_updated', { users: [] });
    broadcastEvent('presence', { onlineUserIds: [] });
    res.json({ success: true, message: 'All demo and testing accounts purged.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset database.' });
  }
});

/**
 * GET /api/users
 */
userRouter.get('/api/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    const safeUsers = users.map(({ passwordHash: _, ...u }) => ({
      ...u,
      isOnline: activePresenceMap.has(u.id),
      lastSeen: (u.lastSeen && u.lastSeen !== 'Online') ? u.lastSeen : (u.updatedAt || u.createdAt || new Date().toISOString())
    }));
    const onlineUserIds = Array.from(activePresenceMap.keys());
    res.json({ users: safeUsers, onlineUserIds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * GET /api/users/search
 */
userRouter.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ users: [] });
    const results = await searchUsersInDb(q.trim());
    const safeUsers = results.map(({ passwordHash: _, ...u }) => ({
      ...u,
      isOnline: activePresenceMap.has(u.id),
      lastSeen: (u.lastSeen && u.lastSeen !== 'Online') ? u.lastSeen : (u.updatedAt || u.createdAt || new Date().toISOString())
    }));
    res.json({ users: safeUsers });
  } catch (err) {
    res.status(500).json({ error: 'Search failed.' });
  }
});

/**
 * GET /api/users/check-name
 */
userRouter.get('/api/users/check-name', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || !name.trim()) return res.json({ exists: false, isAvailable: true });
    const existing = await getUserByDisplayName(name.trim());
    res.json({
      exists: !!existing,
      isAvailable: !existing,
      name: name.trim()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check name.' });
  }
});

/**
 * POST /api/users/sync
 */
userRouter.post('/api/users/sync', async (req, res) => {
  try {
    const { user } = req.body;
    if (!user || !user.id || !user.name) return res.status(400).json({ error: 'Invalid user payload.' });
    await upsertUser(user);
    broadcastEvent('user_updated', { user });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync user.' });
  }
});

/**
 * POST /api/users/clear-all
 */
userRouter.post('/api/users/clear-all', async (req, res) => {
  try {
    await clearAllUsersFromDb();
    activePresenceMap.clear();
    broadcastEvent('users_updated', { users: [] });
    broadcastEvent('presence', { onlineUserIds: [] });
    res.json({ success: true, message: 'All users wiped from database.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete users.' });
  }
});

/**
 * POST /api/presence/heartbeat
 */
userRouter.post('/api/presence/heartbeat', async (req, res) => {
  try {
    const user = req.body.user || req.body;
    const userId = req.body.userId || user?.id;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const wasOnline = activePresenceMap.has(userId);
    activePresenceMap.set(userId, { user, lastSeen: Date.now() });

    const onlineUserIds = Array.from(activePresenceMap.keys());
    if (!wasOnline) {
      broadcastEvent('presence', { onlineUserIds });
    }

    res.json({
      status: 'acknowledged',
      onlineUserIds,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat error: ' + err.message });
  }
});

/**
 * POST /api/presence/leave
 */
userRouter.post('/api/presence/leave', async (req, res) => {
  try {
    const user = req.body.user || req.body;
    const userId = req.body.userId || user?.id;
    if (userId && activePresenceMap.has(userId)) {
      activePresenceMap.delete(userId);
      const lastSeenIso = new Date().toISOString();
      await updateUserLastSeen(userId, lastSeenIso).catch(() => {});
      const onlineUserIds = Array.from(activePresenceMap.keys());
      broadcastEvent('presence', { onlineUserIds });
    }
    res.json({ status: 'offline', timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ error: 'Leave error: ' + err.message });
  }
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.USER_BACKEND_PORT || 3002;
  app.use(express.json());
  app.use(userRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`👤 User & Authentication Dedicated Backend running on port ${PORT}`);
  });
}

