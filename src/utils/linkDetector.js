/**
 * SecureChat Advanced Fraud Link Detection Engine
 * Evaluates URLs for phishing risk, malware indicators, typosquatting, unencrypted protocol,
 * suspicious TLDs, IP formats, and known threat patterns.
 */

// Trusted white-listed base domains
const KNOWN_SAFE_DOMAINS = [
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
  'cloudflare.com'
];

// High-risk top-level domains frequently associated with scams/phishing
const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.work', '.click', '.gq', '.tk', '.ml', '.cf', '.ga',
  '.fit', '.rest', '.pw', '.cn', '.zip', '.mov', '.cc', '.site', '.online',
  '.info', '.biz', '.icu', '.buzz', '.monster', '.bid', '.shop'
];

// Keywords commonly found in fraudulent phishing links
const PHISHING_KEYWORDS = [
  'login', 'verify', 'account', 'security', 'update', 'banking', 'secure',
  'claim', 'prize', 'winner', 'reward', 'gift', 'bonus', 'free', 'airdrop',
  'crypto', 'wallet-connect', 'seedphrase', 'support', 'helpdesk', 'paypal',
  'netfIIx', 'g00gle', 'paypaI', 'micros0ft', 'meta-verify', 'passcode', 'urgent'
];

// Popular URL shorteners (moderate opacity/risk as target is obfuscated)
const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'is.gd', 'cutt.ly', 'rb.gy', 't.co', 'ow.ly', 'buff.ly'
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
 * Analyzes a single URL and returns risk assessment metrics
 */
export function analyzeUrl(urlString) {
  let riskScore = 0;
  const riskFactors = [];
  const safeFactors = [];

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (e) {
    return {
      url: urlString,
      isValid: false,
      riskPercentage: 90,
      safePercentage: 10,
      status: 'dangerous',
      reasons: ['Invalid or malformed URL structure'],
      domain: 'Unknown'
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
      riskPercentage: 90,
      safePercentage: 10,
      status: 'dangerous',
      reasons: ['Non-standard or unsafe protocol'],
      domain: hostname || 'Unknown'
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
    safeFactors.push('Uses secure HTTPS encryption');
  }

  // 2. IP Address check (e.g. http://192.168.1.1 or http://45.33.1.2)
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipRegex.test(hostname)) {
    riskScore += 40;
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
    safeFactors.push(`Verified domain (${hostname})`);
    // Drastically lower risk score if verified safe domain
    riskScore = Math.min(riskScore, 5);
  } else {
    // 4. Check for High Risk TLDs
    const matchingTld = SUSPICIOUS_TLDS.find(tld => hostname.endsWith(tld));
    if (matchingTld) {
      riskScore += 30;
      riskFactors.push({
        title: `High-Risk TLD (${matchingTld})`,
        desc: `Top-level domain '${matchingTld}' is statistically associated with abuse & phishing campaigns.`,
        severity: 'high'
      });
    }

    // 5. Typosquatting / Character Substitution (e.g. g00gle, paypaI, micros0ft)
    const typoPatterns = [/g[0o]{2}gl/i, /payp[a|i|1]l/i, /m[i|1]cr[o|0]s[o|0]ft/i, /wh[a|4]ts[a|4]pp/i, /f[a|4]ceb[o|0]{2}k/i];
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

    // 7. Excessive Subdomains (e.g. login.verify.paypal.com.evil.xyz)
    const subdomainParts = hostname.split('.');
    if (subdomainParts.length >= 4) {
      riskScore += 25;
      riskFactors.push({
        title: 'Multiple Subdomain Obfuscation',
        desc: 'Excessive subdomains used to hide the true root domain authority.',
        severity: 'high'
      });
    }

    // 8. URL Shortener check
    if (URL_SHORTENERS.some(s => hostname === s || hostname.endsWith('.' + s))) {
      riskScore += 20;
      riskFactors.push({
        title: 'Shortened URL obfuscation',
        desc: 'Shortened link conceals the final target URL endpoint.',
        severity: 'medium'
      });
    }

    // 9. Phishing Keywords in Hostname or Path
    const foundKeywords = PHISHING_KEYWORDS.filter(kw => hostname.includes(kw) || fullPath.includes(kw));
    if (foundKeywords.length > 0) {
      const severity = foundKeywords.length > 1 ? 'high' : 'medium';
      riskScore += Math.min(35, foundKeywords.length * 15);
      riskFactors.push({
        title: `Phishing Keywords (${foundKeywords.slice(0, 3).join(', ')})`,
        desc: 'Contains suspicious action keywords often used in social engineering scams.',
        severity
      });
    }
  }

  // Calculate final percentage bounded between 2% and 98%
  const finalRisk = Math.min(98, Math.max(2, riskScore));
  const finalSafe = 100 - finalRisk;

  let status = 'safe'; // 'safe', 'suspicious', 'dangerous'
  if (finalRisk >= 60) {
    status = 'dangerous';
  } else if (finalRisk >= 25) {
    status = 'suspicious';
  }

  return {
    url: urlString,
    isValid: true,
    domain: hostname,
    protocol,
    riskPercentage: finalRisk,
    safePercentage: finalSafe,
    status,
    riskFactors,
    safeFactors,
    scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
