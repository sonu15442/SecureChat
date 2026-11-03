import express from 'express';
import { createHash, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { clientPublicKeys } from './sharedState.js';

export const cryptoRouter = express.Router();

/**
 * POST /api/crypto/verify
 * Cryptographic hash attestation for CryptoSecurityModule.java & Web
 */
cryptoRouter.post('/api/crypto/verify', (req, res) => {
  try {
    const { input, hash } = req.body || {};
    if (!input || !hash) {
      return res.status(400).json({ error: 'input and hash required' });
    }

    const serverHash = createHash('sha256').update(input, 'utf8').digest('hex');
    const verified = serverHash.toLowerCase() === hash.toLowerCase();

    res.json({
      success: true,
      verified,
      serverHash,
      algorithm: 'SHA-256',
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crypto/key-exchange
 * Public key registration for CryptoSecurityModule.java & Web
 */
cryptoRouter.post('/api/crypto/key-exchange', (req, res) => {
  try {
    const { userId, clientPublicKey } = req.body || {};
    if (!userId || !clientPublicKey) {
      return res.status(400).json({ error: 'userId and clientPublicKey required' });
    }

    clientPublicKeys.set(userId, { clientPublicKey, registeredAt: Date.now() });
    res.json({
      success: true,
      userId,
      serverSessionToken: randomBytes(16).toString('hex'),
      registeredAt: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crypto/audit
 * Auditing endpoint for native cryptographic calculations
 */
cryptoRouter.post('/api/crypto/audit', (req, res) => {
  try {
    const { sample, entropy, algorithm } = req.body || {};
    console.log(`[Crypto Backend Audit] Sample: "${(sample || '').substring(0, 20)}..." | Entropy: ${entropy} | Alg: ${algorithm || 'AES/SHA256'}`);
    res.json({ success: true, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.CRYPTO_BACKEND_PORT || 3004;
  app.use(express.json());
  app.use(cryptoRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️ CryptoSecurity Dedicated Backend running on port ${PORT}`);
  });
}
