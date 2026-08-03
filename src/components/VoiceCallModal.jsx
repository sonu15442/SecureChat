import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, ShieldCheck } from 'lucide-react';

export default function VoiceCallModal({ contact, onClose }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fade-in">
      <div className="w-full max-w-sm glass-modal rounded-3xl p-8 flex flex-col items-center justify-between min-h-[500px] border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        
        {/* Encrypted Call Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          End-to-End Encrypted Voice
        </div>

        {/* Contact Info & Avatar */}
        <div className="flex flex-col items-center text-center space-y-4 my-auto">
          <div className="relative">
            {/* Glowing Pulse Rings */}
            <div className="absolute -inset-4 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
            <div className="absolute -inset-2 bg-emerald-500/30 rounded-full blur-md" />
            
            <img 
              src={contact?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'} 
              alt={contact?.name} 
              className="w-28 h-28 rounded-full object-cover relative border-4 border-emerald-500/40 shadow-xl"
            />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">{contact?.name || 'Contact'}</h3>
            <p className="text-emerald-400 text-sm font-medium mt-1">{formatTimer(duration)}</p>
          </div>

          {/* Equalizer Visualizer */}
          <div className="flex items-center gap-1.5 h-8">
            <div className="w-1.5 bg-emerald-400 rounded-full audio-bar-1" />
            <div className="w-1.5 bg-emerald-400 rounded-full audio-bar-2" />
            <div className="w-1.5 bg-emerald-400 rounded-full audio-bar-3" />
            <div className="w-1.5 bg-emerald-400 rounded-full audio-bar-4" />
            <div className="w-1.5 bg-emerald-400 rounded-full audio-bar-2" />
          </div>
        </div>

        {/* Call Action Controls */}
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
            onClick={onClose}
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
