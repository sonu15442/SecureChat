package com.securechat.mobile;

import android.app.Application;
import android.content.Context;
import android.media.AudioManager;
import android.util.Log;

/**
 * MainApplication - SecureChat React Native Application Controller
 * Initializes React Native environment, hardware security providers,
 * and high-fidelity WebRTC voice/video audio communication subsystem.
 */
public class MainApplication extends Application {

    private static final String TAG = "SecureChatApp";
    private static MainApplication instance;
    private SecureChatPackage secureChatPackage;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.i(TAG, "SecureChat React Native Native Runtime initialized.");

        // Initialize Native React Package Registry
        secureChatPackage = new SecureChatPackage(this);

        // Configure system audio for crystal-clear voice communication
        initializeAudioSubsystem();
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

