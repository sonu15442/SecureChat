import express from 'express';
import { fileURLToPath } from 'url';

/**
 * VideoCallModuleBackend.js
 * Dedicated Backend Service for VideoCallModule.java
 * Handles hardware video call metrics, resolution negotiation, and camera facing mode sync.
 */
export const videoCallModuleRouter = express.Router();

videoCallModuleRouter.post('/api/call/metrics', (req, res) => {
  try {
    const { callId, facingMode, isVideoActive, resolution, fps } = req.body || {};
    console.log(`[VideoCallModuleBackend] callId=${callId} camera=${facingMode} active=${isVideoActive} fps=${fps || 30} res=${resolution || '720p'}`);
    res.json({
      success: true,
      callId,
      status: 'METRICS_LOGGED',
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

videoCallModuleRouter.get('/api/call/video-config', (req, res) => {
  res.json({
    preferredCodec: 'VP8',
    maxFrameRate: 30,
    resolutions: ['1280x720', '640x480'],
    hardwareAcceleration: true,
    timestamp: Date.now()
  });
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.VIDEO_BACKEND_PORT || 3013;
  app.use(express.json());
  app.use(videoCallModuleRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📹 VideoCallModule Dedicated Backend running on port ${PORT}`);
  });
}

