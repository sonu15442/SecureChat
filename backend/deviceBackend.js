import express from 'express';
import { fileURLToPath } from 'url';

export const deviceRouter = express.Router();

/**
 * POST /api/device/status
 * Telemetry endpoint for MainActivity and MainApplication native startup
 */
deviceRouter.post('/api/device/status', (req, res) => {
  try {
    const { deviceModel, osVersion, appVersion, status, batteryLevel, networkType } = req.body || {};
    const timestamp = Date.now();
    console.log(`[Device Telemetry] ${deviceModel || 'Unknown Device'} (Android ${osVersion || 'N/A'}) - status: ${status || 'ONLINE'}`);
    res.json({
      success: true,
      serverStatus: 'HEALTHY',
      timestamp,
      message: 'Native device status recorded.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record device status: ' + err.message });
  }
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.DEVICE_BACKEND_PORT || 3008;
  app.use(express.json());
  app.use(deviceRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📱 Device Telemetry Dedicated Backend running on port ${PORT}`);
  });
}

