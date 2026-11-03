import express from 'express';
import { fileURLToPath } from 'url';

/**
 * BackendApiClientBackend.js
 * Dedicated Backend Service for BackendApiClient.java
 * Handles server health, connection latency probes, and mobile client configuration.
 */
export const backendApiClientRouter = express.Router();

backendApiClientRouter.get('/api/server/info', (req, res) => {
  res.json({
    status: 'online',
    type: 'unified_database',
    version: '2.0.0',
    platform: 'mobile_and_web',
    timestamp: Date.now()
  });
});

backendApiClientRouter.get('/api/client/ping', (req, res) => {
  res.json({
    pong: true,
    serverTime: Date.now(),
    clientIp: req.ip || req.connection.remoteAddress
  });
});

backendApiClientRouter.get('/api/client/config', (req, res) => {
  res.json({
    appName: 'SecureChat',
    minClientVersion: '1.0.0',
    supportedFeatures: ['e2ee', 'voice_call', 'video_call', 'fraud_shield', 'vault_sync'],
    timestamp: Date.now()
  });
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.API_CLIENT_BACKEND_PORT || 3010;
  app.use(express.json());
  app.use(backendApiClientRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 BackendApiClient Dedicated Backend running on port ${PORT}`);
  });
}

