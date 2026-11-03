import express from 'express';
import { fileURLToPath } from 'url';
import { mobileDeviceVaults } from './sharedState.js';

export const storageRouter = express.Router();

/**
 * POST /api/sync/storage
 * Encrypted vault backup for SecureStorageModule.java & Web
 */
storageRouter.post('/api/sync/storage', (req, res) => {
  try {
    const { userId, vaultData } = req.body || {};
    if (!userId || !vaultData) {
      return res.status(400).json({ error: 'userId and vaultData required' });
    }

    mobileDeviceVaults.set(userId, {
      vaultData,
      updatedAt: Date.now()
    });

    res.json({
      success: true,
      userId,
      syncedAt: Date.now(),
      message: 'Vault encrypted backup successfully persisted on backend.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sync/storage/:userId
 * Encrypted vault restore for SecureStorageModule.java & Web
 */
storageRouter.get('/api/sync/storage/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const record = mobileDeviceVaults.get(userId);
    if (!record) {
      return res.status(404).json({ error: 'No cloud vault found for user.' });
    }
    res.json({
      success: true,
      userId,
      vaultData: record.vaultData,
      updatedAt: record.updatedAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sync/status
 * Storage health status for SecureStorageModule.java
 */
storageRouter.post('/api/sync/status', (req, res) => {
  try {
    const { userId, itemCount } = req.body || {};
    console.log(`[Storage Vault Status] userId=${userId} itemsStored=${itemCount}`);
    res.json({ success: true, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.STORAGE_BACKEND_PORT || 3007;
  app.use(express.json());
  app.use(storageRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`💾 SecureStorage Dedicated Backend running on port ${PORT}`);
  });
}
