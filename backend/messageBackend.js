import express from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getAllMessages,
  saveMessage,
  clearMessagesFromDb,
  updateMessageStatusInDb
} from '../db.js';
import { broadcastEvent } from './sharedState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const MOMENTS_FILE = join(DATA_DIR, 'moments.json');
const FRIENDS_FILE = join(DATA_DIR, 'friends.json');

export const messageRouter = express.Router();

let inMemoryMoments = null;
let inMemoryFriends = null;

function loadMomentsFromFile() {
  if (inMemoryMoments !== null) return inMemoryMoments;
  try {
    if (existsSync(MOMENTS_FILE)) {
      const data = readFileSync(MOMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const now = Date.now();
      const valid = parsed.filter(m => (now - m.timestamp) < (24 * 60 * 60 * 1000));
      inMemoryMoments = valid;
      return inMemoryMoments;
    }
  } catch {}
  inMemoryMoments = [];
  return inMemoryMoments;
}

function saveMomentsToFile(moments) {
  inMemoryMoments = moments;
  try {
    writeFileSync(MOMENTS_FILE, JSON.stringify(moments, null, 2), 'utf-8');
  } catch {}
}

function loadFriendsFromFile() {
  if (inMemoryFriends !== null) return inMemoryFriends;
  try {
    if (existsSync(FRIENDS_FILE)) {
      const data = readFileSync(FRIENDS_FILE, 'utf-8');
      inMemoryFriends = JSON.parse(data);
      return inMemoryFriends;
    }
  } catch {}
  inMemoryFriends = [];
  return inMemoryFriends;
}

function saveFriendsToFile(friends) {
  inMemoryFriends = friends;
  try {
    writeFileSync(FRIENDS_FILE, JSON.stringify(friends, null, 2), 'utf-8');
  } catch {}
}

/**
 * GET /api/messages
 */
messageRouter.get('/api/messages', async (req, res) => {
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
messageRouter.post('/api/messages', async (req, res) => {
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
 * POST /api/messages/status
 */
messageRouter.post('/api/messages/status', async (req, res) => {
  try {
    const { messageIds, status, readerId, senderId } = req.body || {};
    if (!Array.isArray(messageIds) || messageIds.length === 0 || !status) {
      return res.status(400).json({ error: 'messageIds array and status are required.' });
    }

    const updatedCount = await updateMessageStatusInDb(messageIds, status);
    broadcastEvent('read_receipt', { messageIds, status, readerId, senderId });
    res.json({ success: true, updatedCount });
  } catch (err) {
    console.error('Update message status error:', err);
    res.status(500).json({ error: 'Failed to update message status.' });
  }
});

/**
 * POST /api/messages/clear
 */
messageRouter.post('/api/messages/clear', async (req, res) => {
  try {
    const { userId, targetId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
    await clearMessagesFromDb(userId, targetId || 'global');
    broadcastEvent('messages_cleared', { userId, targetId: targetId || 'global' });
    res.json({ success: true, message: 'Messages cleared successfully.' });
  } catch (err) {
    console.error('Clear messages error:', err);
    res.status(500).json({ error: 'Failed to clear messages.' });
  }
});

/**
 * GET /api/friends
 */
messageRouter.get('/api/friends', (req, res) => {
  const friends = loadFriendsFromFile();
  res.json({ friends });
});

/**
 * POST /api/friends/follow
 */
messageRouter.post('/api/friends/follow', (req, res) => {
  try {
    const { userId, targetId } = req.body;
    if (!userId || !targetId || userId === targetId) {
      return res.status(400).json({ error: 'Valid userId and targetId required.' });
    }
    const friends = loadFriendsFromFile();
    const exists = friends.some(f => 
      (f.userId === userId && f.friendId === targetId) ||
      (f.userId === targetId && f.friendId === userId)
    );
    if (!exists) {
      friends.push({
        id: `friend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId,
        friendId: targetId,
        createdAt: new Date().toISOString()
      });
      saveFriendsToFile(friends);
      broadcastEvent('friends_updated', { friends });
    }
    res.json({ success: true, friends });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add friend.' });
  }
});

/**
 * POST /api/friends/unfollow
 */
messageRouter.post('/api/friends/unfollow', (req, res) => {
  try {
    const { userId, targetId } = req.body;
    let friends = loadFriendsFromFile();
    friends = friends.filter(f => 
      !( (f.userId === userId && f.friendId === targetId) || (f.userId === targetId && f.friendId === userId) )
    );
    saveFriendsToFile(friends);
    broadcastEvent('friends_updated', { friends });
    res.json({ success: true, friends });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unfollow.' });
  }
});

/**
 * GET /api/moments
 */
messageRouter.get('/api/moments', (req, res) => {
  const moments = loadMomentsFromFile();
  res.json({ moments });
});

/**
 * POST /api/moments
 */
messageRouter.post('/api/moments', (req, res) => {
  try {
    const moment = req.body;
    if (!moment || !moment.userId) {
      return res.status(400).json({ error: 'Invalid moment payload.' });
    }
    const moments = loadMomentsFromFile();
    const newMoment = {
      ...moment,
      id: moment.id || `moment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: typeof moment.timestamp === 'number' ? moment.timestamp : Date.now(),
      views: Array.isArray(moment.views) ? moment.views.filter(v => v !== moment.userId) : []
    };
    const existingIndex = moments.findIndex(m => m.id === newMoment.id);
    if (existingIndex !== -1) {
      moments[existingIndex] = newMoment;
    } else {
      moments.unshift(newMoment);
    }
    saveMomentsToFile(moments);
    broadcastEvent('moment_created', { moment: newMoment });
    res.status(201).json({ success: true, moment: newMoment });
  } catch (err) {
    console.error('Save moment error:', err);
    res.status(500).json({ error: 'Failed to save moment.' });
  }
});

/**
 * POST /api/moments/view
 */
messageRouter.post('/api/moments/view', (req, res) => {
  try {
    const { momentId, viewerId } = req.body;
    if (!momentId || !viewerId) return res.status(400).json({ error: 'Missing momentId or viewerId' });
    const moments = loadMomentsFromFile();
    const target = moments.find(m => m.id === momentId);
    if (target && target.userId !== viewerId) {
      if (!Array.isArray(target.views)) target.views = [];
      if (!target.views.includes(viewerId)) {
        target.views.push(viewerId);
        saveMomentsToFile(moments);
        broadcastEvent('moment_viewed', { momentId, viewerId });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record moment view' });
  }
});

/**
 * DELETE /api/moments/:id
 */
messageRouter.delete('/api/moments/:id', (req, res) => {
  try {
    const { id } = req.params;
    let moments = loadMomentsFromFile();
    moments = moments.filter(m => m.id !== id);
    saveMomentsToFile(moments);
    broadcastEvent('moment_deleted', { momentId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete moment' });
  }
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.MESSAGE_BACKEND_PORT || 3003;
  app.use(express.json({ limit: '200mb' }));
  app.use(messageRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`💬 Message & Moments Dedicated Backend running on port ${PORT}`);
  });
}

