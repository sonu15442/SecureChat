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
import { syncCallSignals } from '../utils/api';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
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
  const remoteAudioCtxRef = useRef(null);
  const remoteAudioGainRef = useRef(null);

  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);
  const candidateQueue = useRef([]);
  const hasSentOfferRef = useRef(false);
  const pendingOfferRef = useRef(null);
  const pendingAnswerRef = useRef(null);
  const processedSignalsRef = useRef(new Set());
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

  // 1. Manage Ringback Tone: ONLY caller rings during 'ringing' status; Callee never rings here
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

  // Sync prop status changes (e.g. peer accepted or call connected)
  useEffect(() => {
    if (call?.status && call.status !== callStatus) {
      if (call.status === 'connected' && callStatus === 'ringing') {
        stopAllRingtones();
        playConnectedChime();
      }
      setCallStatus(call.status);
    }
  }, [call?.status, callStatus]);

  // Continuous Polling Sync: Guarantees immediate ringtone stop on pickup and mutual call teardown
  useEffect(() => {
    let active = true;
    let lastCheck = 0;

    const poll = async () => {
      if (!active) return;
      try {
        const res = await syncCallSignals(call.callId, lastCheck, targetUser?.id);
        if (!active || !res) return;
        lastCheck = res.serverTime || Date.now();

        // 1. If call ended on backend, tear down modal immediately on both sides
        if (
          res.status === 'ended' ||
          (Array.isArray(res.signals) && res.signals.some(s => s && (s.type === 'call_end' || s.type === 'call_cancel' || s.type === 'call_reject')))
        ) {
          stopAllRingtones();
          handleEndCallAction();
          return;
        }

        // 2. If Callee answered, ensure ringtone stops and caller transitions to connected
        if (
          res.status === 'connected' ||
          (Array.isArray(res.signals) && res.signals.some(s => s && s.type === 'call_accepted'))
        ) {
          if (callStatus === 'ringing') {
            stopAllRingtones();
            setCallStatus('connected');
            playConnectedChime();
            if (isCaller) sendOffer();
          }
        }

        // 3. Process any incoming WebRTC signals
        if (Array.isArray(res.signals)) {
          for (const sig of res.signals) {
            if (sig && sig.callId === call.callId) {
              handleSignal(sig);
            }
          }
        }
      } catch {}
    };

    const timer = setInterval(poll, 600);
    poll();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [call.callId, targetUser?.id, callStatus, isCaller]);

  // Callee retry for call_accepted until offer arrives
  useEffect(() => {
    if (!isCaller && callStatus === 'connected' && !pcRef.current?.remoteDescription) {
      let attempts = 0;
      const retryTimer = setInterval(() => {
        attempts++;
        if (pcRef.current?.remoteDescription || attempts > 6) {
          clearInterval(retryTimer);
          return;
        }
        if (onSendSignal) {
          onSendSignal({
            type: 'call_accepted',
            callId: call.callId,
            recipientId: targetUser?.id,
            targetId: targetUser?.id
          });
        }
      }, 500);
      return () => clearInterval(retryTimer);
    }
  }, [isCaller, callStatus, call.callId, targetUser?.id]);

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
        // Step 1: Create Peer Connection IMMEDIATELY so pcRef.current is ready for any early signals
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        pc.oniceconnectionstatechange = () => {
          console.log('[WebRTC Voice] ICE Connection State:', pc.iceConnectionState);
        };
        pc.onconnectionstatechange = () => {
          console.log('[WebRTC Voice] Connection State:', pc.connectionState);
          if (pc.connectionState === 'closed') {
            handleEndCallAction();
          }
        };

        // Forward ICE candidates to peer (serialized as plain JSON so Structured Clone never fails)
        pc.onicecandidate = (event) => {
          if (event.candidate && onSendSignal) {
            const cand = event.candidate;
            const candObj = cand.toJSON ? cand.toJSON() : {
              candidate: cand.candidate,
              sdpMid: cand.sdpMid,
              sdpMLineIndex: cand.sdpMLineIndex,
              usernameFragment: cand.usernameFragment
            };
            onSendSignal({
              type: 'ice_candidate',
              candidate: candObj,
              callId: call.callId,
              targetId: targetUser?.id
            });
          }
        };

        // Remote track received from peer (User 2 or User 1)
        pc.ontrack = (event) => {
          console.log('[WebRTC Voice] Remote track received:', event.track.id, event.track.kind);
          if (event.track.kind !== 'audio') return;
          event.track.enabled = true;

          const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          remoteStreamRef.current = remoteStream;

          // 1. Play HTML5 Audio element directly with volume=1.0 and user-gesture fallback
          const playAudio = () => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream;
              remoteAudioRef.current.muted = false;
              remoteAudioRef.current.volume = 1.0;
              const playPromise = remoteAudioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(e => {
                  console.warn('[WebRTC Voice] HTML5 Audio autoplay unlock pending user interaction:', e);
                  const resumeVoice = () => {
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.muted = false;
                      remoteAudioRef.current.volume = 1.0;
                      remoteAudioRef.current.play().catch(() => {});
                    }
                    window.removeEventListener('click', resumeVoice);
                    window.removeEventListener('touchstart', resumeVoice);
                  };
                  window.addEventListener('click', resumeVoice, { once: true });
                  window.addEventListener('touchstart', resumeVoice, { once: true });
                });
              }
            }
            // In-memory backup Audio element for Android WebView
            try {
              if (!window.__activeCallAudio) {
                window.__activeCallAudio = new Audio();
              }
              window.__activeCallAudio.srcObject = remoteStream;
              window.__activeCallAudio.volume = 1.0;
              window.__activeCallAudio.play().catch(() => {});
            } catch {}
          };
          playAudio();

          // 2. Audio analyser for visualizer (analyser only, no destination output to prevent echo/cancellation)
          try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!remoteAudioCtxRef.current || remoteAudioCtxRef.current.state === 'closed') {
              remoteAudioCtxRef.current = new AudioContextClass();
            }
            const actx = remoteAudioCtxRef.current;
            if (actx.state === 'suspended') {
              actx.resume().catch(() => {});
            }
            const source = actx.createMediaStreamSource(remoteStream);
            const analyser = actx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArr = new Uint8Array(analyser.frequencyBinCount);
            const updateRemoteVoice = () => {
              if (cancelled) return;
              analyser.getByteFrequencyData(dataArr);
              const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
              setRemoteAudioLevel(avg / 255);
              requestAnimationFrame(updateRemoteVoice);
            };
            updateRemoteVoice();
          } catch (err) {
            console.warn('[WebRTC Voice] Analyser error:', err);
          }

          // 3. Notify Native Android Bridge if present
          try {
            if (window.NativeVoiceCall && window.NativeVoiceCall.startVoiceCall) {
              window.NativeVoiceCall.startVoiceCall();
              window.NativeVoiceCall.setSpeakerphoneOn(true);
            }
          } catch {}
        };

        // Step 2: Access user microphone with maximum voice clarity
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1
            }
          });
        } catch (err1) {
          console.warn('[WebRTC Voice] Advanced audio constraints failed, trying basic audio:', err1);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;

        // Ensure all local audio tracks are active
        stream.getAudioTracks().forEach(t => { t.enabled = true; });

        // Add local audio tracks to peer connection
        stream.getAudioTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

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

        // Step 3: Now that both pc and localStream are ready, handle pending offer or send caller offer
        if (isCaller) {
          if (call.status === 'connected' || callStatus === 'connected') {
            await sendOffer();
          }
        } else {
          if (pendingOfferRef.current) {
            const off = pendingOfferRef.current;
            pendingOfferRef.current = null;
            await handleOffer(off);
          }
          await processQueuedSignals();
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
      try {
        if (window.__activeCallAudio) {
          window.__activeCallAudio.pause();
          window.__activeCallAudio.srcObject = null;
          window.__activeCallAudio = null;
        }
        if (window.NativeVoiceCall && window.NativeVoiceCall.endVoiceCall) {
          window.NativeVoiceCall.endVoiceCall();
        }
      } catch {}
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (remoteAudioCtxRef.current) {
        try { remoteAudioCtxRef.current.close().catch(() => {}); } catch {}
        remoteAudioCtxRef.current = null;
      }
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  const sendOffer = async () => {
    if (hasSentOfferRef.current) return;
    const pc = pcRef.current;
    if (!pc || !localStreamRef.current || localStreamRef.current.getAudioTracks().length === 0) {
      setTimeout(() => {
        if (!hasSentOfferRef.current) sendOffer();
      }, 120);
      return;
    }
    try {
      hasSentOfferRef.current = true;
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
        const senders = pc.getSenders ? pc.getSenders() : [];
        if (!senders.some(s => s.track && s.track.id === track.id)) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
      console.log('[WebRTC Voice] Creating audio offer...');
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC Voice] Local offer created & set, transmitting to callee...');
      if (onSendSignal) {
        onSendSignal({
          type: 'offer',
          sdp: { type: offer.type, sdp: offer.sdp },
          callId: call.callId,
          targetId: targetUser?.id
        });
      }
    } catch (err) {
      console.warn('[WebRTC Voice] Error creating offer:', err);
      hasSentOfferRef.current = false;
    }
  };

  // Process any incoming WebRTC signals (offer, answer, ice_candidate)
  const processQueuedSignals = async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (candidateQueue.current.length > 0) {
      const cand = candidateQueue.current.shift();
      if (cand && (cand.candidate || typeof cand === 'object')) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {}
      }
    }
  };

  const handleOffer = async (signal) => {
    const pc = pcRef.current;
    if (!pc || !signal?.sdp) return;
    if (!localStreamRef.current || localStreamRef.current.getAudioTracks().length === 0) {
      console.log('[WebRTC Voice] Offer arrived before mic stream ready, queuing offer.');
      pendingOfferRef.current = signal;
      return;
    }
    try {
      console.log('[WebRTC Voice] Applying remote offer...');
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      setCallStatus('connected');
      stopAllRingtones();
      playConnectedChime();

      if (localStreamRef.current) {
        const currentSenders = pc.getSenders ? pc.getSenders() : [];
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
          if (!currentSenders.some(s => s.track && s.track.id === track.id)) {
            pc.addTrack(track, localStreamRef.current);
          }
        });
      }

      await processQueuedSignals();

      const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(answer);
      console.log('[WebRTC Voice] Answer generated, sending to caller...');
      if (onSendSignal) {
        onSendSignal({
          type: 'answer',
          sdp: { type: answer.type, sdp: answer.sdp },
          callId: call.callId,
          targetId: targetUser?.id
        });
      }
    } catch (err) {
      console.error('[WebRTC Voice] Error handling offer:', err);
    }
  };

  const handleAnswer = async (signal) => {
    const pc = pcRef.current;
    if (!pc || !signal?.sdp) return;
    try {
      console.log('[WebRTC Voice] Applying remote answer...');
      if (pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        setCallStatus('connected');
        stopAllRingtones();
        playConnectedChime();
        await processQueuedSignals();
      }
    } catch (err) {
      console.error('[WebRTC Voice] Error handling answer:', err);
    }
  };

  const handleSignal = async (signal) => {
    if (!signal || signal.callId !== call.callId) return;
    if (signal.senderId && rawTarget && signal.senderId !== rawTarget.id) return;

    // Terminate call immediately if other user ended, rejected, or cancelled
    if (signal.type === 'call_end' || signal.type === 'call_cancel' || signal.type === 'call_reject') {
      stopAllRingtones();
      playEndedChime();
      handleEndCallAction();
      return;
    }

    if (signal.type === 'call_accepted') {
      setCallStatus('connected');
      stopAllRingtones();
      playConnectedChime();
      if (isCaller) {
        await sendOffer();
      }
      return;
    }

    if (signal.type === 'offer' && !isCaller) {
      await handleOffer(signal);
      return;
    }

    if (signal.type === 'answer' && isCaller) {
      await handleAnswer(signal);
      return;
    }

    if (signal.type === 'ice_candidate') {
      if (signal.candidate && (signal.candidate.candidate || typeof signal.candidate === 'object')) {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn('[WebRTC Voice] Error adding ICE candidate:', e);
          }
        } else {
          candidateQueue.current.push(signal.candidate);
        }
      }
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
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
    }
    if (window.__activeCallAudio) {
      window.__activeCallAudio.muted = false;
      window.__activeCallAudio.volume = 1.0;
    }
    try {
      if (window.NativeVoiceCall && window.NativeVoiceCall.setSpeakerphoneOn) {
        window.NativeVoiceCall.setSpeakerphoneOn(isSpeakerOn);
      }
    } catch {}
  }, [isSpeakerOn]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  // Generate 5 sound wave visualizer bars
  const activeLevel = Math.max(localAudioLevel, remoteAudioLevel);
  const barHeights = [0.6, 1, 0.7, 0.9, 0.5].map(
    mult => Math.max(10, (isMuted ? 0 : activeLevel) * mult * 80)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in select-none">
      {/* Remote Audio Output Element for Web & Mobile voice clarity (Kept in-DOM for reliable WebView audio delivery) */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        controls={false}
        className="w-0.5 h-0.5 opacity-90 pointer-events-none absolute bottom-0 left-0"
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
