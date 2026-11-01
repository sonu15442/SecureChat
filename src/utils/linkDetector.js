/**
 * SecureChat Advanced Fraud Link Detection Engine
 * Evaluates URLs for phishing risk, malware indicators, typosquatting, unencrypted protocol,
 * suspicious TLDs, IP formats, embedded credentials, dangerous ports/files, and known threat patterns.
 */

// Trusted white-listed base domains
export const KNOWN_SAFE_DOMAINS = [
  'google.com',
  'youtube.com',
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'microsoft.com',
  'apple.com',
  'icloud.com',
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
  'stripe.com',
  'chase.com',
  'wellsfargo.com',
  'bankofamerica.com',
  'citi.com',
  'gov.in',
  'nic.in'
];

// High-risk top-level domains frequently associated with scams/phishing
export const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.work', '.click', '.gq', '.tk', '.ml', '.cf', '.ga',
  '.fit', '.rest', '.pw', '.cn', '.zip', '.mov', '.cc', '.site', '.online',
  '.info', '.biz', '.icu', '.buzz', '.monster', '.bid', '.shop', '.tokyo',
  '.loan', '.date', '.racing', '.download', '.accountant', '.faith', '.cricket',
  '.party', '.trade', '.webcam', '.win', '.stream', '.gdn', '.mom', '.rodeo',
  '.kim', '.country', '.science', '.men', '.link', '.live', '.space', '.fun',
  '.support', '.zone', '.vip', '.sbs', '.cfd', '.quest', '.cam'
];

// Dangerous file extensions associated with drive-by malware payloads
export const DANGEROUS_EXTENSIONS = [
  '.exe', '.scr', '.bat', '.cmd', '.ps1', '.apk', '.vbs', '.iso', '.dmg',
  '.jar', '.msi', '.pif', '.hta', '.wsf', '.cpl', '.gadget', '.reg'
];

// Non-standard web ports commonly used by malicious C2 servers & rogue phishing kits
export const SUSPICIOUS_PORTS = ['8080', '8888', '8443', '3000', '1337', '6667', '8000', '9000', '5000', '4444', '9999'];

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

// Top brands monitored for algorithmic typosquatting
const MONITORED_BRANDS = [
  'google', 'paypal', 'apple', 'amazon', 'microsoft', 'facebook',
  'netflix', 'instagram', 'whatsapp', 'twitter', 'linkedin', 'binance',
  'coinbase', 'telegram', 'chase', 'wellsfargo', 'bankofamerica'
];

/**
 * Computes Levenshtein edit distance between two strings
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

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
 * Analyzes a single URL and returns rich risk assessment metrics with per-factor percentage and reasons
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
      riskFactors: [{
        title: 'Empty URL',
        desc: 'No URL was provided for analysis.',
        impactPercent: 90,
        whyItIsRisk: 'Cannot verify security parameters of an empty destination.',
        severity: 'high'
      }],
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
      riskFactors: [{
        title: 'Malformed URL Syntax',
        desc: 'The URL structure violates RFC standards and cannot be parsed safely.',
        impactPercent: 90,
        whyItIsRisk: 'Attackers craft syntactically broken URLs to exploit browser parsing bugs and bypass traditional firewall filters.',
        severity: 'high'
      }],
      safeFactors: [],
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  const protocol = parsedUrl.protocol;
  const rawHost = parsedUrl.hostname;
  const hostname = rawHost.toLowerCase();
  const pathname = parsedUrl.pathname.toLowerCase();
  const search = parsedUrl.search.toLowerCase();
  const fullPath = (pathname + search).toLowerCase();
  const port = parsedUrl.port;
  const username = parsedUrl.username;
  const password = parsedUrl.password;

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
      riskFactors: [{
        title: 'Unsafe Protocol Scheme',
        desc: `Protocol '${protocol}' is not a secure web standard (HTTP/HTTPS).`,
        impactPercent: 90,
        whyItIsRisk: 'Non-standard protocols (e.g., javascript:, data:, file:) execute arbitrary payloads or trigger unauthorized native system actions.',
        severity: 'high'
      }],
      safeFactors: [],
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // 1. Check Protocol Security (HTTPS vs HTTP)
  if (protocol === 'http:') {
    riskScore += 25;
    riskFactors.push({
      title: 'Unencrypted HTTP Connection',
      desc: 'This site does not use SSL/TLS encryption. All traffic is sent in cleartext.',
      impactPercent: 25,
      whyItIsRisk: 'Man-in-the-middle attackers on public Wi-Fi or cellular networks can eavesdrop, intercept logins, and inject malicious scripts.',
      severity: 'medium'
    });
  } else if (protocol === 'https:') {
    safeFactors.push('Uses secure HTTPS encryption (TLS)');
  }

  // 2. Embedded Userinfo / Credentials in URL (e.g. https://google.com@evil.com/login)
  if (username || password || (urlString.includes('@') && urlString.indexOf('@') < urlString.indexOf(hostname) + hostname.length)) {
    riskScore += 50;
    riskFactors.push({
      title: 'Embedded Userinfo / Deceptive Prefix',
      desc: 'The link contains embedded userinfo credentials before an "@" symbol.',
      impactPercent: 50,
      whyItIsRisk: 'Browsers treat text before "@" as basic authentication credentials and navigate to the domain after "@", misleading victims into believing they are visiting the brand shown in the prefix.',
      severity: 'critical'
    });
  }

  // 3. Raw IP Address Host Check (IPv4 / Decimal / Hex / IPv6)
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const isDecimalOrHexIp = /^0x[0-9a-f]+$/i.test(hostname) || /^[0-9]{8,12}$/.test(hostname);
  if (ipv4Regex.test(hostname) || isDecimalOrHexIp || hostname.startsWith('[') && hostname.endsWith(']')) {
    riskScore += 45;
    riskFactors.push({
      title: 'Raw IP Address Host',
      desc: `The destination uses a numeric IP address (${hostname}) instead of a verified registered domain.`,
      impactPercent: 45,
      whyItIsRisk: 'Legitimate services register branded domain names with SSL certificates. Attackers use direct IPs to evade domain reputation tracking, blacklists, and certificate transparency logging.',
      severity: 'high'
    });
  }

  // 4. Known Safe Domain Check
  const isKnownSafe = KNOWN_SAFE_DOMAINS.some(safeDomain => 
    hostname === safeDomain || hostname.endsWith('.' + safeDomain)
  ) || hostname.endsWith('.gov') || hostname.endsWith('.gov.in') || hostname.endsWith('.edu');

  if (isKnownSafe) {
    safeFactors.push(`Verified reputable domain (${hostname})`);
    // Lower risk score significantly if verified safe domain
    riskScore = Math.min(riskScore, 5);
  } else {
    // 5. Check for High-Risk TLDs
    const matchingTld = SUSPICIOUS_TLDS.find(tld => hostname.endsWith(tld));
    if (matchingTld) {
      riskScore += 35;
      riskFactors.push({
        title: `High-Risk TLD (${matchingTld})`,
        desc: `Top-level domain '${matchingTld}' is statistically dominated by spam and phishing campaigns.`,
        impactPercent: 35,
        whyItIsRisk: 'These TLDs offer ultra-low-cost or free registrations without identity verification, making them the primary choice for disposable threat actor infrastructure.',
        severity: 'high'
      });
    }

    // 6. Typosquatting / Character Substitution (e.g. g00gle, paypaI, micros0ft, wh4tsapp)
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
    const matchesPattern = typoPatterns.some(pattern => pattern.test(hostname));
    
    // Algorithmic edit distance against monitored brands
    const mainHostPart = hostname.split('.')[0];
    const isEditDistanceTyposquat = MONITORED_BRANDS.some(brand => {
      if (mainHostPart === brand) return false;
      const dist = levenshteinDistance(mainHostPart, brand);
      return dist === 1 || (brand.length > 5 && dist === 2);
    });

    if (hasCapitalIInName || matchesPattern || isEditDistanceTyposquat) {
      riskScore += 45;
      riskFactors.push({
        title: 'Typosquatting / Lookalike Brand',
        desc: 'The domain mimics a world-renowned brand using homoglyphs, visual trickery, or character substitutions.',
        impactPercent: 45,
        whyItIsRisk: 'Cybercriminals register lookalike domains to spoof trusted brand login portals and trick unsuspecting users into surrendering financial and account credentials.',
        severity: 'critical'
      });
    }

    // 7. Excessive Hyphens in Domain (e.g. paypal-security-account-verification.com)
    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      riskScore += 25;
      riskFactors.push({
        title: 'Excessive Hyphens in Domain',
        desc: `Domain contains ${hyphenCount} hyphens, a signature social engineering pattern.`,
        impactPercent: 25,
        whyItIsRisk: 'Legitimate organizations avoid hyphen-heavy domain names. Attackers string together security keywords with hyphens to look convincing on small mobile screens.',
        severity: 'medium'
      });
    }

    // 8. Brand Masquerading in Subdomains (e.g. paypal.com.evil-domain.com)
    const brandSpoofed = KNOWN_SAFE_DOMAINS.find(safe => {
      const brandWord = safe.replace(/\.(com|org|us|in)$/, '');
      return hostname.includes(brandWord) && !hostname.endsWith('.' + safe) && hostname !== safe;
    });
    if (brandSpoofed) {
      riskScore += 50;
      riskFactors.push({
        title: `Deceptive Brand Masquerading (${brandSpoofed})`,
        desc: `Attempts to impersonate '${brandSpoofed}' using subdomains or misleading path placement.`,
        impactPercent: 50,
        whyItIsRisk: 'The genuine brand name appears in the sub-host or path, but traffic routes to an unaffiliated server under the attacker\'s total control.',
        severity: 'critical'
      });
    }

    // 9. Punycode / IDN Homograph Spoofing (xn--)
    if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
      riskScore += 40;
      riskFactors.push({
        title: 'Punycode / Homograph Obfuscation (xn--)',
        desc: 'Uses Internationalized Domain Name (IDN) Punycode to substitute Cyrillic/Greek lookalike characters.',
        impactPercent: 40,
        whyItIsRisk: 'Visually renders identical to trusted English letters in web browsers, completely disguising a rogue foreign domain.',
        severity: 'high'
      });
    }

    // 10. Temporary Cloud / Tunneling Hosts (ngrok, duckdns, etc.)
    const tunnelHosts = [
      'ngrok.io', 'ngrok-free.app', 'duckdns.org', 'loca.lt', 'serveo.net',
      'glitch.me', 'firebaseapp.com', 'web.app', 'page.link', '000webhostapp.com'
    ];
    if (tunnelHosts.some(th => hostname.endsWith(th))) {
      riskScore += 30;
      riskFactors.push({
        title: 'Temporary Cloud / Tunneling Host',
        desc: 'Hosted on a free dynamic domain or tunneling relay.',
        impactPercent: 30,
        whyItIsRisk: 'Free tunnel and dynamic DNS domains are frequently stood up for short-lived phishing campaigns to bypass perimeter defense and IP blocklists.',
        severity: 'high'
      });
    }

    // 11. Excessive Subdomains (e.g. login.secure.verify.paypal.com.account-update.xyz)
    const subdomainParts = hostname.split('.');
    if (subdomainParts.length >= 4) {
      riskScore += 25;
      riskFactors.push({
        title: 'Multiple Subdomain Obfuscation',
        desc: `Domain contains ${subdomainParts.length} sub-levels to push the true top-level domain out of view.`,
        impactPercent: 25,
        whyItIsRisk: 'Hides the true authoritative domain off-screen on smartphones, deceiving users into reading only the initial reputable-looking prefix.',
        severity: 'high'
      });
    }

    // 12. URL Shortener check (bit.ly, tinyurl.com, etc.)
    if (URL_SHORTENERS.some(s => hostname === s || hostname.endsWith('.' + s))) {
      riskScore += 20;
      riskFactors.push({
        title: 'Shortened URL Obfuscation',
        desc: 'URL shortener hides the true destination host and landing page parameters.',
        impactPercent: 20,
        whyItIsRisk: 'Redirect chains mask malware payloads, credential harvesters, and malicious geo-targeted exploits from automated scanners.',
        severity: 'medium'
      });
    }

    // 13. Dangerous File Download Payload in Path (.exe, .apk, .scr, .iso, etc.)
    const matchingExt = DANGEROUS_EXTENSIONS.find(ext => pathname.endsWith(ext) || pathname.includes(ext + '?'));
    if (matchingExt) {
      riskScore += 45;
      riskFactors.push({
        title: `Executable / Dangerous Payload (${matchingExt})`,
        desc: `Direct link triggers download of an executable or installer package (${matchingExt}).`,
        impactPercent: 45,
        whyItIsRisk: 'Clicking this link initiates a drive-by malware download or trojan installation capable of compromising the local operating system.',
        severity: 'critical'
      });
    }

    // 14. Non-Standard High-Risk Web Ports
    if (port && SUSPICIOUS_PORTS.includes(port)) {
      riskScore += 30;
      riskFactors.push({
        title: `Non-Standard Port (:${port})`,
        desc: `Connection routes to an uncommon network port (:${port}) rather than standard ports 80/443.`,
        impactPercent: 30,
        whyItIsRisk: 'Non-standard ports are typical of rogue development servers, compromised hosts, or malware command-and-control (C2) listeners.',
        severity: 'high'
      });
    }

    // 15. Phishing Keywords in Hostname or Path
    const foundKeywords = PHISHING_KEYWORDS.filter(kw => hostname.includes(kw) || fullPath.includes(kw));
    if (foundKeywords.length > 0) {
      const severity = foundKeywords.length > 1 ? 'critical' : 'high';
      const addedScore = Math.min(50, foundKeywords.length * 20);
      riskScore += addedScore;
      riskFactors.push({
        title: `Phishing Keywords (${foundKeywords.slice(0, 4).join(', ')})`,
        desc: 'Contains high-risk credential-harvesting, urgency, or account-suspension terms.',
        impactPercent: addedScore,
        whyItIsRisk: 'Social engineering links incorporate urgent security and banking keywords to induce panic and persuade users to enter sensitive credentials.',
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
