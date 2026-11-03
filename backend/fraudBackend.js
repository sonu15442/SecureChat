import express from 'express';
import { fileURLToPath } from 'url';
import { fraudThreatReports } from './sharedState.js';

export const fraudRouter = express.Router();

const SUSPICIOUS_TLDS = ['.zip', '.mov', '.top', '.xyz', '.work', '.click', '.link', '.kim', '.country', '.gq', '.cf', '.tk', '.ml'];
const PHISHING_KEYWORDS = ['verify', 'login', 'account', 'update', 'banking', 'secure', 'free', 'gift', 'crypto', 'bonus', 'winner', 'wallet', 'claim', 'urgent'];

/**
 * POST /api/fraud/report
 * Accepts threat analysis reports from FraudDetectionModule.java & Web
 */
fraudRouter.post('/api/fraud/report', (req, res) => {
  try {
    const { url, score, verdict, reasons, reportedBy } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL required' });

    const report = {
      id: 'threat_' + Date.now(),
      url,
      score: score || 0,
      verdict: verdict || 'UNKNOWN',
      reasons: reasons || [],
      reportedBy: reportedBy || 'NativeFraudDetectionModule',
      timestamp: new Date().toISOString()
    };

    fraudThreatReports.push(report);
    console.log(`[Fraud Alert Reported] URL: ${url} | Verdict: ${report.verdict} (Score: ${report.score})`);
    res.json({ success: true, reportId: report.id, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/fraud/check
 * Server-side link inspection for FraudDetectionModule.java & Web
 */
fraudRouter.post('/api/fraud/check', (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL required' });

    const lower = url.toLowerCase();
    let score = 0;
    const reasons = [];

    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(lower)) {
      score += 40;
      reasons.push('Direct numeric IP address host');
    }

    for (const tld of SUSPICIOUS_TLDS) {
      if (lower.includes(tld)) {
        score += 25;
        reasons.push(`Suspicious top-level domain: ${tld}`);
        break;
      }
    }

    let kwHits = 0;
    for (const kw of PHISHING_KEYWORDS) {
      if (lower.includes(kw)) kwHits++;
    }
    if (kwHits > 0) {
      score += Math.min(kwHits * 15, 30);
      reasons.push(`Matched ${kwHits} phishing/credential lure keyword(s)`);
    }

    const finalScore = Math.min(score, 100);
    const verdict = finalScore >= 60 ? 'DANGEROUS' : (finalScore >= 30 ? 'SUSPICIOUS' : 'SAFE');

    res.json({
      url,
      score: finalScore,
      verdict,
      reasons,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fraud/rules
 * Supplies latest threat intelligence rules for native module & web
 */
fraudRouter.get('/api/fraud/rules', (req, res) => {
  res.json({
    suspiciousTlds: SUSPICIOUS_TLDS,
    phishingKeywords: PHISHING_KEYWORDS,
    maxUrlLength: 80,
    entropyThreshold: 3.8
  });
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = express();
  const PORT = process.env.FRAUD_BACKEND_PORT || 3005;
  app.use(express.json());
  app.use(fraudRouter);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔍 FraudDetection Dedicated Backend running on port ${PORT}`);
  });
}

