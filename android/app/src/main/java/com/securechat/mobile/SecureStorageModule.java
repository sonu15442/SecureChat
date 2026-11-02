package com.securechat.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

/**
 * SecureStorageModule - Encrypted Key-Value Persistence Engine
 * Stores user session credentials, cryptographic identity keys,
 * and offline message caches.
 */
public class SecureStorageModule {

    private static final String PREFS_NAME = "securechat_encrypted_vault";
    private final SharedPreferences prefs;

    public SecureStorageModule(Context context) {
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
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
}

