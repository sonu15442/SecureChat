/**
 * SecureChat Mock API Server
 * Simulates backend endpoints for baseline/load testing.
 *
 * Endpoints:
 *   POST /api/auth/login       – User authentication
 *   GET  /api/contacts          – List contacts
 *   GET  /api/messages/:id      – Retrieve messages for a contact
 *   POST /api/messages/send     – Send a new message
 *   POST /api/link-analysis     – Analyse a URL for phishing/fraud risk
 *   GET  /api/health            – Health check
 */

import express from 'express';

// ── Re-use the real link-detection logic ────────────────────────────
import { extractUrls, analyzeUrl } from '../src/utils/linkDetector.js';

const app = express();
app.use(express.json());

// ── Simulated Data ──────────────────────────────────────────────────

const USERS = {
  alice: { id: 'user_alice', username: 'alice', displayName: 'Alice Johnson' },
  bob:   { id: 'user_bob',   username: 'bob',   displayName: 'Bob Smith' },
};

const CONTACTS = [
  { id: 'contact_1', name: 'SecureBot',       avatar: '🤖', isBot: true,  status: 'online'  },
  { id: 'contact_2', name: 'Jane Doe',        avatar: '👩', isBot: false, status: 'online'  },
  { id: 'contact_3', name: 'Team Chat',       avatar: '👥', isBot: false, status: 'online'  },
  { id: 'contact_4', name: 'Support Channel', avatar: '🎧', isBot: false, status: 'offline' },
];

// Pre-seed some messages per contact
const MESSAGES = {};
CONTACTS.forEach(c => {
  MESSAGES[c.id] = Array.from({ length: 20 }, (_, i) => ({
    id: `msg_${c.id}_${i}`,
    senderId: i % 2 === 0 ? 'user_alice' : c.id,
    text: `Sample message #${i + 1} in ${c.name}`,
    timestamp: new Date(Date.now() - (20 - i) * 60_000).toISOString(),
    status: 'read',
  }));
});

let msgCounter = 10_000;

// ── Routes ──────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const user = USERS[username.toLowerCase()];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({
    token: `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    user,
  });
});

// Get contacts
app.get('/api/contacts', (_req, res) => {
  res.json({ contacts: CONTACTS });
});

// Get messages for a contact
app.get('/api/messages/:contactId', (req, res) => {
  const msgs = MESSAGES[req.params.contactId];
  if (!msgs) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  res.json({ messages: msgs });
});

// Send message
app.post('/api/messages/send', (req, res) => {
  const { contactId, text } = req.body || {};
  if (!contactId || !text) {
    return res.status(400).json({ error: 'Missing contactId or text' });
  }
  const newMsg = {
    id: `msg_${++msgCounter}`,
    senderId: 'user_alice',
    text,
    timestamp: new Date().toISOString(),
    status: 'sent',
  };
  if (MESSAGES[contactId]) {
    MESSAGES[contactId].push(newMsg);
  }
  res.json({ message: newMsg });
});

// Link analysis — uses the real SecureChat detection engine
app.post('/api/link-analysis', (req, res) => {
  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'Missing url' });
  }
  const urls = extractUrls(url);
  if (urls.length === 0) {
    return res.status(400).json({ error: 'No valid URL detected' });
  }
  const analysis = analyzeUrl(urls[0]);
  res.json({ analysis });
});

// ── Start ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3456;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 SecureChat Mock API running on http://localhost:${PORT}`);
  console.log(`   Endpoints ready for load testing.\n`);
});

export { app, server };
