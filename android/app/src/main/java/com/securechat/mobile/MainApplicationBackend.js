import express from 'express';
import { fileURLToPath } from 'url';

/**
 * MainApplicationBackend.js
 * Dedicated Backend Service for MainApplication.java
 * Handles application boot initialization, version negotiation, and global config.
 */
export const mainApplicationRouter = express.Router();

mainApplicationRouter.post('/api/app/init', (req, res) => {
  try {
    const { appId, platform, buildNumber, environment } = req.body || {};
    res.json({
      success: true,
      appId: appId || 'com.securechat.mobile',
      platform: platform || 'android',
      serverVersion: '2.0.0',
      status: 'INITIALIZED',
      featuresEnabled: {
        voiceCalling: true,
        videoCalling: true,
        fraudDetection: true,
        secureStorage: true,
        e2eeCrypto: true
      },
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: 'App initialization error: ' + err.message });
  }
});

mainApplicationRouter.get('/api/app/config', (req, res) => {
  res.json({
    heartbeatIntervalMs: 15000,
    presenceTimeoutMs: 25000,
    maxUploadSizeBytes: 200 * 1024 * 1024,
    stunServers: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    timestamp: Date.now()
  });
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.MAIN_APP_BACKEND_PORT || 3011;
  app.use(express.json());
  app.use(mainApplicationRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏢 MainApplication Dedicated Backend running on port ${PORT}`);
  });
}

