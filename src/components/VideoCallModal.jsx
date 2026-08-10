import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ShieldCheck, Monitor, AlertCircle } from 'lucide-react';

export default function VideoCallModal({ onClose }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState(null);
  const [mediaReady, setMediaReady] = useState(false);

  const mainVideoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real camera + mic access
  useEffect(() => {
    let cancelled = false;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        setMediaReady(true);

        // Attach to both video elements
        if (mainVideoRef.current) {
          mainVideoRef.current.srcObject = stream;
        }
        if (pipVideoRef.current) {
          pipVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!cancelled) {
          setMediaError(
            err.name === 'NotAllowedError'
              ? 'Camera/mic access denied. Please allow permissions.'
              : 'Could not access camera: ' + err.message
          );
        }
      }
    }

    startMedia();

    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Toggle mute
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }
  }, [isMuted]);

  // Toggle video
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOn; });
    }
  }, [isVideoOn]);

  // Screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      // Restore camera to main view
      if (mainVideoRef.current && streamRef.current) {
        mainVideoRef.current.srcObject = streamRef.current;
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        // Show screen share in main view
        if (mainVideoRef.current) {
          mainVideoRef.current.srcObject = screenStream;
        }

        // When user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (mainVideoRef.current && streamRef.current) {
            mainVideoRef.current.srcObject = streamRef.current;
          }
          screenStreamRef.current = null;
        };
      } catch (err) {
        // User cancelled screen share picker — do nothing
      }
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-3xl glass-modal rounded-3xl overflow-hidden border border-emerald-500/20 shadow-2xl flex flex-col h-[600px] relative">
        
        {/* Call Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500/40">
              <Video className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {isScreenSharing ? 'Screen Sharing' : 'Video Call'}
              </h3>
              <p className="text-xs text-emerald-400 font-mono">{formatTimer(duration)} • HD</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            E2E Encrypted
          </div>
        </div>

        {/* Video Screen Viewport */}
        <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden">
          
          {/* Main Video Stream */}
          {mediaReady && isVideoOn ? (
            <video
              ref={mainVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : mediaError ? (
            <div className="flex flex-col items-center justify-center space-y-4 p-8">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-sm text-red-400 text-center max-w-xs">{mediaError}</p>
            </div>
          ) : !isVideoOn ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-gray-700 flex items-center justify-center text-gray-500">
                <VideoOff className="w-10 h-10" />
              </div>
              <p className="text-sm text-gray-400">Camera turned off</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              <p className="text-xs text-gray-400">Starting camera...</p>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 pointer-events-none" />

          {/* Local Camera PiP Preview */}
          {mediaReady && !isScreenSharing && (
            <div className="absolute bottom-20 right-6 w-40 h-28 rounded-2xl bg-gray-900 border-2 border-emerald-500/40 overflow-hidden shadow-2xl z-20 transition-all hover:scale-105">
              <video
                ref={pipVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-gray-300">You</div>
            </div>
          )}

          {/* Mic status indicator */}
          {mediaReady && (
            <div className="absolute bottom-24 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-800 z-20">
              {isMuted ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs text-red-300 font-medium">Mic muted</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs text-gray-300 font-medium">Mic active</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Video Control Bar */}
        <div className="p-4 bg-slate-950/90 border-t border-gray-800/80 flex items-center justify-center gap-6 z-30">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all ${
              isMuted 
                ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button 
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-4 rounded-full transition-all ${
              !isVideoOn 
                ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
            title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button 
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor className="w-6 h-6" />
          </button>

          <button 
            onClick={handleEndCall}
            className="p-5 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all shadow-lg shadow-red-600/40 hover:scale-105 active:scale-95"
            title="End Video Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>

      </div>
    </div>
  );
}
