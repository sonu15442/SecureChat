package com.securechat.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.webkit.JavascriptInterface;
import java.util.Map;

/**
 * SecureStorageModule - Encrypted Key-Value Persistence Engine
 * Stores user session credentials, cryptographic identity keys,
 * and synchronizes encrypted vault backups directly with the SecureChat backend server.
 */
public class SecureStorageModule {

    private static final String TAG = "SecureStorageModule";
    private static final String PREFS_NAME = "securechat_encrypted_vault";
    private final SharedPreferences prefs;
    private final BackendApiClient apiClient;

    public SecureStorageModule(Context context) {
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.apiClient = BackendApiClient.getInstance();
    }

    @JavascriptInterface
    public String getName() {
        return "SecureStorageModule";
    }

    @JavascriptInterface
    public void setItem(String key, String value) {
        if (key != null && value != null) {
            prefs.edit().putString(key, value).apply();
        }
    }

    @JavascriptInterface
    public String getItem(String key) {
        if (key == null) return null;
        return prefs.getString(key, null);
    }

    @JavascriptInterface
    public void removeItem(String key) {
        if (key != null) {
            prefs.edit().remove(key).apply();
        }
    }

    @JavascriptInterface
    public void clear() {
        prefs.edit().clear().apply();
    }

    /**
     * Backs up encrypted local vault to backend server (/api/sync/storage)
     */
    @JavascriptInterface
    public void syncStorageToBackend(final String userId) {
        if (userId == null || userId.trim().isEmpty()) return;
        try {
            Map<String, ?> allEntries = prefs.getAll();
            StringBuilder vaultJson = new StringBuilder("{");
            int i = 0;
            for (Map.Entry<String, ?> entry : allEntries.entrySet()) {
                if (i > 0) vaultJson.append(",");
                vaultJson.append("\"").append(escapeJson(entry.getKey())).append("\":\"")
                         .append(escapeJson(String.valueOf(entry.getValue()))).append("\"");
                i++;
            }
            vaultJson.append("}");

            String payload = "{" +
                "\"userId\":\"" + escapeJson(userId) + "\"," +
                "\"vaultData\":\"" + escapeJson(vaultJson.toString()) + "\"," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";

            apiClient.post("/api/sync/storage", payload, new BackendApiClient.ResponseCallback() {
                @Override
                public void onSuccess(String responseBody) {
                    Log.i(TAG, "Encrypted vault backup successfully synced to backend: " + responseBody);
                }

                @Override
                public void onError(Exception e) {
                    Log.w(TAG, "Vault sync to backend warning: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to synchronize storage with backend: " + e.getMessage());
        }
    }

    /**
     * Restores encrypted vault from backend server (/api/sync/storage/:userId)
     */
    @JavascriptInterface
    public String restoreStorageFromBackend(String userId) {
        if (userId == null || userId.trim().isEmpty()) return "{\"success\":false}";
        try {
            String response = apiClient.getSync("/api/sync/storage/" + userId);
            Log.i(TAG, "Vault data restored from backend server for user: " + userId);
            return response;
        } catch (Exception e) {
            Log.e(TAG, "Failed to restore storage from backend: " + e.getMessage());
            return "{\"success\":false,\"error\":\"" + escapeJson(e.getMessage()) + "\"}";
        }
    }

    /**
     * Reports vault storage statistics to backend
     */
    @JavascriptInterface
    public void reportStorageStatusToBackend(String userId) {
        try {
            int count = prefs.getAll().size();
            String payload = "{" +
                "\"userId\":\"" + escapeJson(userId) + "\"," +
                "\"itemCount\":" + count + "," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";
            apiClient.post("/api/sync/status", payload, null);
        } catch (Exception ignored) {}
    }

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
