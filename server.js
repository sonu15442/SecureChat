import express from 'express';
import { createHash, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = join(__dirname, 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure users.json exists
if (!existsSync(USERS_FILE)) {
  writeFileSync(USERS_FILE, '[]', 'utf-8');
}

// ── Middleware ──
app.use(express.json());

// CORS (for dev — Vite proxy handles this in dev, but this is a safety net)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Helpers ──
function loadUsers() {
  try {
    const data = readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function hashPassword(password, salt) {
  return createHash('sha256').update(password + salt).digest('hex');
}

// Avatars to cycle through for new accounts
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
 * POST /api/register
 * Body: { username, password, fullName }
 * Returns: { user } or 400/409 error
 */
app.post('/api/register', (req, res) => {
  const { username, password, fullName } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  const users = loadUsers();
  const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  // Check if username already exists
  const existing = users.find(u => u.username === `@${normalizedUsername}`);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken. Please choose another.' });
  }

  // Hash password with salt
  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  const newUser = {
    id: `user_${normalizedUsername}`,
    name: fullName?.trim() || username,
    username: `@${normalizedUsername}`,
    avatar: AVATARS[users.length % AVATARS.length],
    bio: '🔒 Protected by SecureChat Guard | Online',
    phone: '+1 (555) 019-8822',
    status: 'online',
    // Auth fields (never sent to frontend)
    passwordHash,
    salt,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  // Return user without sensitive fields
  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser });
});

/**
 * POST /api/login
 * Body: { username, password }
 * Returns: { user } or 401 error
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const users = loadUsers();
  const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const user = users.find(u => u.username === `@${normalizedUsername}`);

  if (!user) {
    return res.status(401).json({ error: 'Account not found. Please create an account first.' });
  }

  // Verify password
  const attemptHash = hashPassword(password, user.salt);
  if (attemptHash !== user.passwordHash) {
    return res.status(401).json({ error: 'Password is invalid. Please try again.' });
  }

  // Return user without sensitive fields
  const { passwordHash: _, salt: __, ...safeUser } = user;
  res.status(200).json({ user: safeUser });
});

/**
 * GET /api/users
 * Returns: { users: [...] } — all registered users (without passwords)
 */
app.get('/api/users', (req, res) => {
  const users = loadUsers();
  const safeUsers = users.map(({ passwordHash, salt, ...safe }) => safe);
  res.json({ users: safeUsers });
});

// ── Start Server ──
app.listen(PORT, () => {
  const users = loadUsers();
  console.log(`\n🔐 SecureChat Backend Server running on http://localhost:${PORT}`);
  console.log(`📦 ${users.length} registered account(s) in database`);
  console.log(`\n   POST /api/register  — Create a new account`);
  console.log(`   POST /api/login     — Sign in with password`);
  console.log(`   GET  /api/users     — List all users\n`);
});
