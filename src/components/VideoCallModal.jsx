import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ShieldCheck, Monitor, AlertCircle, PhoneForwarded } from 'lucide-react';
import {
  startOutgoingRingtone,
  stopOutgoingRingtone,
  playConnectedChime,
  playEndedChime
} from '../utils/callAudio';
import { recordAction } from '../utils/testRecorder';
import { on } from '../utils/realtimeChannel';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export default function VideoCallModal({
  call,
  onClose,
  onSendSignal,
  onEndCall,
  incomingSignal,
  allUsers
}) {
  const isCaller = !!call?.isCaller;
  const rawTarget = isCaller ? (call?.recipient || {}) : (call?.caller || {});
  const targetUser = (allUsers && Array.isArray(allUsers) ? allUsers.find(u => u.id === rawTarget.id) : null) || rawTarget;
  const [callStatus, setCallStatus] = useState(call?.status || (isCaller ? 'ringing' : 'connected'));

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pcRef = useRef(null);
  const candidateQueue = useRef([]);
  const hasSentOfferRef = useRef(false);
  const pendingOfferRef = useRef(null);
  const pendingAnswerRef = useRef(null);

  // 1. Ringing sound if outgoing
  useEffect(() => {
    if (callStatus === 'ringing' && isCaller) {
      startOutgoingRingtone();
    } else {
      stopOutgoingRingtone();
    }
    return () => {
      stopOutgoingRingtone();
    };
  }, [callStatus, isCaller]);

  useEffect(() => {
    if (call?.status && call.status !== callStatus) {
      if (call.status === 'connected' && callStatus === 'ringing') {
        playConnectedChime();
      }
      setCallStatus(call.status);
    }
  }, [call?.status, callStatus]);

  // Ensure caller automatically creates offer once call transitions to connected
  useEffect(() => {
    if (callStatus === 'connected' && isCaller && !hasSentOfferRef.current) {
      sendOffer();
    }
  }, [callStatus, isCaller]);

  // 2. Timer
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  // 3. WebRTC Media & Peer Connection
  useEffect(() => {
    let cancelled = false;

    async function initWebRTC() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        // Add both audio and video tracks
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Remote track arrival (audio + video from peer)
        pc.ontrack = (event) => {
          const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          remoteStreamRef.current = stream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.volume = 1.0;
            const p = remoteVideoRef.current.play();
            if (p !== undefined) p.catch(() => {});
          }
          // Direct WebAudio route for audio track playback
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx && event.track.kind === 'audio') {
              const rCtx = new AudioCtx();
              if (rCtx.state === 'suspended') rCtx.resume();
              const rSource = rCtx.createMediaStreamSource(new MediaStream([event.track]));
              rSource.connect(rCtx.destination);
            }
          } catch (e) {
            console.warn('WebAudio video call audio error:', e);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && onSendSignal) {
            onSendSignal({
              type: 'ice_candidate',
              candidate: event.candidate,
              callId: call.callId,
              targetId: targetUser.id
            });
          }
        };

        if (pendingOfferRef.current) {
          const off = pendingOfferRef.current;
          pendingOfferRef.current = null;
          await handleSignal(off);
        }
        if (pendingAnswerRef.current) {
          const ans = pendingAnswerRef.current;
          pendingAnswerRef.current = null;
          await handleSignal(ans);
        }

        // Initiate offer once peer is connected
        if (isCaller && (call.status === 'connected' || callStatus === 'connected')) {
          await sendOffer();
        } else {
          processQueuedSignals();
        }
      } catch (err) {
        if (!cancelled) {
          setMediaError(
            err.name === 'NotAllowedError'
              ? 'Camera/microphone access denied. Please allow permissions in browser.'
              : 'Could not access camera/mic: ' + err.message
          );
        }
      }
    }

    initWebRTC();

    return () => {
      cancelled = true;
      stopOutgoingRingtone();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  const sendOffer = async () => {
    if (hasSentOfferRef.current) return;
    const pc = pcRef.current;
    if (!pc) {
      setTimeout(() => {
        if (!hasSentOfferRef.current) sendOffer();
      }, 150);
      return;
    }
    try {
      hasSentOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (onSendSignal) {
        onSendSignal({
          type: 'offer',
          sdp: offer,
          callId: call.callId,
          targetId: targetUser.id
        });
      }
    } catch (err) {
      console.warn('Video call error sending offer:', err);
      hasSentOfferRef.current = false;
    }
  };

  const processQueuedSignals = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    while (candidateQueue.current.length > 0) {
      const cand = candidateQueue.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {}
    }
  };

  const handleSignal = async (signal) => {
    if (!signal || signal.callId !== call.callId) return;
    const pc = pcRef.current;

    try {
      if (signal.type === 'call_accepted') {
        setCallStatus('connected');
        stopOutgoingRingtone();
        playConnectedChime();
        if (isCaller) {
          await sendOffer();
        }
      } else if (signal.type === 'offer' && !isCaller) {
        if (!pc) {
          pendingOfferRef.current = signal;
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        setCallStatus('connected');
        stopOutgoingRingtone();
        playConnectedChime();
        processQueuedSignals();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (onSendSignal) {
          onSendSignal({
            type: 'answer',
            sdp: answer,
            callId: call.callId,
            targetId: targetUser.id
          });
        }
      } else if (signal.type === 'answer' && isCaller) {
        if (!pc) {
          pendingAnswerRef.current = signal;
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        setCallStatus('connected');
        stopOutgoingRingtone();
        playConnectedChime();
        processQueuedSignals();
      } else if (signal.type === 'ice_candidate') {
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          candidateQueue.current.push(signal.candidate);
        }
      }
    } catch (err) {
      console.warn('Video call WebRTC signal error:', err);
    }
  };

  useEffect(() => {
    if (incomingSignal) handleSignal(incomingSignal);
  }, [incomingSignal]);

  useEffect(() => {
    const unsub = on('call_signal', (sig) => {
      handleSignal(sig);
    });
    return unsub;
  }, [call.callId]);

  // Toggle Mute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }
  }, [isMuted]);

  // Toggle Video
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOn; });
    }
  }, [isVideoOn]);

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      // Restore camera track to peer connection
      if (localStreamRef.current && pcRef.current) {
        const camVideoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && camVideoTrack) {
          sender.replaceTrack(camVideoTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenTrack = screenStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack);
          }
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current && pcRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender && camTrack) sender.replaceTrack(camTrack);
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          }
          screenStreamRef.current = null;
        };
      } catch (err) {
        // Cancelled picker
      }
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hasEndedRef = useRef(false);
  const handleEndCallAction = () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    recordAction('Session Management', 'User terminates video call session', { duration: 0.04, status: 'PASSED', source: 'SecureChat' });
    stopOutgoingRingtone();
    playEndedChime();
    if (onEndCall) onEndCall(call, duration);
    else if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in select-none">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden border border-orange-500/30 bg-[#060b0e] shadow-2xl flex flex-col h-[650px] relative">
        
        {/* Call Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-5 z-20 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-orange-500/40">
              <Video className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>{targetUser?.name || 'Contact'}</span>
                {isScreenSharing && <span className="text-xs text-purple-400 font-semibold">• Screen Sharing</span>}
              </h3>
              {callStatus === 'ringing' ? (
                <p className="text-xs text-amber-400 font-bold animate-pulse flex items-center gap-1">
                  <PhoneForwarded className="w-3.5 h-3.5" />
                  <span>Ringing... waiting for user to pick up</span>
                </p>
              ) : (
                <p className="text-xs text-orange-400 font-mono font-bold">
                  Connected • {formatTimer(duration)} • HD
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4" />
            <span>WhatsApp HD Encrypted</span>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Main Remote Video Element — Always mounted to receive audio & video tracks */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${callStatus === 'connected' ? 'block' : 'hidden'}`}
          />
          {callStatus !== 'connected' && (
            /* Ringing Screen before callee picks up */
            <div className="flex flex-col items-center justify-center space-y-4 my-auto relative z-10 animate-fade-in">
              <div className="relative">
                <div className="absolute -inset-6 rounded-full border-2 border-orange-400/30 animate-ping opacity-75" />
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-orange-400 shadow-2xl relative bg-slate-800">
                  <img
                    src={targetUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                    alt={targetUser?.name || 'Contact'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
                    }}
                  />
                </div>
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black text-white">{targetUser?.name || 'Contact'}</h3>
                <p className="text-sm font-semibold text-orange-400 animate-pulse">
                  Ringing Video Call...
                </p>
              </div>
            </div>
          )}

          {/* Media Permission Notice */}
          {mediaError && (
            <div className="absolute top-20 left-6 right-6 z-30 p-3 bg-red-600/90 text-white rounded-2xl flex items-center gap-2 text-xs font-bold shadow-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mediaError}</span>
            </div>
          )}

          {/* Picture-in-Picture Local Video (Self View) */}
          <div className="absolute bottom-24 right-5 w-40 sm:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-orange-500/50 shadow-2xl bg-black z-20 group">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-slate-400">
                <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                <span className="text-[10px] font-bold">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] text-white font-semibold">
              You
            </div>
          </div>
        </div>

        {/* Floating Call Bottom Controls Bar */}
        <div className="p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent flex items-center justify-center gap-4 z-20">
          {/* Mute Mic */}
          <button
            id="toggle-mic-btn"
            type="button"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              recordAction('Session Management', next ? 'User mutes microphone' : 'User un-mutes microphone', { duration: 0.04, status: 'PASSED', source: 'SecureChat' });
            }}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video */}
          <button
            id="toggle-video-btn"
            type="button"
            onClick={() => {
              const next = !isVideoOn;
              setIsVideoOn(next);
              recordAction('Session Management', next ? 'User enables camera video' : 'User disables camera video', { duration: 0.04, status: 'PASSED', source: 'SecureChat' });
            }}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              !isVideoOn
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            id="toggle-screenshare-btn"
            type="button"
            onClick={() => {
              toggleScreenShare();
              recordAction('Session Management', isScreenSharing ? 'User stops screen sharing' : 'User starts screen sharing', { duration: 0.04, status: 'PASSED', source: 'SecureChat' });
            }}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            id="end-video-call-btn"
            type="button"
            onClick={handleEndCallAction}
            className="p-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-xl shadow-red-600/40 transition-all cursor-pointer flex items-center gap-2 font-bold text-sm"
            title="End Video Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>

      </div>
    </div>
  );
}
