package com.securechat.mobile;

import android.os.Bundle;
import android.os.BatteryManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ClipData;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.media.AudioManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import android.Manifest;
import android.graphics.Color;
import android.view.Window;
import android.view.WindowManager;
import android.util.Log;
import android.os.Build;
import java.util.ArrayList;
import java.util.List;

/**
 * MainActivity - SecureChat React Native & Native Android Bridge Activity
 * Manages full-screen dark cyber interface, WebRTC hardware permissions,
 * and exposes all native modules connected directly to the SecureChat backend server.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "SecureChatActivity";
    private static final int FILECHOOSER_RESULTCODE = 1001;
    private WebView webView;
    private AudioManager audioManager;
    private SecureChatPackage nativePackage;
    private BackendApiClient apiClient;
    private ValueCallback<Uri[]> mFilePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Configure Dark Cyber theme status bar matching SecureChat (#0c1317)
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#0c1317"));
        window.getDecorView().setSystemUiVisibility(0); // White icons on dark bar

        // 2. Initialize native audio manager
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_NORMAL);
            audioManager.setMicrophoneMute(false);
        }

        // 3. Initialize React Native package registry and backend client
        nativePackage = new SecureChatPackage(this);
        apiClient = BackendApiClient.getInstance();

        // 4. Send device activity status to backend server
        sendActivityStatusToBackend("RESUMED");

        // 5. Request hardware runtime permissions (Audio recording, Camera, Audio settings)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.MODIFY_AUDIO_SETTINGS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.CAMERA,
                Manifest.permission.MODIFY_AUDIO_SETTINGS
            }, 101);
        }

        // 6. Initialize WebView with native bridge bindings
        webView = new WebView(this);
        setContentView(webView);

        WebView.setWebContentsDebuggingEnabled(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Expose Native Modules directly to JavaScript
        webView.addJavascriptInterface(nativePackage.getVoiceCallModule(), "NativeVoiceCall");
        webView.addJavascriptInterface(nativePackage.getVideoCallModule(), "NativeVideoCall");
        webView.addJavascriptInterface(nativePackage.getCryptoSecurityModule(), "NativeCrypto");
        webView.addJavascriptInterface(nativePackage.getSecureStorageModule(), "NativeStorage");
        webView.addJavascriptInterface(nativePackage.getFraudDetectionModule(), "NativeFraudDetection");
        webView.addJavascriptInterface(nativePackage.getWebRTCManager(), "NativeWebRTC");
        webView.addJavascriptInterface(this, "NativeMainActivity");

        // Custom WebChromeClient for WebRTC Audio/Video capture and Native File Choosing
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        String[] resources = request.getResources();
                        List<String> granted = new ArrayList<>();
                        for (String resource : resources) {
                            if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE) ||
                                resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                                granted.add(resource);
                            }
                        }
                        if (!granted.isEmpty()) {
                            request.grant(granted.toArray(new String[0]));
                            Log.i(TAG, "WebRTC Audio/Video permissions automatically granted to webview.");
                        } else {
                            request.deny();
                        }
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                    mFilePathCallback = null;
                }
                mFilePathCallback = filePathCallback;

                Intent intent = null;
                if (fileChooserParams != null) {
                    intent = fileChooserParams.createIntent();
                }
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }
                try {
                    startActivityForResult(intent, FILECHOOSER_RESULTCODE);
                    return true;
                } catch (ActivityNotFoundException e) {
                    Log.e(TAG, "File chooser activity not found: " + e.getMessage());
                    if (mFilePathCallback != null) {
                        mFilePathCallback.onReceiveValue(null);
                        mFilePathCallback = null;
                    }
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        // Load bundled SecureChat application
        webView.loadUrl("file:///android_asset/public/index.html");
    }

    @JavascriptInterface
    public String checkBackendConnection() {
        try {
            return apiClient.getBaseUrl();
        } catch (Exception e) {
            return "OFFLINE";
        }
    }

    @JavascriptInterface
    public void reportDeviceTelemetry(String stateJson) {
        sendActivityStatusToBackend(stateJson != null ? stateJson : "ACTIVE");
    }

    private void sendActivityStatusToBackend(String status) {
        try {
            int batteryLevel = getBatteryLevel();
            String deviceModel = Build.MANUFACTURER + " " + Build.MODEL;
            String payload = "{" +
                "\"deviceModel\":\"" + deviceModel + "\"," +
                "\"osVersion\":\"" + Build.VERSION.SDK_INT + "\"," +
                "\"appVersion\":\"1.0.0\"," +
                "\"status\":\"" + status + "\"," +
                "\"batteryLevel\":" + batteryLevel + "," +
                "\"networkType\":\"WIFI\"," +
                "\"timestamp\":" + System.currentTimeMillis() +
                "}";

            apiClient.post("/api/device/status", payload, null);
        } catch (Exception ignored) {}
    }

    private int getBatteryLevel() {
        try {
            Intent batteryIntent = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (batteryIntent != null) {
                int level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                if (level >= 0 && scale > 0) {
                    return (int) ((level / (float) scale) * 100);
                }
            }
        } catch (Exception ignored) {}
        return 100;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mFilePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                ClipData clipData = data.getClipData();
                if (clipData != null) {
                    results = new Uri[clipData.getItemCount()];
                    for (int i = 0; i < clipData.getItemCount(); i++) {
                        ClipData.Item item = clipData.getItemAt(i);
                        results[i] = item.getUri();
                    }
                } else if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setSpeakerphoneOn(true);
        }
        sendActivityStatusToBackend("RESUMED");
    }

    @Override
    protected void onPause() {
        super.onPause();
        sendActivityStatusToBackend("PAUSED");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
