import express from 'express';
import { fileURLToPath } from 'url';
import { activeCalls, activeCallSignals, broadcastEvent } from './sharedState.js';

export const callRouter = express.Router();

/**
 * POST /api/call/signal
 * Relays WebRTC signaling between users across Web and Mobile
 */
callRouter.post('/api/call/signal', (req, res) => {
  try {
    const { type, callId, targetId, from, to, isVideo, candidate, sdp, callerName, callerAvatar, status } = req.body || {};

    if (!type || !callId) {
      return res.status(400).json({ error: 'type and callId are required.' });
    }

    const recipient = targetId || to;
    const sender = from || (req.body && req.body.senderId);

    // Track active call status
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
      activeCalls.set(callId, {
        ...existing,
        callId,
        status: 'active',
        lastUpdated: Date.now()
      });
    } else if (type === 'call_end' || type === 'call_hangup' || type === 'call_cancel' || type === 'call_decline') {
      activeCalls.delete(callId);
      activeCallSignals.delete(callId);
    }

    // Buffer signal for reconnection resilience
    if (!activeCallSignals.has(callId)) {
      activeCallSignals.set(callId, []);
    }
    const signalRecord = { ...req.body, timestamp: Date.now() };
    activeCallSignals.get(callId).push(signalRecord);

    // Broadcast in real-time to all connected web and mobile SSE clients
    broadcastEvent('call_signal', signalRecord);

    res.json({
      success: true,
      callId,
      type,
      bufferedSignals: activeCallSignals.get(callId)?.length || 0,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process call signal: ' + err.message });
  }
});

/**
 * GET /api/call/sync
 * Retrieves buffered signaling messages for a specific call session
 */
callRouter.get('/api/call/sync', (req, res) => {
  try {
    const { callId, since } = req.query;
    if (!callId) {
      return res.status(400).json({ error: 'callId required.' });
    }

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
    res.status(500).json({ error: 'Failed to sync call signals: ' + err.message });
  }
});

/**
 * GET /api/call/active-for-user
 * Checks if a specific user has an incoming call waiting
 */
callRouter.get('/api/call/active-for-user', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

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

/**
 * GET /api/call/ice-servers
 * Provides STUN/TURN server configuration for WebRTCManager.java & WebRTC
 */
callRouter.get('/api/call/ice-servers', (req, res) => {
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

/**
 * POST /api/call/ice-candidate
 * Relays native ICE candidates from WebRTCManager.java
 */
callRouter.post('/api/call/ice-candidate', (req, res) => {
  try {
    const { callId, candidate, senderId, targetId } = req.body || {};
    if (!callId || !candidate) {
      return res.status(400).json({ error: 'callId and candidate required.' });
    }
    const signalPayload = {
      type: 'ice_candidate',
      callId,
      candidate,
      senderId,
      targetId,
      timestamp: Date.now()
    };
    broadcastEvent('call_signal', signalPayload);
    res.json({ success: true, message: 'ICE candidate relayed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to relay ICE candidate.' });
  }
});

/**
 * POST /api/call/audio-telemetry
 * Records native acoustic statistics from VoiceCallModule.java
 */
callRouter.post('/api/call/audio-telemetry', (req, res) => {
  try {
    const { callId, sampleRate, bufferSize, isSpeakerphoneOn, isMuted } = req.body || {};
    console.log(`[Voice Audio Telemetry] callId=${callId} speaker=${isSpeakerphoneOn} muted=${isMuted} rate=${sampleRate}Hz`);
    res.json({ success: true, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/call/metrics
 * Records hardware video metrics from VideoCallModule.java
 */
callRouter.post('/api/call/metrics', (req, res) => {
  try {
    const { callId, facingMode, isVideoActive, resolution, fps } = req.body || {};
    console.log(`[Video Call Metrics] callId=${callId} camera=${facingMode} active=${isVideoActive} fps=${fps || 30}`);
    res.json({ success: true, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.CALL_BACKEND_PORT || 3006;
  app.use(express.json());
  app.use(callRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📞 Voice & Video Calling Dedicated Backend running on port ${PORT}`);
  });
}
