import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, ShieldCheck, Volume2 } from 'lucide-react';
import { startIncomingRingtone, stopIncomingRingtone } from '../utils/callAudio';

export default function IncomingCallModal({ call, onAccept, onDecline }) {
  const isVideo = call?.type === 'video';
  const caller = call?.caller || {};

  // Automatically start WhatsApp-style incoming musical ringtone and keep ringing
  useEffect(() => {
    startIncomingRingtone();
    return () => {
      stopIncomingRingtone();
    };
  }, []);

  const handleAccept = () => {
    stopIncomingRingtone();
    onAccept();
  };

  const handleDecline = () => {
    stopIncomingRingtone();
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in select-none">
      <div className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center justify-between min-h-[520px] border border-emerald-500/30 bg-gradient-to-b from-[#09161a] to-[#04080b] shadow-2xl relative overflow-hidden">
        
        {/* Ambient Ringing Glows */}
        <div className="absolute -top-24 -left-24 w-56 h-56 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 rounded-full bg-teal-500/20 blur-3xl pointer-events-none animate-pulse" />

        {/* Security Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold relative z-10">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>WhatsApp E2E Encrypted Call</span>
        </div>

        {/* Caller Avatar with WhatsApp Multi-Ripple Waves */}
        <div className="flex flex-col items-center text-center space-y-4 my-auto relative z-10">
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring 1 */}
            <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
            {/* Pulsing ring 2 */}
            <div className="absolute w-44 h-44 rounded-full border-2 border-emerald-400/30 animate-pulse" />
            
            {/* Avatar image */}
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-emerald-400 shadow-2xl relative z-10 bg-slate-800">
              <img
                src={caller.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt={caller.name || 'Caller'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
                }}
              />
            </div>

            {/* Call type badge on avatar */}
            <div className="absolute -bottom-1 -right-1 z-20 p-2 rounded-full bg-emerald-500 text-white shadow-lg border-2 border-slate-900">
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {caller.name || 'Incoming Call'}
            </h3>
            <p className="text-sm font-semibold text-emerald-400 animate-pulse flex items-center justify-center gap-1.5">
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span>Incoming {isVideo ? 'Video' : 'Voice'} Call...</span>
            </p>
            <p className="text-xs text-slate-400 font-mono">
              {caller.username || caller.email || 'SecureChat Peer'}
            </p>
          </div>
        </div>

        {/* WhatsApp Pick / Decline Call Action Buttons */}
        <div className="w-full flex items-center justify-around pt-6 relative z-10">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="decline-call-btn"
              type="button"
              onClick={handleDecline}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-all cursor-pointer group hover:rotate-12"
              title="Decline Call"
            >
              <PhoneOff className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </button>
            <span className="text-xs font-bold text-red-400">Decline</span>
          </div>

          {/* Accept / Pick Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="accept-call-btn"
              type="button"
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-90 text-white flex items-center justify-center shadow-xl shadow-emerald-500/50 transition-all cursor-pointer group animate-bounce"
              title="Pick up Call"
            >
              {isVideo ? (
                <Video className="w-7 h-7 group-hover:scale-110 transition-transform" />
              ) : (
                <Phone className="w-7 h-7 group-hover:scale-110 transition-transform" />
              )}
            </button>
            <span className="text-xs font-bold text-emerald-400 animate-pulse">Pick Call</span>
          </div>
        </div>

      </div>
    </div>
  );
}
