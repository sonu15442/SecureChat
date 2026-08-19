import express from 'express';
import { createHash, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = join(__dirname, 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure users.json and messages.json exist
if (!existsSync(USERS_FILE)) {
  writeFileSync(USERS_FILE, '[]', 'utf-8');
}
if (!existsSync(MESSAGES_FILE)) {
  writeFileSync(MESSAGES_FILE, '[]', 'utf-8');
}

// ── Middleware ──
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static frontend files from dist/
const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

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

function loadMessages() {
  try {
    const data = readFileSync(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function generatePassword() {
  // Generate an 8-character alphanumeric password
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
 * POST /api/auth/register
 * Body: { email, fullName }
 * Creates a new user with a generated permanent password.
 * Returns: { success: true, user, password }  (password shown once)
 */
app.post('/api/auth/register', (req, res) => {
  const { email, fullName } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Please enter your full name.' });
  }

  const users = loadUsers();

  // Check if email already exists
  const existingUser = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
  }

  // Generate permanent password
  const plainPassword = generatePassword();
  const hashedPassword = hashPassword(plainPassword);

  const userTag = `@${cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

  const user = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: fullName.trim(),
    username: userTag,
    email: cleanEmail,
    phone: '',
    avatar: AVATARS[users.length % AVATARS.length],
    bio: '🔒 Protected by SecureChat Guard',
    status: 'online',
    passwordHash: hashedPassword,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  // Return user data WITHOUT passwordHash, but WITH the plain password (shown once)
  const { passwordHash, ...safeUser } = user;

  res.status(201).json({
    success: true,
    user: safeUser,
    password: plainPassword
  });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { success: true, user }
 */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Please enter your email address.' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Please enter your password.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = loadUsers();

  const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
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
});

/**
 * GET /api/users
 */
app.get('/api/users', (req, res) => {
  const users = loadUsers().map(({ passwordHash, ...u }) => u);
  res.json({ users });
});

/**
 * GET /api/messages
 */
app.get('/api/messages', (req, res) => {
  const messages = loadMessages();
  res.json({ messages });
});

/**
 * POST /api/messages
 */
app.post('/api/messages', (req, res) => {
  const message = req.body;
  if (!message || !message.id) {
    return res.status(400).json({ error: 'Invalid message payload.' });
  }

  const messages = loadMessages();
  const existingIdx = messages.findIndex(m => m.id === message.id);
  if (existingIdx !== -1) {
    messages[existingIdx] = { ...messages[existingIdx], ...message };
  } else {
    messages.push(message);
  }
  saveMessages(messages);
  res.status(201).json({ message });
});

// ── Catch-all: serve index.html for client-side routing ──
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('App not built yet. Run npm run build first.');
  }
});

app.listen(PORT, () => {
  const users = loadUsers();
  console.log(`\n🔐 SecureChat Backend Server running on port ${PORT}`);
  console.log(`📦 ${users.length} registered account(s) in database`);
});
