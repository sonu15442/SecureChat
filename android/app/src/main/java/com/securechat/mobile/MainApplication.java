package com.securechat.mobile;

import android.app.Application;
import android.content.Context;
import android.media.AudioManager;
import android.os.Build;
import android.util.Log;

/**
 * MainApplication - SecureChat React Native Application Controller
 * Initializes React Native environment, hardware security providers,
 * establishes native HTTP connection to the SecureChat backend server,
 * and configures high-fidelity WebRTC voice/video audio subsystem.
 */
public class MainApplication extends Application {

    private static final String TAG = "SecureChatApp";
    private static MainApplication instance;
    private SecureChatPackage secureChatPackage;
    private BackendApiClient apiClient;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.i(TAG, "SecureChat Native Runtime initializing...");

        // 1. Initialize native Backend API client
        apiClient = BackendApiClient.getInstance();

        // 2. Transmit native startup handshake to backend server
        syncStartupWithBackend();

        // 3. Initialize Native React Package Registry
        secureChatPackage = new SecureChatPackage(this);

        // 4. Configure system audio for crystal-clear voice communication
        initializeAudioSubsystem();

        Log.i(TAG, "SecureChat Native Runtime fully initialized and connected to backend: " + apiClient.getBaseUrl());
    }

    public static MainApplication getInstance() {
        return instance;
    }

    public static Context getAppContext() {
        return instance != null ? instance.getApplicationContext() : null;
    }

    public SecureChatPackage getSecureChatPackage() {
        return secureChatPackage;
    }

    public BackendApiClient getApiClient() {
        return apiClient;
    }

    private void syncStartupWithBackend() {
        try {
            String deviceModel = Build.MANUFACTURER + " " + Build.MODEL;
            String osVersion = String.valueOf(Build.VERSION.SDK_INT);
            String startupJson = "{" +
                "\"deviceModel\":\"" + deviceModel + "\"," +
                "\"osVersion\":\"" + osVersion + "\"," +
                "\"appVersion\":\"1.0.0\"," +
                "\"status\":\"INITIALIZED\"," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";

            apiClient.post("/api/device/status", startupJson, new BackendApiClient.ResponseCallback() {
                @Override
                public void onSuccess(String responseBody) {
                    Log.i(TAG, "Backend startup telemetry acknowledged: " + responseBody);
                }

                @Override
                public void onError(Exception e) {
                    Log.w(TAG, "Backend startup telemetry deferred (will retry): " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to send startup telemetry: " + e.getMessage());
        }
    }

    private void initializeAudioSubsystem() {
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                am.setMode(AudioManager.MODE_IN_COMMUNICATION);
                am.setSpeakerphoneOn(true);
                Log.i(TAG, "Audio subsystem configured for two-way voice call communication (Speakerphone ON).");
            }
        } catch (Exception e) {
            Log.w(TAG, "Audio subsystem init warning: " + e.getMessage());
        }
    }
}
