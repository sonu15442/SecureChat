package com.securechat.mobile;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * BackendApiClient - Native HTTP Networking Client for SecureChat
 * Connects all native Android Java modules directly to the SecureChat backend server.
 * Handles automatic failover across Wi-Fi LAN (10.83.249.35:3001), ADB reverse (localhost:3001),
 * and Android Emulator loopback (10.0.2.2:3001).
 */
public class BackendApiClient {

    private static final String TAG = "BackendApiClient";
    private static BackendApiClient instance;

    // Ordered candidate backend hosts
    private static final List<String> CANDIDATE_HOSTS = Arrays.asList(
        "http://10.83.249.35:3001",
        "http://localhost:3001",
        "http://10.0.2.2:3001"
    );

    private String activeBaseUrl = CANDIDATE_HOSTS.get(0);
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface ResponseCallback {
        void onSuccess(String responseBody);
        void onError(Exception e);
    }

    public static synchronized BackendApiClient getInstance() {
        if (instance == null) {
            instance = new BackendApiClient();
        }
        return instance;
    }

    private BackendApiClient() {
        // Automatically probe and resolve working backend URL on initialization
        probeBackendConnectivity(null);
    }

    public String getBaseUrl() {
        return activeBaseUrl;
    }

    public void setBaseUrl(String url) {
        if (url != null && !url.trim().isEmpty()) {
            this.activeBaseUrl = url.trim();
            Log.i(TAG, "Active backend URL manually configured to: " + this.activeBaseUrl);
        }
    }

    /**
     * Probes candidate URLs to detect the active backend server
     */
    public void probeBackendConnectivity(final ResponseCallback callback) {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                for (String candidate : CANDIDATE_HOSTS) {
                    try {
                        URL url = new URL(candidate + "/api/health");
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setConnectTimeout(2000);
                        conn.setReadTimeout(2000);
                        int code = conn.getResponseCode();
                        if (code == 200) {
                            activeBaseUrl = candidate;
                            Log.i(TAG, "Backend connection established successfully with: " + activeBaseUrl);
                            if (callback != null) {
                                mainHandler.post(new Runnable() {
                                    @Override
                                    public void run() {
                                        callback.onSuccess(activeBaseUrl);
                                    }
                                });
                            }
                            return;
                        }
                    } catch (Exception ignored) {
                        // Try next candidate
                    }
                }
                Log.w(TAG, "Probe could not reach candidate backends; defaulting to " + activeBaseUrl);
                if (callback != null) {
                    mainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            callback.onError(new Exception("Could not reach backend"));
                        }
                    });
                }
            }
        });
    }

    /**
     * Asynchronous HTTP POST request with JSON payload
     */
    public void post(final String endpoint, final String jsonBody, final ResponseCallback callback) {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    final String result = postSync(endpoint, jsonBody);
                    if (callback != null) {
                        mainHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                callback.onSuccess(result);
                            }
                        });
                    }
                } catch (final Exception e) {
                    Log.e(TAG, "POST " + endpoint + " failed: " + e.getMessage());
                    if (callback != null) {
                        mainHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                callback.onError(e);
                            }
                        });
                    }
                }
            }
        });
    }

    /**
     * Synchronous HTTP POST request with JSON payload
     */
    public String postSync(String endpoint, String jsonBody) throws Exception {
        String cleanEndpoint = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
        URL url = new URL(activeBaseUrl + cleanEndpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setRequestProperty("Accept", "application/json");
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(6000);
        conn.setDoOutput(true);

        if (jsonBody != null && !jsonBody.isEmpty()) {
            byte[] bytes = jsonBody.getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(bytes);
                os.flush();
            }
        }

        int responseCode = conn.getResponseCode();
        InputStream is = (responseCode >= 200 && responseCode < 400) ? conn.getInputStream() : conn.getErrorStream();
        StringBuilder sb = new StringBuilder();
        if (is != null) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
            }
        }
        return sb.toString().trim();
    }

    /**
     * Asynchronous HTTP GET request
     */
    public void get(final String endpoint, final ResponseCallback callback) {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    final String result = getSync(endpoint);
                    if (callback != null) {
                        mainHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                callback.onSuccess(result);
                            }
                        });
                    }
                } catch (final Exception e) {
                    Log.e(TAG, "GET " + endpoint + " failed: " + e.getMessage());
                    if (callback != null) {
                        mainHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                callback.onError(e);
                            }
                        });
                    }
                }
            }
        });
    }

    /**
     * Synchronous HTTP GET request
     */
    public String getSync(String endpoint) throws Exception {
        String cleanEndpoint = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
        URL url = new URL(activeBaseUrl + cleanEndpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Accept", "application/json");
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(6000);

        int responseCode = conn.getResponseCode();
        InputStream is = (responseCode >= 200 && responseCode < 400) ? conn.getInputStream() : conn.getErrorStream();
        StringBuilder sb = new StringBuilder();
        if (is != null) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
            }
        }
        return sb.toString().trim();
    }
}

