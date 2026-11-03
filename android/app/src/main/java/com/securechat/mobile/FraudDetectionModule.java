package com.securechat.mobile;

import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;
import java.net.URI;
import java.util.Arrays;
import java.util.List;

/**
 * FraudDetectionModule - AI & Heuristic Link Fraud Analyzer
 * Inspects incoming message links for Shannon entropy anomalies,
 * phishing keywords, deceptive TLDs, and IP address host spoofing,
 * connected directly to the SecureChat backend threat intelligence engine.
 */
public class FraudDetectionModule {

    private static final String TAG = "FraudDetectionModule";

    private static final List<String> SUSPICIOUS_TLDS = Arrays.asList(
        ".zip", ".mov", ".top", ".xyz", ".work", ".click", ".link", ".kim", ".country", ".gq", ".cf", ".tk", ".ml"
    );

    private static final List<String> PHISHING_KEYWORDS = Arrays.asList(
        "verify", "login", "account", "update", "banking", "secure", "free", "gift",
        "crypto", "bonus", "winner", "wallet", "claim", "urgent", "security", "passcode"
    );

    private final Context context;
    private final BackendApiClient apiClient;

    public FraudDetectionModule(Context context) {
        this.context = context;
        this.apiClient = BackendApiClient.getInstance();
    }

    @JavascriptInterface
    public String getName() {
        return "FraudDetectionModule";
    }

    /**
     * Inspects a given URL and returns a structured risk score and percentage,
     * reporting flagged risks to the backend threat intelligence log.
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

        String resultJson = "{" +
            "\"score\":" + finalScore + "," +
            "\"percentage\":" + finalScore + "," +
            "\"verdict\":\"" + verdict + "\"," +
            "\"reasons\":" + reasons.toString() +
            "}";

        // If link is suspicious or dangerous, report immediately to backend threat log
        if (finalScore >= 30) {
            reportFraudToBackend(urlStr, resultJson);
        }

        return resultJson;
    }

    /**
     * Dispatches native fraud threat report to backend server (/api/fraud/report)
     */
    @JavascriptInterface
    public void reportFraudToBackend(final String url, final String analysisJson) {
        try {
            String reportPayload = "{" +
                "\"url\":\"" + escapeJson(url) + "\"," +
                "\"verdict\":\"" + (analysisJson.contains("DANGEROUS") ? "DANGEROUS" : "SUSPICIOUS") + "\"," +
                "\"analysis\":" + analysisJson + "," +
                "\"reportedBy\":\"NativeFraudDetectionModule\"," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";

            apiClient.post("/api/fraud/report", reportPayload, new BackendApiClient.ResponseCallback() {
                @Override
                public void onSuccess(String responseBody) {
                    Log.i(TAG, "Fraud report recorded on backend server: " + responseBody);
                }

                @Override
                public void onError(Exception e) {
                    Log.w(TAG, "Backend fraud report delivery warning: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to submit fraud report: " + e.getMessage());
        }
    }

    /**
     * Queries backend threat intelligence database (/api/fraud/check)
     */
    @JavascriptInterface
    public String checkUrlWithBackendThreatIntel(String url) {
        try {
            String json = "{\"url\":\"" + escapeJson(url) + "\"}";
            return apiClient.postSync("/api/fraud/check", json);
        } catch (Exception e) {
            Log.e(TAG, "Backend threat intel check error: " + e.getMessage());
            return "{\"score\":0,\"verdict\":\"SAFE\",\"source\":\"fallback\"}";
        }
    }

    /**
     * Shannon entropy calculator for domain randomness detection
     */
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

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
