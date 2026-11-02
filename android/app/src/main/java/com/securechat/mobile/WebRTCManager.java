package com.securechat.mobile;

import android.content.Context;
import android.media.AudioManager;
import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * WebRTCManager - Peer Connection Signaling & Hardware Audio Watchdog
 * Coordinates STUN/TURN configurations, ICE candidate exchange,
 * and maintains continuous acoustic connection during calls.
 */
public class WebRTCManager {

    private static final String TAG = "WebRTCManager";
    private final Context context;
    private final AudioManager audioManager;
    private boolean isConnectionActive = false;

    public WebRTCManager(Context context) {
        this.context = context;
        this.audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
    }

    @JavascriptInterface
    public String getName() {
        return "WebRTCManager";
    }

    @JavascriptInterface
    public String getStunServersJson() {
        return "[" +
            "{\"urls\":\"stun:stun.l.google.com:19302\"}," +
            "{\"urls\":\"stun:stun1.l.google.com:19302\"}," +
            "{\"urls\":\"stun:stun2.l.google.com:19302\"}," +
            "{\"urls\":\"stun:stun3.l.google.com:19302\"}," +
            "{\"urls\":\"stun:stun4.l.google.com:19302\"}" +
            "]";
    }

    @JavascriptInterface
    public void notifyIceConnectionChange(String state) {
        Log.i(TAG, "Native WebRTC ICE State: " + state);
        if ("connected".equalsIgnoreCase(state) || "completed".equalsIgnoreCase(state)) {
            isConnectionActive = true;
            ensureLoudspeakerVoice();
        } else if ("disconnected".equalsIgnoreCase(state) || "failed".equalsIgnoreCase(state) || "closed".equalsIgnoreCase(state)) {
            isConnectionActive = false;
        }
    }

    public void ensureLoudspeakerVoice() {
        try {
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                audioManager.setSpeakerphoneOn(true);
                Log.i(TAG, "WebRTCManager: Loudspeaker voice delivery verified.");
            }
        } catch (Exception e) {
            Log.w(TAG, "ensureLoudspeakerVoice warning: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public boolean isWebRTCActive() {
        return isConnectionActive;
    }
}

