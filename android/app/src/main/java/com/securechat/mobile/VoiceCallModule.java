package com.securechat.mobile;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.AudioDeviceInfo;
import android.os.Build;
import android.util.Log;
import android.webkit.JavascriptInterface;
import java.util.List;

/**
 * VoiceCallModule - Native Voice Calling & Loudspeaker Routing Engine
 * Ensures two-way microphone acquisition and high-clarity loudspeaker audio
 * across all Android versions (including Android 12, 13, 14, 15, and 16).
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
     * Activates Voice Call mode with hardware echo cancellation and loudspeaker output
     */
    @JavascriptInterface
    public boolean startVoiceCall() {
        try {
            if (audioManager != null) {
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                audioManager.setMicrophoneMute(false);
                setSpeakerphoneOn(true);

                // Ensure audible in-call and media volume levels (at least 85% of maximum)
                try {
                    int maxVoiceVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL);
                    int currentVoiceVol = audioManager.getStreamVolume(AudioManager.STREAM_VOICE_CALL);
                    if (currentVoiceVol < (int)(maxVoiceVol * 0.7)) {
                        audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, (int)(maxVoiceVol * 0.85), 0);
                    }
                    int maxMusicVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    int currentMusicVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                    if (currentMusicVol < (int)(maxMusicVol * 0.7)) {
                        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, (int)(maxMusicVol * 0.85), 0);
                    }
                } catch (Exception ignored) {}

                isCallActive = true;
                isMuted = false;
                Log.i(TAG, "Native Voice Call Started: Mode=MODE_IN_COMMUNICATION, Loudspeaker=ON, Volume=Audible");
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    audioManager.clearCommunicationDevice();
                } else {
                    audioManager.setSpeakerphoneOn(false);
                }
                audioManager.setMode(AudioManager.MODE_NORMAL);
                audioManager.setMicrophoneMute(false);
                isCallActive = false;
                isSpeakerphoneOn = false;
                Log.i(TAG, "Native Voice Call Ended: Restored to MODE_NORMAL");
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to end native voice call: " + e.getMessage());
        }
        return false;
    }

    /**
     * Toggles Loudspeaker state (Loudspeaker vs Earpiece)
     * Handles Android 12+ setCommunicationDevice API for Modern Android
     */
    @JavascriptInterface
    public boolean setSpeakerphoneOn(boolean on) {
        try {
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (on) {
                        List<AudioDeviceInfo> devices = audioManager.getAvailableCommunicationDevices();
                        boolean foundSpeaker = false;
                        for (AudioDeviceInfo device : devices) {
                            if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                                audioManager.setCommunicationDevice(device);
                                foundSpeaker = true;
                                Log.i(TAG, "Modern Android: Loudspeaker enabled via setCommunicationDevice");
                                break;
                            }
                        }
                        if (!foundSpeaker) {
                            audioManager.setSpeakerphoneOn(true);
                        }
                    } else {
                        audioManager.clearCommunicationDevice();
                    }
                } else {
                    audioManager.setSpeakerphoneOn(on);
                }
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

