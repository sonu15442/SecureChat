import express from 'express';
import { fileURLToPath } from 'url';

// 1. Import all 10 dedicated module backends
import { backendApiClientRouter } from './BackendApiClientBackend.js';
import { cryptoSecurityModuleRouter } from './CryptoSecurityModuleBackend.js';
import { fraudDetectionModuleRouter } from './FraudDetectionModuleBackend.js';
import { mainActivityRouter } from './MainActivityBackend.js';
import { mainApplicationRouter } from './MainApplicationBackend.js';
import { secureChatPackageRouter } from './SecureChatPackageBackend.js';
import { secureStorageModuleRouter } from './SecureStorageModuleBackend.js';
import { videoCallModuleRouter } from './VideoCallModuleBackend.js';
import { voiceCallModuleRouter } from './VoiceCallModuleBackend.js';
import { webRTCManagerRouter } from './WebRTCManagerBackend.js';

export const allMobileBackends = {
  backendApiClient: backendApiClientRouter,
  cryptoSecurityModule: cryptoSecurityModuleRouter,
  fraudDetectionModule: fraudDetectionModuleRouter,
  mainActivity: mainActivityRouter,
  mainApplication: mainApplicationRouter,
  secureChatPackage: secureChatPackageRouter,
  secureStorageModule: secureStorageModuleRouter,
  videoCallModule: videoCallModuleRouter,
  voiceCallModule: voiceCallModuleRouter,
  webRTCManager: webRTCManagerRouter
};

export const mergedMobileBackendRouter = express.Router();

// Mount all 10 backends into unified router
mergedMobileBackendRouter.use(backendApiClientRouter);
mergedMobileBackendRouter.use(cryptoSecurityModuleRouter);
mergedMobileBackendRouter.use(fraudDetectionModuleRouter);
mergedMobileBackendRouter.use(mainActivityRouter);
mergedMobileBackendRouter.use(mainApplicationRouter);
mergedMobileBackendRouter.use(secureChatPackageRouter);
mergedMobileBackendRouter.use(secureStorageModuleRouter);
mergedMobileBackendRouter.use(videoCallModuleRouter);
mergedMobileBackendRouter.use(voiceCallModuleRouter);
mergedMobileBackendRouter.use(webRTCManagerRouter);

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.MERGED_MOBILE_PORT || 3015;
  app.use(express.json({ limit: '200mb' }));
  app.use(mergedMobileBackendRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✨ Merged Native Mobile Backend running on port ${PORT}`);
    console.log(`   Connected 10 native Java modules directly to merged backend.`);
  });
}

