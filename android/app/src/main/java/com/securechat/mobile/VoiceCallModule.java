package com.securechat.mobile;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * VoiceCallModule - Native Voice Calling & Audio Routing Engine
 * Ensures two-way microphone acquisition and loudspeaker audio delivery
 * during encrypted voice and video calls.
 */
public class VoiceCallModule {

    private static final String TAG = "VoiceCallModule";
    private final Context context;
    private final AudioManager audioManager;
    private boolean isCallActive = false;
    private boolean isMuted = false;
    private boolean isSpeakerphoneOn = true;

    public VoiceCallModule(Context context) {
        this.context = context;
        this.audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
    }

    @JavascriptInterface
    public String getName() {
        return "VoiceCallModule";
    }

    /**
     * Activates Voice Call mode with hardware echo cancellation and speakerphone
     */
    @JavascriptInterface
    public boolean startVoiceCall() {
        try {
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                audioManager.setSpeakerphoneOn(true);
                audioManager.setMicrophoneMute(false);
                isCallActive = true;
                isSpeakerphoneOn = true;
                isMuted = false;
                Log.i(TAG, "Native Voice Call Started: Mode=MODE_IN_COMMUNICATION, Speakerphone=ON");
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start native voice call: " + e.getMessage());
        }
        return false;
    }

    /**
     * Ends Voice Call and restores standard Android media audio routing
     */
    @JavascriptInterface
    public boolean endVoiceCall() {
        try {
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_NORMAL);
                audioManager.setMicrophoneMute(false);
                audioManager.setSpeakerphoneOn(false);
                isCallActive = false;
                Log.i(TAG, "Native Voice Call Ended: Restored to MODE_NORMAL");
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to end native voice call: " + e.getMessage());
        }
        return false;
    }

    /**
     * Toggles Speakerphone state (Loudspeaker vs Earpiece)
     */
    @JavascriptInterface
    public boolean setSpeakerphoneOn(boolean on) {
        try {
            if (audioManager != null) {
                audioManager.setSpeakerphoneOn(on);
                isSpeakerphoneOn = on;
                Log.i(TAG, "Speakerphone set to: " + on);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to set speakerphone: " + e.getMessage());
        }
        return false;
    }

    /**
     * Mutes / unmutes the physical microphone
     */
    @JavascriptInterface
    public boolean setMicrophoneMute(boolean mute) {
        try {
            if (audioManager != null) {
                audioManager.setMicrophoneMute(mute);
                isMuted = mute;
                Log.i(TAG, "Microphone mute set to: " + mute);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to set microphone mute: " + e.getMessage());
        }
        return false;
    }

    /**
     * Checks if the physical microphone is available for voice capture
     */
    @JavascriptInterface
    public boolean isMicrophoneAvailable() {
        try {
            int sampleRate = 44100;
            int bufferSize = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            );
            if (bufferSize <= 0) return true;

            AudioRecord recorder = new AudioRecord(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            );
            boolean available = (recorder.getState() == AudioRecord.STATE_INITIALIZED);
            recorder.release();
            return available;
        } catch (Exception e) {
            return true; // Fallback to allow WebRTC to attempt
        }
    }

    @JavascriptInterface
    public boolean isSpeakerActive() {
        return isSpeakerphoneOn;
    }

    @JavascriptInterface
    public boolean isMuted() {
        return isMuted;
    }
}

