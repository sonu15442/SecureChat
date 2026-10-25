/**
 * SecureChat Advanced Fraud Link Detection Engine
 * Evaluates URLs for phishing risk, malware indicators, typosquatting, unencrypted protocol,
 * suspicious TLDs, IP formats, and known threat patterns.
 */

// Trusted white-listed base domains
export const KNOWN_SAFE_DOMAINS = [
  'google.com',
  'youtube.com',
  'github.com',
  'microsoft.com',
  'apple.com',
  'amazon.com',
  'wikipedia.org',
  'whatsapp.com',
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'stackoverflow.com',
  'medium.com',
  'reddit.com',
  'openai.com',
  'cloudflare.com',
  'netflix.com',
  'spotify.com',
  'zoom.us',
  'dropbox.com',
  'paypal.com',
  'chase.com',
  'wellsfargo.com',
  'bankofamerica.com'
];

// High-risk top-level domains frequently associated with scams/phishing
export const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.work', '.click', '.gq', '.tk', '.ml', '.cf', '.ga',
  '.fit', '.rest', '.pw', '.cn', '.zip', '.mov', '.cc', '.site', '.online',
  '.info', '.biz', '.icu', '.buzz', '.monster', '.bid', '.shop', '.tokyo',
  '.loan', '.date', '.racing', '.download', '.accountant', '.faith', '.cricket',
  '.party', '.trade', '.webcam', '.win', '.stream', '.gdn', '.mom', '.rodeo',
  '.kim', '.country', '.science', '.men', '.link', '.live', '.space', '.fun'
];

// Keywords commonly found in fraudulent phishing links & social engineering
export const PHISHING_KEYWORDS = [
  // Authentication & Credentials
  'login', 'signin', 'sign-in', 'log-in', 'auth', 'authorize', 'authentication',
  'verify', 'verification', 'verify-account', 'confirm-identity', 'kyc-verify',
  'passcode', 'password-reset', 'reset-password', 'change-password', 'security-alert',
  'suspicious-activity', 'account-suspended', 'account-locked', 'unlock-account',
  'session-expired', 're-login', 'credential', 'otp', '2fa', 'mfa', 'pin-code',

  // Financial & Banking
  'banking', 'online-banking', 'wire-transfer', 'direct-deposit', 'bank-statement',
  'paypal', 'paypaI', 'venmo', 'zelle', 'cashapp', 'stripe', 'square',
  'chase-online', 'wellsfargo-verify', 'bofa-auth', 'citi-bank', 'barclays-online',
  'revolut-verify', 'invoice', 'overdue', 'bill-pay', 'refund', 'tax-refund',
  'irs-gov', 'hmrc-tax', 'treasury', 'unclaimed-funds', 'chargeback',

  // Crypto & Web3 Scams
  'crypto', 'wallet-connect', 'walletconnect', 'seedphrase', 'secret-recovery',
  'private-key', 'airdrop', 'claim-airdrop', 'free-crypto', 'token-claim',
  'metamask-auth', 'trustwallet-verify', 'binance-bonus', 'coinbase-reward',
  'ledger-live-update', 'phantom-wallet', 'nft-mint-free', 'staking-bonus',

  // Prizes, Rewards & Urgency
  'claim', 'prize', 'winner', 'reward', 'gift', 'bonus', 'free', 'jackpot',
  'lottery', 'voucher', 'promo-code', 'free-giftcard', 'amazon-reward',
  'urgent', 'immediate-action', 'action-required', 'account-termination',
  'legal-notice', 'court-summons', 'copyright-infringement', 'dmca-takedown',

  // Brand Lookalikes & Delivery Spoofs
  'netfIIx', 'g00gle', 'micros0ft', 'meta-verify', 'wh4tsapp', 'whats-app',
  'telegram-secure', 'instagram-badge', 'blue-badge-verify', 'tiktok-creator',
  'dhl-tracking', 'fedex-parcel', 'ups-delivery', 'usps-package', 'customs-fee',
  'postal-code', 'package-held', 'delivery-reschedule'
];

// Popular URL shorteners (moderate opacity/risk as target is obfuscated)
export const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'is.gd', 'cutt.ly', 'rb.gy', 't.co', 'ow.ly', 'buff.ly',
  'shorturl.at', 'rebrand.ly', 'bl.ink'
];

/**
 * Extracts all URLs from a text string
 */
export function extractUrls(text) {
  if (!text) return [];
  // Regex to match URLs starting with http://, https:// or www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => {
    let cleanUrl = url.trim().replace(/[.,;!?]+$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    return cleanUrl;
  });
}

/**
 * Analyzes a single URL and returns rich risk assessment metrics
 */
export function analyzeUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return {
      url: '',
      isValid: false,
      isSafe: false,
      riskPercentage: 90,
      safePercentage: 10,
      score: 10,
      riskLevel: 'dangerous',
      status: 'dangerous',
      reasons: ['No URL provided'],
      domain: 'Unknown',
      hostname: 'Unknown',
      protocol: 'unknown',
      riskFactors: [{ title: 'Empty URL', desc: 'No URL was provided for analysis', severity: 'high' }],
      safeFactors: [],
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  let riskScore = 0;
  const riskFactors = [];
  const safeFactors = [];

  let parsedUrl;
  try {
    const toParse = urlString.trim().startsWith('www.') ? 'https://' + urlString.trim() : urlString.trim();
    parsedUrl = new URL(toParse);
  } catch (e) {
    return {
      url: urlString,
      isValid: false,
      isSafe: false,
      riskPercentage: 90,
      safePercentage: 10,
      score: 10,
      riskLevel: 'dangerous',
      status: 'dangerous',
      reasons: ['Invalid or malformed URL structure'],
      domain: 'Unknown',
      hostname: 'Unknown',
      protocol: 'unknown',
      riskFactors: [{ title: 'Malformed URL', desc: 'The URL structure is syntactically invalid.', severity: 'high' }],
      safeFactors: [],
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  const protocol = parsedUrl.protocol;
  const rawHost = parsedUrl.hostname;
  const hostname = rawHost.toLowerCase();
  const fullPath = (parsedUrl.pathname + parsedUrl.search).toLowerCase();

  // Validate protocol is web-standard http/https
  if (protocol !== 'http:' && protocol !== 'https:') {
    return {
      url: urlString,
      isValid: false,
      isSafe: false,
      riskPercentage: 90,
      safePercentage: 10,
      score: 10,
      riskLevel: 'dangerous',
      status: 'dangerous',
      reasons: ['Non-standard or unsafe protocol'],
      domain: hostname || 'Unknown',
      hostname: hostname || 'Unknown',
      protocol,
      riskFactors: [{ title: 'Unsafe Protocol', desc: 'Protocol is not HTTP/HTTPS.', severity: 'high' }],
      safeFactors: [],
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // 1. Check Protocol Security
  if (protocol === 'http:') {
    riskScore += 25;
    riskFactors.push({
      title: 'Unencrypted HTTP Connection',
      desc: 'This site does not use SSL/TLS encryption. Data transmitted can be intercepted.',
      severity: 'medium'
    });
  } else if (protocol === 'https:') {
    safeFactors.push('Uses secure HTTPS encryption (TLS)');
  }

  // 2. IP Address check (e.g. http://192.168.1.1 or http://45.33.1.2)
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipRegex.test(hostname)) {
    riskScore += 45;
    riskFactors.push({
      title: 'Raw IP Address Host',
      desc: 'Legitimate services use standard domain names. IP addresses are heavily correlated with phishing/botnets.',
      severity: 'high'
    });
  }

  // 3. Known Safe Domain Check
  const isKnownSafe = KNOWN_SAFE_DOMAINS.some(safeDomain => 
    hostname === safeDomain || hostname.endsWith('.' + safeDomain)
  );

  if (isKnownSafe) {
    safeFactors.push(`Verified reputable domain (${hostname})`);
    // Lower risk score significantly if verified safe domain
    riskScore = Math.min(riskScore, 5);
  } else {
    // 4. Check for High Risk TLDs
    const matchingTld = SUSPICIOUS_TLDS.find(tld => hostname.endsWith(tld));
    if (matchingTld) {
      riskScore += 35;
      riskFactors.push({
        title: `High-Risk TLD (${matchingTld})`,
        desc: `Top-level domain '${matchingTld}' is statistically associated with abuse & fraud campaigns.`,
        severity: 'high'
      });
    }

    // 5. Typosquatting / Character Substitution (e.g. g00gle, paypaI, micros0ft)
    const typoPatterns = [
      /g[0o]{2}gl/i,
      /payp[a|i|1]l/i,
      /m[i|1]cr[o|0]s[o|0]ft/i,
      /wh[a|4]ts[a|4]pp/i,
      /f[a|4]ceb[o|0]{2}k/i,
      /n[e|3]tfl[i|1]x/i,
      /am[a|4]z[o|0]n/i,
      /app[l|1][e|3]/i
    ];
    const hasCapitalIInName = urlString.includes('paypaI') || urlString.includes('g00gle') || (urlString.includes('I') && /paypal|google|netflix|amazon|apple|microsoft/i.test(hostname));
    if (hasCapitalIInName || typoPatterns.some(pattern => pattern.test(hostname))) {
      riskScore += 45;
      riskFactors.push({
        title: 'Typosquatting / Lookalike Brand',
        desc: 'The domain uses misleading character substitutions to impersonate a trusted brand.',
        severity: 'critical'
      });
    }

    // 6. Excessive Hyphens or Numbers in Domain (e.g., paypal-secure-login-user.com)
    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      riskScore += 25;
      riskFactors.push({
        title: 'Excessive Hyphens in Domain',
        desc: 'Domain contains multiple hyphens, a common pattern in deceptive phishing domains.',
        severity: 'medium'
      });
    }

    // 7. Brand Spoofing in Subdomains or Path (e.g. paypal.com.evil-domain.com)
    const brandSpoofed = KNOWN_SAFE_DOMAINS.find(safe => {
      // If it contains the safe domain but does NOT end with .safeDomain and is not safeDomain itself
      return hostname.includes(safe.replace('.com', '')) && !hostname.endsWith('.' + safe) && hostname !== safe;
    });
    if (brandSpoofed) {
      riskScore += 50;
      riskFactors.push({
        title: `Deceptive Brand Masquerading (${brandSpoofed})`,
        desc: `This link attempts to mimic '${brandSpoofed}' using deceptive subdomains or path routing.`,
        severity: 'critical'
      });
    }

    // 8. Punycode / IDN Homograph Attack (xn--)
    if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
      riskScore += 40;
      riskFactors.push({
        title: 'Punycode / Homograph Obfuscation',
        desc: 'Uses internationalized character encoding that visually impersonates legitimate letters.',
        severity: 'high'
      });
    }

    // 9. Free Tunnel / Dynamic DNS Phishing Hosts
    const tunnelHosts = ['ngrok.io', 'ngrok-free.app', 'duckdns.org', 'loca.lt', 'serveo.net', 'glitch.me', 'firebaseapp.com', 'web.app', 'page.link'];
    if (tunnelHosts.some(th => hostname.endsWith(th))) {
      riskScore += 30;
      riskFactors.push({
        title: 'Temporary Cloud / Tunneling Host',
        desc: 'Hosted on a free dynamic domain frequently abused for short-lived phishing campaigns.',
        severity: 'high'
      });
    }

    // 10. Excessive Subdomains (e.g. login.verify.paypal.com.evil.xyz)
    const subdomainParts = hostname.split('.');
    if (subdomainParts.length >= 4) {
      riskScore += 25;
      riskFactors.push({
        title: 'Multiple Subdomain Obfuscation',
        desc: 'Excessive subdomains used to hide the true root domain authority.',
        severity: 'high'
      });
    }

    // 11. URL Shortener check
    if (URL_SHORTENERS.some(s => hostname === s || hostname.endsWith('.' + s))) {
      riskScore += 20;
      riskFactors.push({
        title: 'Shortened URL Obfuscation',
        desc: 'Shortened link conceals the final target URL endpoint.',
        severity: 'medium'
      });
    }

    // 12. Phishing Keywords in Hostname or Path
    const foundKeywords = PHISHING_KEYWORDS.filter(kw => hostname.includes(kw) || fullPath.includes(kw));
    if (foundKeywords.length > 0) {
      const severity = foundKeywords.length > 1 ? 'critical' : 'high';
      riskScore += Math.min(50, foundKeywords.length * 20);
      riskFactors.push({
        title: `Phishing Keywords (${foundKeywords.slice(0, 4).join(', ')})`,
        desc: 'Contains high-risk credential-harvesting or scam keywords.',
        severity
      });
    }
  }

  // Calculate final percentage bounded between 2% and 98%
  const finalRisk = Math.min(98, Math.max(2, riskScore));
  const finalSafe = 100 - finalRisk;

  let status = 'safe'; // 'safe', 'suspicious', 'dangerous'
  if (finalRisk >= 50) {
    status = 'dangerous';
  } else if (finalRisk >= 25) {
    status = 'suspicious';
  }

  const isSafe = status === 'safe';
  // Normalize riskLevel to UPPERCASE for compatibility with DANGEROUS / SUSPICIOUS checks
  const riskLevel = status.toUpperCase();
  const reasons = [
    ...riskFactors.map(f => `${f.title}: ${f.desc}`),
    ...(safeFactors.length > 0 ? safeFactors : [])
  ];

  return {
    url: urlString,
    isValid: true,
    isSafe,
    domain: hostname,
    hostname,
    protocol,
    riskPercentage: finalRisk,
    safePercentage: finalSafe,
    score: finalSafe,
    riskLevel,
    status,
    reasons,
    riskFactors,
    safeFactors,
    scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
