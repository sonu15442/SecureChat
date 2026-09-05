import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fallback JSON Paths
const DATA_DIR = join(__dirname, 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Database configuration
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const DB_NAME = process.env.DB_NAME || 'securechat_db';

let pool = null;
let isDbConnected = false;
let lastDbError = null;

// In-memory cache for JSON fallback
let inMemoryUsers = null;
let inMemoryMessages = null;
let saveUsersTimer = null;
let saveMessagesTimer = null;

// ── JSON Fallback Helpers ──
function loadUsersFromFile() {
  if (inMemoryUsers !== null) return inMemoryUsers;
  try {
    if (existsSync(USERS_FILE)) {
      const data = readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Exclude any legacy demo accounts
        inMemoryUsers = parsed.filter(u =>
          u &&
          u.id &&
          !u.id.includes('demo') &&
          u.email !== 'alice@example.com' &&
          u.email !== 'bob@example.com'
        );
        return inMemoryUsers;
      }
    }
  } catch {}

  inMemoryUsers = [];
  return inMemoryUsers;
}

function saveUsersToFile(users) {
  inMemoryUsers = users;
  if (saveUsersTimer) clearTimeout(saveUsersTimer);
  saveUsersTimer = setTimeout(() => {
    try {
      writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    } catch {}
  }, 200);
}

function loadMessagesFromFile() {
  if (inMemoryMessages !== null) return inMemoryMessages;
  try {
    if (existsSync(MESSAGES_FILE)) {
      const data = readFileSync(MESSAGES_FILE, 'utf-8');
      inMemoryMessages = JSON.parse(data);
      return inMemoryMessages;
    }
  } catch {}
  inMemoryMessages = [];
  return inMemoryMessages;
}

function saveMessagesToFile(messages) {
  inMemoryMessages = messages;
  if (saveMessagesTimer) clearTimeout(saveMessagesTimer);
  saveMessagesTimer = setTimeout(() => {
    try {
      writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
    } catch {}
  }, 200);
}

// ── Database Initialization ──
export async function initDatabase() {
  try {
    // 1. First connect without selecting a database to ensure DB exists
    const rootConfig = process.env.DATABASE_URL
      ? process.env.DATABASE_URL
      : {
          host: DB_HOST,
          port: DB_PORT,
          user: DB_USER,
          password: DB_PASSWORD,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 4000
        };

    const tempConn = await mysql.createConnection(rootConfig);
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.end();

    // 2. Create the main application pool
    pool = mysql.createPool({
      ...(typeof rootConfig === 'object' ? rootConfig : {}),
      uri: typeof rootConfig === 'string' ? rootConfig : undefined,
      database: DB_NAME
    });

    // 3. Create tables if they do not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) DEFAULT '',
        avatar TEXT,
        bio TEXT,
        status VARCHAR(50) DEFAULT 'offline',
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        chat_id VARCHAR(64) NULL,
        sender_id VARCHAR(64) NOT NULL,
        receiver_id VARCHAR(64) NULL,
        text TEXT,
        timestamp VARCHAR(64) NULL,
        status VARCHAR(50) DEFAULT 'sent',
        media_url TEXT NULL,
        media_type VARCHAR(50) NULL,
        risk_level VARCHAR(50) NULL,
        threats JSON NULL,
        raw_payload JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_id (chat_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_receiver_id (receiver_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    isDbConnected = true;
    lastDbError = null;
    console.log(`✅ [MySQL] Connected successfully to "${DB_NAME}" at ${DB_HOST}:${DB_PORT}`);

    // 4. Auto-migration: check if users table is empty; if so, populate from users.json
    const [existingUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0]?.count === 0) {
      const fileUsers = loadUsersFromFile();
      if (fileUsers.length > 0) {
        console.log(`📦 [MySQL] Migrating ${fileUsers.length} initial user(s) into MySQL...`);
        for (const u of fileUsers) {
          await pool.query(
            `INSERT IGNORE INTO users (id, name, username, email, phone, avatar, bio, status, password_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              u.id,
              u.name || '',
              u.username || '',
              u.email || '',
              u.phone || '',
              u.avatar || '',
              u.bio || '',
              u.status || 'offline',
              u.passwordHash || ''
            ]
          );
        }
      }
    }

    // Auto-migration: check messages table
    const [existingMessages] = await pool.query('SELECT COUNT(*) as count FROM messages');
    if (existingMessages[0]?.count === 0) {
      const fileMessages = loadMessagesFromFile();
      if (fileMessages.length > 0) {
        console.log(`📦 [MySQL] Migrating ${fileMessages.length} message(s) into MySQL...`);
        for (const m of fileMessages) {
          await pool.query(
            `INSERT IGNORE INTO messages (id, chat_id, sender_id, receiver_id, text, timestamp, status, media_url, media_type, risk_level, threats, raw_payload)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              m.id,
              m.chatId || null,
              m.senderId || m.sender_id || '',
              m.receiverId || m.receiver_id || null,
              m.text || '',
              m.timestamp || '',
              m.status || 'sent',
              m.mediaUrl || null,
              m.mediaType || null,
              m.riskLevel || null,
              m.threats ? JSON.stringify(m.threats) : null,
              JSON.stringify(m)
            ]
          );
        }
      }
    }

    return true;
  } catch (err) {
    isDbConnected = false;
    lastDbError = err.message;
    console.warn(`\n⚠️  [MySQL Warning] Could not connect to MySQL server (${err.code || err.message}).`);
    console.warn(`ℹ️  Running in Resilient JSON Fallback Mode. Your chat app will continue functioning seamlessly.`);
    console.warn(`💡 To connect to your MySQL database, verify credentials in your .env file:`);
    console.warn(`   DB_HOST=${DB_HOST}`);
    console.warn(`   DB_PORT=${DB_PORT}`);
    console.warn(`   DB_USER=${DB_USER}`);
    console.warn(`   DB_PASSWORD=<your_mysql_password>\n`);
    return false;
  }
}

// ── Database Operations ──

export async function getAllUsers() {
  if (isDbConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        username: r.username,
        email: r.email,
        phone: r.phone || '',
        avatar: r.avatar,
        bio: r.bio,
        status: r.status,
        passwordHash: r.password_hash,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    } catch (err) {
      console.error('[MySQL Error] getAllUsers failed, falling back to JSON:', err.message);
    }
  }
  return loadUsersFromFile();
}

export async function searchUsersInDb(query) {
  if (!query || !query.trim()) {
    return getAllUsers();
  }
  const cleanQ = `%${query.toLowerCase().trim()}%`;
  if (isDbConnected && pool) {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM users
         WHERE LOWER(name) LIKE ?
            OR LOWER(username) LIKE ?
            OR LOWER(email) LIKE ?
            OR phone LIKE ?
         ORDER BY created_at ASC`,
        [cleanQ, cleanQ, cleanQ, cleanQ]
      );
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        username: r.username,
        email: r.email,
        phone: r.phone || '',
        avatar: r.avatar,
        bio: r.bio,
        status: r.status,
        passwordHash: r.password_hash,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    } catch (err) {
      console.error('[MySQL Error] searchUsersInDb failed, falling back to JSON:', err.message);
    }
  }

  const all = loadUsersFromFile();
  const qLower = query.toLowerCase().trim();
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

export async function getUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();

  if (isDbConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          name: r.name,
          username: r.username,
          email: r.email,
          phone: r.phone || '',
          avatar: r.avatar,
          bio: r.bio,
          status: r.status,
          passwordHash: r.password_hash,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      }
      return null;
    } catch (err) {
      console.error('[MySQL Error] getUserByEmail failed, falling back to JSON:', err.message);
    }
  }

  const users = loadUsersFromFile();
  return users.find(u => u.email && u.email.toLowerCase() === cleanEmail) || null;
}

export async function createUser(user) {
  if (isDbConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO users (id, name, username, email, phone, avatar, bio, status, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.name,
          user.username,
          user.email.toLowerCase().trim(),
          user.phone || '',
          user.avatar || '',
          user.bio || '',
          user.status || 'online',
          user.passwordHash
        ]
      );
    } catch (err) {
      console.error('[MySQL Error] createUser failed, fallback to JSON:', err.message);
      const users = loadUsersFromFile();
      users.push(user);
      saveUsersToFile(users);
      return user;
    }
  }

  // Also sync in local JSON store
  const users = loadUsersFromFile();
  const existingIdx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (existingIdx !== -1) {
    users[existingIdx] = { ...users[existingIdx], ...user };
  } else {
    users.push(user);
  }
  saveUsersToFile(users);
  return user;
}

export async function updateUserPassword(email, newPasswordHash) {
  const cleanEmail = email.toLowerCase().trim();

  if (isDbConnected && pool) {
    try {
      await pool.query('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?', [newPasswordHash, cleanEmail]);
    } catch (err) {
      console.error('[MySQL Error] updateUserPassword failed:', err.message);
    }
  }

  const users = loadUsersFromFile();
  const idx = users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (idx !== -1) {
    users[idx].passwordHash = newPasswordHash;
    users[idx].updatedAt = new Date().toISOString();
    saveUsersToFile(users);
  }
}

export async function upsertUser(user) {
  if (isDbConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO users (id, name, username, email, phone, avatar, bio, status, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           username = VALUES(username),
           phone = VALUES(phone),
           avatar = VALUES(avatar),
           bio = VALUES(bio),
           status = VALUES(status)`,
        [
          user.id,
          user.name || '',
          user.username || '',
          (user.email || '').toLowerCase().trim(),
          user.phone || '',
          user.avatar || '',
          user.bio || '',
          user.status || 'online',
          user.passwordHash || ''
        ]
      );
    } catch (err) {
      console.error('[MySQL Error] upsertUser failed, fallback to JSON:', err.message);
    }
  }

  const users = loadUsersFromFile();
  const idx = users.findIndex(u => u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()));
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push(user);
  }
  saveUsersToFile(users);
  return user;
}

export async function updateUserProfile(id, { name, avatar, bio }) {
  if (isDbConnected && pool) {
    try {
      const updates = [];
      const values = [];
      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
      if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
      if (updates.length > 0) {
        values.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
      }
    } catch (err) {
      console.error('[MySQL Error] updateUserProfile failed:', err.message);
    }
  }

  const users = loadUsersFromFile();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    if (name !== undefined) users[idx].name = name;
    if (avatar !== undefined) users[idx].avatar = avatar;
    if (bio !== undefined) users[idx].bio = bio;
    users[idx].updatedAt = new Date().toISOString();
    saveUsersToFile(users);
  }
}

export async function getAllMessages() {
  if (isDbConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM messages ORDER BY created_at ASC');
      return rows.map(r => {
        let raw = {};
        try {
          raw = typeof r.raw_payload === 'string' ? JSON.parse(r.raw_payload) : (r.raw_payload || {});
        } catch {}
        return {
          ...raw,
          id: r.id,
          chatId: r.chat_id,
          senderId: r.sender_id,
          receiverId: r.receiver_id,
          text: r.text,
          timestamp: r.timestamp,
          status: r.status,
          mediaUrl: r.media_url,
          mediaType: r.media_type,
          riskLevel: r.risk_level,
          threats: typeof r.threats === 'string' ? JSON.parse(r.threats) : r.threats
        };
      });
    } catch (err) {
      console.error('[MySQL Error] getAllMessages failed, fallback to JSON:', err.message);
    }
  }
  return loadMessagesFromFile();
}

export async function saveMessage(message) {
  if (!message || !message.id) return null;

  if (isDbConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO messages (id, chat_id, sender_id, receiver_id, text, timestamp, status, media_url, media_type, risk_level, threats, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           text = VALUES(text),
           status = VALUES(status),
           raw_payload = VALUES(raw_payload)`,
        [
          message.id,
          message.chatId || null,
          message.senderId || message.sender_id || '',
          message.receiverId || message.receiver_id || null,
          message.text || '',
          message.timestamp || '',
          message.status || 'sent',
          message.mediaUrl || null,
          message.mediaType || null,
          message.riskLevel || null,
          message.threats ? JSON.stringify(message.threats) : null,
          JSON.stringify(message)
        ]
      );
    } catch (err) {
      console.error('[MySQL Error] saveMessage failed:', err.message);
    }
  }

  const messages = loadMessagesFromFile();
  const existingIdx = messages.findIndex(m => m.id === message.id);
  if (existingIdx !== -1) {
    messages[existingIdx] = { ...messages[existingIdx], ...message };
  } else {
    messages.push(message);
  }
  saveMessagesToFile(messages);
  return message;
}

export function getDbHealth() {
  return {
    connected: isDbConnected,
    type: isDbConnected ? 'mysql' : 'json_fallback',
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    error: lastDbError
  };
}
