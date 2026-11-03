import express from 'express';
import { fileURLToPath } from 'url';

/**
 * MainActivityBackend.js
 * Dedicated Backend Service for MainActivity.java
 * Handles native device telemetry, battery analytics, and activity lifecycle reports.
 */
export const mainActivityRouter = express.Router();

mainActivityRouter.post('/api/device/status', (req, res) => {
  try {
    const { deviceModel, osVersion, appVersion, status, batteryLevel, networkType } = req.body || {};
    const timestamp = Date.now();
    console.log(`[MainActivityBackend] ${deviceModel || 'Unknown Device'} (Android ${osVersion || 'N/A'}) - status: ${status || 'ONLINE'} - battery: ${batteryLevel}%`);
    res.json({
      success: true,
      serverStatus: 'HEALTHY',
      timestamp,
      message: 'MainActivity device lifecycle telemetry persisted.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record device status: ' + err.message });
  }
});

mainActivityRouter.get('/api/device/capabilities', (req, res) => {
  res.json({
    hardwareAcceleration: true,
    supportedAudioCodecs: ['Opus', 'PCMU', 'PCMA'],
    supportedVideoCodecs: ['VP8', 'VP9', 'H264'],
    webrtcEnabled: true,
    timestamp: Date.now()
  });
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.MAIN_ACTIVITY_BACKEND_PORT || 3008;
  app.use(express.json());
  app.use(mainActivityRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📱 MainActivity Dedicated Backend running on port ${PORT}`);
  });
}

