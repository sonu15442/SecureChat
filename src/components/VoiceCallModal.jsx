import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, ShieldCheck, AlertCircle } from 'lucide-react';

export default function VoiceCallModal({ onClose }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micError, setMicError] = useState(null);
  const [micReady, setMicReady] = useState(false);

  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real microphone access
  useEffect(() => {
    let cancelled = false;

    async function startMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        setMicReady(true);

        // Setup audio analysis
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Visualize audio levels
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        function updateLevel() {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 255); // 0..1
          animFrameRef.current = requestAnimationFrame(updateLevel);
        }
        updateLevel();
      } catch (err) {
        if (!cancelled) {
          setMicError(err.name === 'NotAllowedError'
            ? 'Microphone access denied. Please allow mic permission.'
            : 'Could not access microphone: ' + err.message);
        }
      }
    }

    startMic();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Toggle mute
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }
  }, [isMuted]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onClose();
  };

  // Generate 5 bar heights from audio level
  const barHeights = [0.6, 1, 0.7, 0.9, 0.5].map(
    mult => Math.max(8, (isMuted ? 0 : audioLevel) * mult * 80)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fade-in">
      <div className="w-full max-w-sm glass-modal rounded-3xl p-8 flex flex-col items-center justify-between min-h-[500px] border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        
        {/* Encrypted Call Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          End-to-End Encrypted Voice
        </div>

        {/* Call Info */}
        <div className="flex flex-col items-center text-center space-y-4 my-auto">
          <div className="relative">
            {/* Glowing pulse based on audio level */}
            <div
              className="absolute rounded-full bg-emerald-500/30 blur-md transition-all duration-100"
              style={{
                inset: `${-8 - audioLevel * 20}px`,
                opacity: isMuted ? 0.2 : 0.3 + audioLevel * 0.7,
              }}
            />
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 flex items-center justify-center relative border-4 border-emerald-500/40 shadow-xl">
              <Mic className={`w-12 h-12 ${isMuted ? 'text-gray-500' : 'text-emerald-400'} transition-colors`} />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">Voice Call</h3>
            <p className="text-emerald-400 text-sm font-medium mt-1">{formatTimer(duration)}</p>
            {micReady && (
              <p className="text-[11px] text-gray-400 mt-1">
                {isMuted ? '🔇 Microphone muted' : '🎙️ Microphone active'}
              </p>
            )}
          </div>

          {/* Mic Error */}
          {micError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 max-w-[260px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {/* Real Audio Visualizer */}
          <div className="flex items-end justify-center gap-1.5 h-20">
            {barHeights.map((h, i) => (
              <div
                key={i}
                className="w-2 bg-emerald-400 rounded-full transition-all duration-100"
                style={{ height: `${h}px`, opacity: isMuted ? 0.2 : 0.5 + audioLevel * 0.5 }}
              />
            ))}
          </div>
        </div>

        {/* Call Controls */}
        <div className="w-full flex items-center justify-around gap-4 pt-4 border-t border-gray-800/60">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all ${
              isMuted 
                ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button 
            onClick={handleEndCall}
            className="p-5 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all shadow-lg shadow-red-600/40 hover:scale-105 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          <button 
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`p-4 rounded-full transition-all ${
              !isSpeakerOn 
                ? 'bg-gray-800 text-gray-500' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}
            title="Speaker"
          >
            {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>

      </div>
    </div>
  );
}
