import express from 'express';
import { fileURLToPath } from 'url';

/**
 * VoiceCallModuleBackend.js
 * Dedicated Backend Service for VoiceCallModule.java
 * Handles native voice calling audio telemetry, loudspeaker routing, and acoustic stats.
 */
export const voiceCallModuleRouter = express.Router();

voiceCallModuleRouter.post('/api/call/audio-telemetry', (req, res) => {
  try {
    const { callId, sampleRate, bufferSize, isSpeakerphoneOn, isMuted, details } = req.body || {};
    console.log(`[VoiceCallModuleBackend] callId=${callId} speaker=${isSpeakerphoneOn} muted=${isMuted} rate=${sampleRate || 44100}Hz`);
    res.json({
      success: true,
      callId,
      status: 'AUDIO_TELEMETRY_LOGGED',
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

voiceCallModuleRouter.get('/api/call/audio-config', (req, res) => {
  res.json({
    preferredSampleRate: 44100,
    preferredCodec: 'Opus',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    timestamp: Date.now()
  });
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.VOICE_BACKEND_PORT || 3014;
  app.use(express.json());
  app.use(voiceCallModuleRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎙️ VoiceCallModule Dedicated Backend running on port ${PORT}`);
  });
}
