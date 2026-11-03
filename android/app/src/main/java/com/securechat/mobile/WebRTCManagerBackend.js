import express from 'express';
import { fileURLToPath } from 'url';

/**
 * WebRTCManagerBackend.js
 * Dedicated Backend Service for WebRTCManager.java
 * Handles WebRTC peer signaling, STUN/TURN server discovery, ICE candidate exchange, and active call state.
 */
export const webRTCManagerRouter = express.Router();

const activeCalls = new Map();
const activeCallSignals = new Map();

webRTCManagerRouter.post('/api/call/signal', (req, res) => {
  try {
    const { type, callId, targetId, from, to, isVideo, candidate, sdp, callerName, callerAvatar } = req.body || {};
    if (!type || !callId) {
      return res.status(400).json({ error: 'type and callId are required.' });
    }

    const recipient = targetId || to;
    const sender = from || (req.body && req.body.senderId);

    if (type === 'call_invite' || type === 'call_ring') {
      activeCalls.set(callId, {
        callId,
        status: 'ringing',
        callerId: sender,
        recipientId: recipient,
        callerName: callerName || 'User',
        callerAvatar,
        isVideo: !!isVideo,
        lastUpdated: Date.now()
      });
    } else if (type === 'call_answer' || type === 'call_accept') {
      const existing = activeCalls.get(callId) || {};
      activeCalls.set(callId, { ...existing, callId, status: 'active', lastUpdated: Date.now() });
    } else if (type === 'call_end' || type === 'call_hangup' || type === 'call_cancel' || type === 'call_decline') {
      activeCalls.delete(callId);
      activeCallSignals.delete(callId);
    }

    if (!activeCallSignals.has(callId)) {
      activeCallSignals.set(callId, []);
    }
    const signalRecord = { ...req.body, timestamp: Date.now() };
    activeCallSignals.get(callId).push(signalRecord);

    res.json({
      success: true,
      callId,
      type,
      bufferedSignals: activeCallSignals.get(callId)?.length || 0,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process WebRTC signal: ' + err.message });
  }
});

webRTCManagerRouter.get('/api/call/sync', (req, res) => {
  try {
    const { callId, since } = req.query;
    if (!callId) return res.status(400).json({ error: 'callId required.' });

    const allSignals = activeCallSignals.get(callId) || [];
    const sinceTimestamp = since ? parseInt(since, 10) : 0;
    const filtered = allSignals.filter(s => (s.timestamp || 0) > sinceTimestamp);

    res.json({
      success: true,
      callId,
      signals: filtered,
      activeState: activeCalls.get(callId) || null,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync WebRTC signals: ' + err.message });
  }
});

webRTCManagerRouter.get('/api/call/active-for-user', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    let userCall = null;
    for (const [_, call] of activeCalls.entries()) {
      if (call.recipientId === userId && (call.status === 'ringing' || call.status === 'active')) {
        userCall = call;
        break;
      }
    }

    res.json({
      success: true,
      hasActiveCall: !!userCall,
      call: userCall,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

webRTCManagerRouter.get('/api/call/ice-servers', (req, res) => {
  res.json({
    success: true,
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ],
    timestamp: Date.now()
  });
});

webRTCManagerRouter.post('/api/call/ice-candidate', (req, res) => {
  try {
    const { callId, candidate, senderId, targetId } = req.body || {};
    if (!callId || !candidate) {
      return res.status(400).json({ error: 'callId and candidate required.' });
    }
    res.json({ success: true, message: 'ICE candidate accepted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept ICE candidate.' });
  }
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.CALL_BACKEND_PORT || 3006;
  app.use(express.json());
  app.use(webRTCManagerRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 WebRTCManager Dedicated Backend running on port ${PORT}`);
  });
}

