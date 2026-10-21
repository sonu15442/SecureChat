import React from 'react';
import { Phone, Video, X, User, ShieldCheck } from 'lucide-react';

export default function CallUserPickerModal({
  callType = 'voice',
  availableUsers = [],
  onSelectUser,
  onClose
}) {
  const isVideo = callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm rounded-3xl p-6 border border-emerald-500/30 bg-[#091317] shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              {isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Start {isVideo ? 'Video' : 'Voice'} Call</h3>
              <p className="text-[11px] text-slate-400">Select a contact to call</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-2 max-h-72 overflow-y-auto">
          {availableUsers.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No other registered users online yet.</p>
              <p className="text-[11px] mt-1 text-slate-600">Register User 2 in another tab to call them!</p>
            </div>
          ) : (
            availableUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelectUser(u)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/40 transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                    />
                    {u.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition">{u.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{u.username || u.email}</p>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition">
                  {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
