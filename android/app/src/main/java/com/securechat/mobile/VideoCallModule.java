package com.securechat.mobile;

import android.content.Context;
import android.hardware.camera2.CameraManager;
import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * VideoCallModule - Native Video Calling Hardware Controller
 * Handles camera switching (front/back), video stream lifecycle,
 * hardware video acceleration, and synchronizes call state directly
 * with the SecureChat backend server.
 */
public class VideoCallModule {

    private static final String TAG = "VideoCallModule";
    private final Context context;
    private final CameraManager cameraManager;
    private final BackendApiClient apiClient;
    private boolean isVideoActive = false;
    private String currentFacing = "user"; // "user" or "environment"

    public VideoCallModule(Context context) {
        this.context = context;
        this.cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
        this.apiClient = BackendApiClient.getInstance();
    }

    @JavascriptInterface
    public String getName() {
        return "VideoCallModule";
    }

    @JavascriptInterface
    public boolean hasCamera() {
        try {
            if (cameraManager != null) {
                return cameraManager.getCameraIdList().length > 0;
            }
        } catch (Exception e) {
            Log.w(TAG, "Camera check warning: " + e.getMessage());
        }
        return false;
    }

    @JavascriptInterface
    public boolean startVideoCall(String facingMode) {
        this.isVideoActive = true;
        this.currentFacing = (facingMode != null && !facingMode.isEmpty()) ? facingMode : "user";
        Log.i(TAG, "Native Video Call started with camera facing: " + this.currentFacing);

        // Report native video initialization to backend
        reportVideoMetricsToBackend("active_session", "{\"cameraFacing\":\"" + this.currentFacing + "\",\"fps\":30,\"resolution\":\"1280x720\"}");
        return true;
    }

    @JavascriptInterface
    public boolean endVideoCall() {
        this.isVideoActive = false;
        Log.i(TAG, "Native Video Call ended.");
        reportVideoMetricsToBackend("active_session", "{\"cameraFacing\":\"none\",\"fps\":0,\"isVideoActive\":false}");
        return true;
    }

    @JavascriptInterface
    public String getCameraFacing() {
        return this.currentFacing;
    }

    /**
     * Relays video signaling states directly to backend server (/api/call/signal)
     */
    @JavascriptInterface
    public void syncVideoCallStateToBackend(final String callId, final String targetUserId, final String state) {
        try {
            String payload = "{" +
                "\"type\":\"" + escapeJson(state) + "\"," +
                "\"callId\":\"" + escapeJson(callId) + "\"," +
                "\"targetId\":\"" + escapeJson(targetUserId) + "\"," +
                "\"isVideo\":true," +
                "\"cameraFacing\":\"" + currentFacing + "\"," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";

            apiClient.post("/api/call/signal", payload, new BackendApiClient.ResponseCallback() {
                @Override
                public void onSuccess(String responseBody) {
                    Log.i(TAG, "Video call signal synced with backend: " + responseBody);
                }

                @Override
                public void onError(Exception e) {
                    Log.w(TAG, "Video call signal backend sync warning: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to sync video call state: " + e.getMessage());
        }
    }

    /**
     * Reports hardware video telemetry (camera facing, resolution, FPS) to /api/call/metrics
     */
    @JavascriptInterface
    public void reportVideoMetricsToBackend(final String callId, final String metricsJson) {
        try {
            String payload = "{" +
                "\"callId\":\"" + escapeJson(callId) + "\"," +
                "\"facingMode\":\"" + currentFacing + "\"," +
                "\"isVideoActive\":" + isVideoActive + "," +
                "\"details\":" + (metricsJson != null ? metricsJson : "{}") + "," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";
            apiClient.post("/api/call/metrics", payload, null);
        } catch (Exception ignored) {}
    }

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
