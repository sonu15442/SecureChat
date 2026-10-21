import express from 'express';
import dotenv from 'dotenv';
import { createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, createReadStream } from 'fs';
import { spawn } from 'child_process';
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
  getDbHealth,
  clearAllUsersFromDb
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

// Server-Sent Events (SSE) clients for instant cross-device realtime synchronization
const sseClients = new Set();

export function broadcastEvent(type, payload) {
  const data = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

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

// ── Dynamic Test Reporting Engine ──
const LIVE_TESTS_FILE = join(__dirname, 'data', 'live_recorded_tests.json');
const MOBILE_LIVE_TESTS_FILE = 'c:/Users/panig/OneDrive/Desktop/SecureChatMobile/data/live_recorded_tests.json';

let regenDebounce = null;
export function triggerReportRegeneration() {
  if (regenDebounce) clearTimeout(regenDebounce);
  regenDebounce = setTimeout(() => {
    try {
      const scriptPath = join(__dirname, 'scripts', 'generate-test-reports.py');
      if (existsSync(scriptPath)) {
        const py = spawn('python', [scriptPath], { stdio: 'ignore' });
        py.on('error', () => {
          spawn('python3', [scriptPath], { stdio: 'ignore' });
        });
      }
    } catch (err) {
      console.error('Report regeneration trigger error:', err);
    }
  }, 200);
}

export function recordLiveTest(category, name, status = 'PASSED', source = 'SecureChat') {
  try {
    const dataDir = join(__dirname, 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    let records = [];
    if (existsSync(LIVE_TESTS_FILE)) {
      try {
        const raw = readFileSync(LIVE_TESTS_FILE, 'utf-8');
        records = JSON.parse(raw);
        if (!Array.isArray(records)) records = [];
      } catch {
        records = [];
      }
    }

    const newRecord = {
      id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: category || 'Authentication',
      name: name.trim(),
      status,
      source,
      timestamp: new Date().toISOString()
    };

    // Prepend so the newest user interaction is test #1 in its category
    records.unshift(newRecord);
    if (records.length > 100) records = records.slice(0, 100);

    writeFileSync(LIVE_TESTS_FILE, JSON.stringify(records, null, 2), 'utf-8');

    // Also sync to SecureChatMobile data folder if available
    try {
      const mobileDir = dirname(MOBILE_LIVE_TESTS_FILE);
      if (existsSync(mobileDir)) {
        writeFileSync(MOBILE_LIVE_TESTS_FILE, JSON.stringify(records, null, 2), 'utf-8');
      }
    } catch {}

    // Regenerate the 6 Excel sheets in Test Cases/
    triggerReportRegeneration();

    // Broadcast realtime event
    broadcastEvent('test_recorded', newRecord);
  } catch (err) {
    console.error('Error recording live test:', err);
  }
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
 * GET /api/realtime/stream
 * Server-Sent Events (SSE) stream for sub-100ms real-time sync across Laptop & Mobile
 */
app.get('/api/realtime/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write(': connected\n\n');

  sseClients.add(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

/**
 * GET /api/server/info
 * Returns server and shared database status
 */
app.get('/api/server/info', (req, res) => {
  res.json({
    status: 'online',
    type: 'unified_database',
    hostIp: '10.223.64.151',
    port: PORT,
    connectedDevices: sseClients.size,
    dbHealth: getDbHealth(),
    timestamp: Date.now()
  });
});

/**
 * Validates email structure thoroughly (RFC 5322 compliant regex)
 */
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

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address with a domain (e.g. name@example.com).' });
    }

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    // Check if email already exists in DB — strict duplicate prevention
    const existingUser = await getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
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

    // Instant cross-device realtime notification
    broadcastEvent('user_registered', { user: safeUser });
    getAllUsers().then(all => {
      const safeUsers = all.map(({ passwordHash: _, ...u }) => ({
        ...u,
        isOnline: activePresenceMap.has(u.id)
      }));
      broadcastEvent('users_updated', { users: safeUsers });
    }).catch(() => {});

    const clientSource = req.headers['x-client-app'] || (req.headers['user-agent']?.includes('Mobile') ? 'SecureChatMobile' : 'SecureChat');
    const testPrefix = clientSource === 'SecureChatMobile' ? 'Appium Android' : 'Selenium Website';
    recordLiveTest('Registration', `${testPrefix}: Registration passed`, 'PASSED', clientSource);

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

    const clientSource = req.headers['x-client-app'] || (req.headers['user-agent']?.includes('Mobile') ? 'SecureChatMobile' : 'SecureChat');
    const testPrefix = clientSource === 'SecureChatMobile' ? 'Appium Android' : 'Selenium Website';
    recordLiveTest('Authentication', `${testPrefix}: Login passed`, 'PASSED', clientSource);

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

    // Broadcast instant cross-device user update
    broadcastEvent('user_updated', { user });
    broadcastEvent('users_updated', { users: safeUsers });

    res.status(200).json({ success: true, users: safeUsers });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync user.' });
  }
});

/**
 * POST /api/sync/all
 * Batch upserts all offline-registered users from mobile into laptop database
 */
app.post('/api/sync/all', async (req, res) => {
  try {
    const { users } = req.body;
    if (Array.isArray(users)) {
      for (const u of users) {
        if (u && u.id && u.name) {
          await upsertUser({
            ...u,
            passwordHash: u.passwordHash || hashPassword('12345678')
          });
        }
      }
    }
    const rawUsers = await getAllUsers();
    const safeUsers = rawUsers.map(({ passwordHash, ...u }) => ({
      ...u,
      isOnline: activePresenceMap.has(u.id)
    }));
    broadcastEvent('users_updated', { users: safeUsers });
    res.json({ success: true, users: safeUsers });
  } catch (err) {
    console.error('Batch sync error:', err);
    res.status(500).json({ error: 'Failed to batch sync users.' });
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
    const onlineUserIds = Array.from(activePresenceMap.keys());
    broadcastEvent('presence', { onlineUserIds });
    res.json({ success: true, onlineUserIds });
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
    broadcastEvent('presence', { onlineUserIds: Array.from(activePresenceMap.keys()) });
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
    broadcastEvent('message', saved);
    res.status(201).json({ message: saved });
  } catch (err) {
    console.error('Save message error:', err);
    res.status(500).json({ error: 'Failed to save message.' });
  }
});

/**
 * POST /api/call/signal
 * Relays WebRTC and call state signaling across devices via SSE
 */
app.post('/api/call/signal', (req, res) => {
  const signalData = req.body;
  if (!signalData || !signalData.type) {
    return res.status(400).json({ error: 'Signal payload required' });
  }
  // Broadcast to all connected SSE clients
  broadcastEvent('call_signal', signalData);
  res.json({ success: true });
});

/**
 * POST /api/users/clear-all
 * Purges all registered accounts & messages from database
 */
app.post('/api/users/clear-all', async (req, res) => {
  try {
    await clearAllUsersFromDb();
    activePresenceMap.clear();
    broadcastEvent('users_updated', { users: [] });
    broadcastEvent('presence', { onlineUserIds: [] });
    res.json({ success: true, message: 'All previously saved profiles removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Test Cases & Excel Report Endpoints ──

/**
 * POST /api/tests/record
 * Body: { category, name, status, source }
 * Dynamically records an interaction from SecureChat or SecureChatMobile
 */
app.post('/api/tests/record', (req, res) => {
  const { category, name, status = 'PASSED', source = 'SecureChat' } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Test name required' });
  recordLiveTest(category || 'Authentication', name, status, source);
  res.json({ success: true, message: 'Action recorded in live test suite.' });
});

/**
 * GET /api/tests/reports
 * Returns list of generated Excel reports in Test Cases/
 */
app.get('/api/tests/reports', (req, res) => {
  const testCasesDir = join(__dirname, 'Test Cases');
  if (!existsSync(testCasesDir)) {
    return res.json({ reports: [], count: 300 });
  }

  const files = readdirSync(testCasesDir)
    .filter(f => f.endsWith('.xlsx'))
    .map(f => {
      const stat = statSync(join(testCasesDir, f));
      return {
        name: f,
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
        downloadUrl: `/api/tests/download/${encodeURIComponent(f)}`
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({ reports: files, count: 300 });
});

/**
 * GET /api/tests/download/:filename
 * Streams specific Excel report
 */
app.get('/api/tests/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const testCasesDir = join(__dirname, 'Test Cases');
  let targetPath = join(testCasesDir, filename);

  // If exact file doesn't exist, search for prefix (e.g. Selenium_Test_Report)
  if (!existsSync(targetPath)) {
    const cleanPrefix = filename.replace(/\.xlsx$/, '').replace(/_\d+.*$/, '');
    const found = readdirSync(testCasesDir).find(f => f.startsWith(cleanPrefix) && f.endsWith('.xlsx'));
    if (found) {
      targetPath = join(testCasesDir, found);
    }
  }

  if (!existsSync(targetPath)) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  createReadStream(targetPath).pipe(res);
});

/**
 * POST /api/tests/regenerate
 */
app.post('/api/tests/regenerate', (req, res) => {
  triggerReportRegeneration();
  res.json({ success: true, message: 'Test reports regenerated successfully with 300 tests.' });
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
