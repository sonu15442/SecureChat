import { describe, it, expect } from 'vitest';
import { extractUrls, analyzeUrl } from './linkDetector';

describe('SecureChat Fraud Link Detector', () => {
  describe('extractUrls', () => {
    it('extracts standard http and https URLs from text', () => {
      const text = 'Check out https://github.com and http://example.com/test';
      const urls = extractUrls(text);
      expect(urls).toEqual(['https://github.com', 'http://example.com/test']);
    });

    it('adds https:// prefix to www. domains', () => {
      const text = 'Visit www.google.com today';
      const urls = extractUrls(text);
      expect(urls).toEqual(['https://www.google.com']);
    });

    it('returns empty array when text has no URLs', () => {
      expect(extractUrls('Hello world, no links here!')).toEqual([]);
      expect(extractUrls('')).toEqual([]);
      expect(extractUrls(null)).toEqual([]);
    });
  });

  describe('analyzeUrl', () => {
    it('flags trusted whitelist domains as safe', () => {
      const result = analyzeUrl('https://github.com/facebook/react');
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('safe');
      expect(result.riskPercentage).toBeLessThan(25);
      expect(result.safePercentage).toBeGreaterThan(75);
    });

    it('flags unencrypted HTTP connection as medium risk', () => {
      const result = analyzeUrl('http://my-blog-example.org');
      expect(result.riskFactors.some(rf => rf.title.includes('Unencrypted HTTP'))).toBe(true);
    });

    it('flags raw IP address hosts as high risk', () => {
      const result = analyzeUrl('http://192.168.1.100/login');
      expect(result.riskFactors.some(rf => rf.title.includes('IP Address'))).toBe(true);
      expect(result.status).toBe('dangerous');
    });

    it('flags high-risk TLDs (.xyz, .click, etc.)', () => {
      const result = analyzeUrl('https://free-crypto-airdrop.xyz');
      expect(result.riskFactors.some(rf => rf.title.includes('High-Risk TLD'))).toBe(true);
    });

    it('flags typosquatting brand imitations (e.g., paypaI, g00gle)', () => {
      const result = analyzeUrl('https://paypaI-verify.net/account');
      expect(result.riskFactors.some(rf => rf.title.includes('Typosquatting'))).toBe(true);
      expect(result.status).toBe('dangerous');
    });

    it('flags embedded userinfo credentials in URL', () => {
      const result = analyzeUrl('https://google.com@phishing-target.com/login');
      expect(result.riskFactors.some(rf => rf.title.includes('Embedded Userinfo'))).toBe(true);
      expect(result.status).toBe('dangerous');
    });

    it('flags dangerous executable and script download payloads', () => {
      const result = analyzeUrl('https://download-bonus.com/update.apk');
      expect(result.riskFactors.some(rf => rf.title.includes('Dangerous Payload'))).toBe(true);
      expect(result.status).toBe('dangerous');
    });

    it('flags non-standard web ports', () => {
      const result = analyzeUrl('http://login-server.org:8080/auth');
      expect(result.riskFactors.some(rf => rf.title.includes('Non-Standard Port'))).toBe(true);
    });

    it('populates impactPercent and whyItIsRisk fields on all detected risk factors', () => {
      const result = analyzeUrl('http://paypaI-security.xyz:8080/verify-account/payload.exe');
      expect(result.riskFactors.length).toBeGreaterThan(0);
      result.riskFactors.forEach(factor => {
        expect(typeof factor.impactPercent).toBe('number');
        expect(factor.impactPercent).toBeGreaterThan(0);
        expect(typeof factor.whyItIsRisk).toBe('string');
        expect(factor.whyItIsRisk.length).toBeGreaterThan(10);
      });
    });

    it('handles malformed URLs gracefully', () => {
      const result = analyzeUrl('htt://invalid-url');
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('dangerous');
      expect(result.riskPercentage).toBeGreaterThanOrEqual(90);
    });
  });
});
