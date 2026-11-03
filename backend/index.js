import express from 'express';
import { fileURLToPath } from 'url';
import { cryptoRouter } from './cryptoBackend.js';
import { fraudRouter } from './fraudBackend.js';
import { callRouter } from './callBackend.js';
import { storageRouter } from './storageBackend.js';
import { deviceRouter } from './deviceBackend.js';
import { userRouter } from './userBackend.js';
import { messageRouter } from './messageBackend.js';
import { mergedMobileBackendRouter, allMobileBackends } from '../android/app/src/main/java/com/securechat/mobile/MergedMobileBackend.js';
import { sseClients, broadcastEvent, activePresenceMap } from './sharedState.js';

export const backendModules = {
  crypto: cryptoRouter,
  fraud: fraudRouter,
  call: callRouter,
  storage: storageRouter,
  device: deviceRouter,
  user: userRouter,
  message: messageRouter,
  ...allMobileBackends
};

export const mergedBackend = express.Router();

// Mount all modular backend services into the unified router
mergedBackend.use(mergedMobileBackendRouter);
mergedBackend.use(cryptoRouter);
mergedBackend.use(fraudRouter);
mergedBackend.use(callRouter);
mergedBackend.use(storageRouter);
mergedBackend.use(deviceRouter);
mergedBackend.use(userRouter);
mergedBackend.use(messageRouter);

// Standalone execution support for the Merged Master Gateway
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ extended: true, limit: '200mb' }));

  // CORS support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // Mount merged backend
  app.use(mergedBackend);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n===============================================================`);
    console.log(`🚀 SecureChat Merged Gateway Backend running on port ${PORT}`);
    console.log(`   - CryptoSecurity Backend  : /api/crypto/*`);
    console.log(`   - FraudDetection Backend  : /api/fraud/*`);
    console.log(`   - Calling & WebRTC Backend: /api/call/*`);
    console.log(`   - SecureStorage Backend   : /api/sync/*`);
    console.log(`   - Device Telemetry Backend: /api/device/*`);
    console.log(`   - User & Auth Backend     : /api/auth/* & /api/users/*`);
    console.log(`   - Message & Moments Backend: /api/messages/* & /api/moments/*`);
    console.log(`===============================================================\n`);
  });
}

