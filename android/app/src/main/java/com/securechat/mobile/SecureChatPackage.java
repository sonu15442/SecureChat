package com.securechat.mobile;

import android.content.Context;
import java.util.ArrayList;
import java.util.List;

/**
 * SecureChatPackage - React Native Package Registry
 * Registers native Android modules for Voice Calling, WebRTC Audio,
 * End-to-End Encryption, Encrypted Storage, and Fraud Link Analysis.
 */
public class SecureChatPackage {

    private final Context context;
    private final VoiceCallModule voiceCallModule;
    private final CryptoSecurityModule cryptoSecurityModule;
    private final SecureStorageModule secureStorageModule;
    private final FraudDetectionModule fraudDetectionModule;
    private final WebRTCManager webRTCManager;

    public SecureChatPackage(Context context) {
        this.context = context;
        this.voiceCallModule = new VoiceCallModule(context);
        this.cryptoSecurityModule = new CryptoSecurityModule(context);
        this.secureStorageModule = new SecureStorageModule(context);
        this.fraudDetectionModule = new FraudDetectionModule(context);
        this.webRTCManager = new WebRTCManager(context);
    }

    public List<Object> createNativeModules() {
        List<Object> modules = new ArrayList<>();
        modules.add(voiceCallModule);
        modules.add(cryptoSecurityModule);
        modules.add(secureStorageModule);
        modules.add(fraudDetectionModule);
        modules.add(webRTCManager);
        return modules;
    }

    public VoiceCallModule getVoiceCallModule() {
        return voiceCallModule;
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
}

