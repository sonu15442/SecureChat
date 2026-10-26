import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, ShieldCheck, AlertCircle, PhoneForwarded } from 'lucide-react';
import {
  startOutgoingRingtone,
  stopOutgoingRingtone,
  stopAllRingtones,
  playConnectedChime,
  playEndedChime
} from '../utils/callAudio';
import { recordAction } from '../utils/testRecorder';
import { on } from '../utils/realtimeChannel';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export default function VoiceCallModal({
  call, // { callId, isCaller, caller, recipient, status }
  onClose,
  onSendSignal,
  onEndCall,
  incomingSignal, // latest WebRTC signal for this call
  allUsers
}) {
  const isCaller = !!call?.isCaller;
  const rawTarget = isCaller ? (call?.recipient || {}) : (call?.caller || {});
  const targetUser = (allUsers && Array.isArray(allUsers) ? allUsers.find(u => u.id === rawTarget.id) : null) || rawTarget;
  const [callStatus, setCallStatus] = useState(call?.status || (isCaller ? 'ringing' : 'connected'));
  
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [micError, setMicError] = useState(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const candidateQueue = useRef([]);
  const hasSentOfferRef = useRef(false);
  const pendingOfferRef = useRef(null);
  const pendingAnswerRef = useRef(null);

  // 1. Manage Outgoing Ringback Tone if caller
  useEffect(() => {
    if (callStatus === 'ringing' && isCaller) {
      startOutgoingRingtone();
    } else {
      stopAllRingtones();
    }
    return () => {
      stopAllRingtones();
    };
  }, [callStatus, isCaller]);

  // Sync prop status changes (e.g. peer accepted)
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

  // 2. Call duration timer when connected
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  // 3. WebRTC Peer Connection & Microphone Acquisition
  useEffect(() => {
    let cancelled = false;

    async function initWebRTC() {
      try {
        // Access user microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;

        // Setup Audio Analyser for local voice visualization
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLocalVoiceLevel = () => {
            if (cancelled) return;
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setLocalAudioLevel(avg / 255);
            animFrameRef.current = requestAnimationFrame(updateLocalVoiceLevel);
          };
          updateLocalVoiceLevel();
        } catch {}

        // Create Peer Connection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        // Add local tracks to peer connection
        stream.getAudioTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Remote track received from peer (User 2 or User 1)
        pc.ontrack = (event) => {
          const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          remoteStreamRef.current = stream;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.muted = !isSpeakerOn;
            remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.0;
            const playPromise = remoteAudioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => {
                console.warn('HTML5 Audio play autoplay blocked, adding resume listeners:', e);
                const resumeVoice = () => {
                  if (remoteAudioRef.current) remoteAudioRef.current.play().catch(() => {});
                  window.removeEventListener('click', resumeVoice);
                  window.removeEventListener('touchstart', resumeVoice);
                };
                window.addEventListener('click', resumeVoice);
                window.addEventListener('touchstart', resumeVoice);
              });
            }
          }
          // Secondary fallback direct WebAudio route for guaranteed playback
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
              const rCtx = new AudioCtx();
              if (rCtx.state === 'suspended') rCtx.resume();
              const rSource = rCtx.createMediaStreamSource(stream);
              const rGain = rCtx.createGain();
              rGain.gain.value = isSpeakerOn ? 1.0 : 0.0;
              rSource.connect(rGain);
              rGain.connect(rCtx.destination);
            }
          } catch (e) {
            console.warn('WebAudio direct playback error:', e);
          }
        };

        // Forward ICE candidates to peer
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

        // If Caller and already answered or connected, initiate offer once
        if (isCaller && (call.status === 'connected' || callStatus === 'connected')) {
          await sendOffer();
        } else {
          // If Callee, process any queued offer or candidates
          processQueuedSignals();
        }
      } catch (err) {
        if (!cancelled) {
          setMicError(
            err.name === 'NotAllowedError'
              ? 'Microphone access denied. Please allow microphone permissions.'
              : 'Could not access microphone: ' + err.message
          );
        }
      }
    }

    initWebRTC();

    return () => {
      cancelled = true;
      stopAllRingtones();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
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
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
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
      console.warn('Error creating/sending offer:', err);
      hasSentOfferRef.current = false;
    }
  };

  // Process any incoming WebRTC signals (offer, answer, ice_candidate)
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
        stopAllRingtones();
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
        stopAllRingtones();
        playConnectedChime();
        processQueuedSignals();

        const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
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
        stopAllRingtones();
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
      console.warn('WebRTC signal processing warning:', err);
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

  // Toggle Speaker
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hasEndedRef = useRef(false);
  const handleEndCallAction = () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    recordAction('Session Management', 'User terminates voice call session', { duration: 0.04, status: 'PASSED', source: 'SecureChat' });
    stopAllRingtones();
    playEndedChime();
    if (onEndCall) onEndCall(call, duration);
    else if (onClose) onClose();
  };

  // Generate 5 sound wave visualizer bars
  const activeLevel = Math.max(localAudioLevel, remoteAudioLevel);
  const barHeights = [0.6, 1, 0.7, 0.9, 0.5].map(
    mult => Math.max(10, (isMuted ? 0 : activeLevel) * mult * 80)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in select-none">
      {/* Remote Audio Output Element */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ position: 'fixed', top: '-9000px', left: '-9000px', width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none' }}
      />

      <div className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center justify-between min-h-[520px] border border-orange-500/30 bg-gradient-to-b from-[#091519] to-[#04080a] shadow-2xl relative overflow-hidden">
        
        {/* Encrypted Call Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full text-xs font-semibold relative z-10">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>E2E Encrypted Voice Call</span>
        </div>

        {/* User Avatar with WhatsApp Pulse Glow */}
        <div className="flex flex-col items-center text-center space-y-4 my-auto relative z-10">
          <div className="relative">
            {/* Audio level pulsing halo */}
            <div
              className="absolute -inset-4 rounded-full bg-orange-500/30 blur-xl transition-all duration-100"
              style={{
                opacity: isMuted ? 0.1 : 0.3 + activeLevel * 0.7,
                transform: `scale(${1 + activeLevel * 0.3})`
              }}
            />
            {callStatus === 'ringing' && (
              <div className="absolute -inset-6 rounded-full border-2 border-orange-400/40 animate-ping opacity-75" />
            )}

            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-orange-400/50 shadow-2xl relative bg-slate-800">
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

          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {targetUser?.name || 'Contact'}
            </h3>
            
            {callStatus === 'ringing' ? (
              <p className="text-sm font-bold text-amber-400 mt-1 animate-pulse flex items-center justify-center gap-1.5">
                <PhoneForwarded className="w-4 h-4 animate-bounce" />
                <span>Ringing... waiting for user to pick up</span>
              </p>
            ) : (
              <p className="text-orange-400 text-sm font-mono font-bold mt-1">
                Connected • {formatTimer(duration)}
              </p>
            )}

            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {targetUser?.username || targetUser?.email || ''}
            </p>
          </div>

          {/* Mic Error Banner if any */}
          {micError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 max-w-[280px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {/* Real Audio Wave Visualizer */}
          {callStatus === 'connected' && (
            <div className="flex items-end justify-center gap-1.5 h-16 pt-2">
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-2.5 bg-orange-400 rounded-full transition-all duration-75 shadow-sm shadow-orange-400/50"
                  style={{ height: `${h}px`, opacity: isMuted ? 0.2 : 0.5 + activeLevel * 0.5 }}
                />
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp Call Controls */}
        <div className="flex items-center justify-center gap-5 w-full pt-4 relative z-10">
          {/* Mute Button */}
          <button
            id="mute-mic-btn"
            type="button"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              recordAction('Session Management', next ? 'User mutes microphone' : 'User un-mutes microphone', { duration: 0.04, status: 'PASSED', source: 'SecureChat' });
            }}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            id="end-voice-call-btn"
            type="button"
            onClick={handleEndCallAction}
            className="p-5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-xl shadow-red-600/40 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Button */}
          <button
            id="toggle-speaker-btn"
            type="button"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              !isSpeakerOn
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isSpeakerOn ? 'Mute Speaker' : 'Enable Speaker'}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

      </div>
    </div>
  );
}
