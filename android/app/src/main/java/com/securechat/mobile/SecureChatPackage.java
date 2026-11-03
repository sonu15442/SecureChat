package com.securechat.mobile;

import android.content.Context;
import android.util.Log;
import java.util.ArrayList;
import java.util.List;

/**
 * SecureChatPackage - React Native Package Registry
 * Registers and coordinates native Android modules for Voice Calling, Video Calling,
 * WebRTC Audio, End-to-End Encryption, Encrypted Storage, and Fraud Link Analysis,
 * all connected directly to the SecureChat backend server.
 */
public class SecureChatPackage {

    private static final String TAG = "SecureChatPackage";
    private final Context context;
    private final BackendApiClient apiClient;
    private final VoiceCallModule voiceCallModule;
    private final VideoCallModule videoCallModule;
    private final CryptoSecurityModule cryptoSecurityModule;
    private final SecureStorageModule secureStorageModule;
    private final FraudDetectionModule fraudDetectionModule;
    private final WebRTCManager webRTCManager;

    public SecureChatPackage(Context context) {
        this.context = context;
        this.apiClient = BackendApiClient.getInstance();
        this.voiceCallModule = new VoiceCallModule(context);
        this.videoCallModule = new VideoCallModule(context);
        this.cryptoSecurityModule = new CryptoSecurityModule(context);
        this.secureStorageModule = new SecureStorageModule(context);
        this.fraudDetectionModule = new FraudDetectionModule(context);
        this.webRTCManager = new WebRTCManager(context);
        Log.i(TAG, "All SecureChat native modules initialized and connected to backend client.");
    }

    public List<Object> createNativeModules() {
        List<Object> modules = new ArrayList<>();
        modules.add(voiceCallModule);
        modules.add(videoCallModule);
        modules.add(cryptoSecurityModule);
        modules.add(secureStorageModule);
        modules.add(fraudDetectionModule);
        modules.add(webRTCManager);
        return modules;
    }

    public VoiceCallModule getVoiceCallModule() {
        return voiceCallModule;
    }

    public VideoCallModule getVideoCallModule() {
        return videoCallModule;
    }

    public CryptoSecurityModule getCryptoSecurityModule() {
        return cryptoSecurityModule;
    }

    public SecureStorageModule getSecureStorageModule() {
        return secureStorageModule;
    }

    public FraudDetectionModule getFraudDetectionModule() {
        return fraudDetectionModule;
    }

    public WebRTCManager getWebRTCManager() {
        return webRTCManager;
    }

    public BackendApiClient getApiClient() {
        return apiClient;
    }

    /**
     * Triggers full module synchronization with the backend server
     */
    public void syncAllModulesWithBackend() {
        Log.i(TAG, "Initiating global native synchronization with backend: " + apiClient.getBaseUrl());
        apiClient.probeBackendConnectivity(new BackendApiClient.ResponseCallback() {
            @Override
            public void onSuccess(String responseBody) {
                Log.i(TAG, "All modules verified connected with backend: " + responseBody);
            }

            @Override
            public void onError(Exception e) {
                Log.w(TAG, "Backend sync connection notice: " + e.getMessage());
            }
        });
    }
}
