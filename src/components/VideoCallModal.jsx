import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ShieldCheck, Monitor } from 'lucide-react';

export default function VideoCallModal({ contact, onClose }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-3xl glass-modal rounded-3xl overflow-hidden border border-emerald-500/20 shadow-2xl flex flex-col h-[600px] relative">
        
        {/* Call Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <img 
              src={contact?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'} 
              alt={contact?.name} 
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/40"
            />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {contact?.name || 'Encrypted Video Call'}
              </h3>
              <p className="text-xs text-emerald-400 font-mono">{formatTimer(duration)} • 1080p HD</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            E2E Encrypted
          </div>
        </div>

        {/* Video Screen Viewport */}
        <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden">
          
          {/* Main Remote Video Stream Visualizer */}
          {isVideoOn ? (
            <div className="w-full h-full relative">
              <img 
                src={contact?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
                alt="Remote Stream"
                className="w-full h-full object-cover filter brightness-90"
              />
              {/* Subtle visualizer overlay animation */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/40" />
              
              {/* Simulated active speech pulse indicator */}
              <div className="absolute bottom-24 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs text-gray-300 font-medium">{contact?.name} is speaking...</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-gray-700 flex items-center justify-center text-gray-500">
                <VideoOff className="w-10 h-10" />
              </div>
              <p className="text-sm text-gray-400">Camera turned off</p>
            </div>
          )}

          {/* Local Camera Picture-in-Picture Preview */}
          <div className="absolute bottom-20 right-6 w-40 h-28 rounded-2xl bg-gray-900 border-2 border-emerald-500/40 overflow-hidden shadow-2xl z-20 transition-all hover:scale-105">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80" 
              alt="Local Camera" 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-gray-300">You</div>
          </div>
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
            onClick={() => setIsScreenSharing(!isScreenSharing)}
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
            onClick={onClose}
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
