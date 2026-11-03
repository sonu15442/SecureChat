package com.securechat.mobile;

import android.content.Context;
import android.media.AudioManager;
import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * WebRTCManager - Peer Connection Signaling & Hardware Audio Watchdog
 * Coordinates STUN/TURN configurations, ICE candidate exchange,
 * and maintains continuous acoustic connection during calls, connected
 * directly to the SecureChat backend server.
 */
public class WebRTCManager {

    private static final String TAG = "WebRTCManager";
    private static final String DEFAULT_STUN_SERVERS = "[" +
        "{\"urls\":\"stun:stun.l.google.com:19302\"}," +
        "{\"urls\":\"stun:stun1.l.google.com:19302\"}," +
        "{\"urls\":\"stun:stun2.l.google.com:19302\"}," +
        "{\"urls\":\"stun:stun3.l.google.com:19302\"}," +
        "{\"urls\":\"stun:stun4.l.google.com:19302\"}" +
        "]";

    private final Context context;
    private final AudioManager audioManager;
    private final BackendApiClient apiClient;
    private boolean isConnectionActive = false;

    public WebRTCManager(Context context) {
        this.context = context;
        this.audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        this.apiClient = BackendApiClient.getInstance();
    }

    @JavascriptInterface
    public String getName() {
        return "WebRTCManager";
    }

    /**
     * Dynamically fetches the latest ICE servers from the backend (/api/call/ice-servers)
     * with graceful fallback to Google STUN servers
     */
    @JavascriptInterface
    public String getStunServersJson() {
        try {
            String backendResponse = apiClient.getSync("/api/call/ice-servers");
            if (backendResponse != null && backendResponse.contains("iceServers")) {
                Log.i(TAG, "STUN/TURN configuration retrieved from backend server.");
                return backendResponse;
            }
        } catch (Exception e) {
            Log.w(TAG, "Falling back to default STUN list: " + e.getMessage());
        }
        return DEFAULT_STUN_SERVERS;
    }

    /**
     * Direct interface to fetch STUN/TURN configuration from backend
     */
    @JavascriptInterface
    public String fetchIceServersFromBackend() {
        return getStunServersJson();
    }

    /**
     * Relays native ICE candidates directly to backend (/api/call/ice-candidate)
     */
    @JavascriptInterface
    public void sendIceCandidateToBackend(final String callId, final String candidateJson) {
        try {
            String payload = "{" +
                "\"callId\":\"" + escapeJson(callId) + "\"," +
                "\"candidate\":" + candidateJson + "," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";

            apiClient.post("/api/call/ice-candidate", payload, new BackendApiClient.ResponseCallback() {
                @Override
                public void onSuccess(String responseBody) {
                    Log.i(TAG, "ICE candidate relayed to backend: " + responseBody);
                }

                @Override
                public void onError(Exception e) {
                    Log.w(TAG, "Failed to relay ICE candidate: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error packaging ICE candidate: " + e.getMessage());
        }
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

        // Notify backend of ICE state change
        try {
            String payload = "{" +
                "\"type\":\"ice_state_change\"," +
                "\"state\":\"" + escapeJson(state) + "\"," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";
            apiClient.post("/api/call/signal", payload, null);
        } catch (Exception ignored) {}
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

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
