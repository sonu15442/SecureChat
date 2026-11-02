package com.securechat.mobile;

import android.content.Context;
import android.webkit.JavascriptInterface;
import java.net.URI;
import java.util.Arrays;
import java.util.List;

/**
 * FraudDetectionModule - AI & Heuristic Link Fraud Analyzer
 * Inspects incoming message links for Shannon entropy anomalies,
 * phishing keywords, deceptive TLDs, and IP address host spoofing.
 */
public class FraudDetectionModule {

    private static final List<String> SUSPICIOUS_TLDS = Arrays.asList(
        ".zip", ".mov", ".top", ".xyz", ".work", ".click", ".link", ".kim", ".country", ".gq", ".cf", ".tk", ".ml"
    );

    private static final List<String> PHISHING_KEYWORDS = Arrays.asList(
        "verify", "login", "account", "update", "banking", "secure", "free", "gift",
        "crypto", "bonus", "winner", "wallet", "claim", "urgent", "security", "passcode"
    );

    private final Context context;

    public FraudDetectionModule(Context context) {
        this.context = context;
    }

    @JavascriptInterface
    public String getName() {
        return "FraudDetectionModule";
    }

    /**
     * Inspects a given URL and returns a structured risk score and percentage
     */
    @JavascriptInterface
    public String analyzeLink(String urlStr) {
        if (urlStr == null || urlStr.trim().isEmpty()) {
            return "{\"score\":0,\"percentage\":0,\"verdict\":\"SAFE\"}";
        }

        int score = 0;
        StringBuilder reasons = new StringBuilder("[");

        try {
            String lower = urlStr.toLowerCase();
            URI uri = new URI(urlStr);
            String host = uri.getHost();

            if (host != null && host.matches("^\\d+\\.\\d+\\.\\d+\\.\\d+$")) {
                score += 35;
                reasons.append("\"Direct IP address host used\",");
            }

            for (String tld : SUSPICIOUS_TLDS) {
                if (host != null && host.endsWith(tld)) {
                    score += 25;
                    reasons.append("\"High-risk suspicious top-level domain (").append(tld).append(")\",");
                    break;
                }
            }

            int keywordHits = 0;
            for (String kw : PHISHING_KEYWORDS) {
                if (lower.contains(kw)) {
                    keywordHits++;
                }
            }
            if (keywordHits > 0) {
                score += Math.min(keywordHits * 15, 30);
                reasons.append("\"Contains ").append(keywordHits).append(" phishing/credential lure keyword(s)\",");
            }

            if (urlStr.length() > 80) {
                score += 10;
                reasons.append("\"Abnormally long URL length (>80 characters)\",");
            }

            // Shannon entropy calculation
            double entropy = calculateEntropy(host != null ? host : urlStr);
            if (entropy > 3.8) {
                score += 25;
                reasons.append("\"High character entropy (").append(entropy).append(") indicating algorithmically generated domain\",");
            }

        } catch (Exception e) {
            score += 15;
            reasons.append("\"Malformed URL structure\",");
        }

        int finalScore = Math.min(score, 100);
        String verdict = finalScore >= 60 ? "DANGEROUS" : (finalScore >= 30 ? "SUSPICIOUS" : "SAFE");

        if (reasons.length() > 1 && reasons.charAt(reasons.length() - 1) == ',') {
            reasons.deleteCharAt(reasons.length() - 1);
        }
        reasons.append("]");

        return "{\"score\":" + finalScore + ",\"percentage\":" + finalScore + ",\"verdict\":\"" + verdict + "\",\"reasons\":" + reasons.toString() + "}";
    }

    private double calculateEntropy(String input) {
        if (input == null || input.isEmpty()) return 0.0;
        int[] freq = new int[256];
        for (char c : input.toCharArray()) {
            if (c < 256) freq[c]++;
        }
        double entropy = 0.0;
        double len = input.length();
        for (int count : freq) {
            if (count > 0) {
                double p = count / len;
                entropy -= p * (Math.log(p) / Math.log(2));
            }
        }
        return Math.round(entropy * 100.0) / 100.0;
    }
}

