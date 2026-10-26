// Web Audio API Ringtone & Call Audio Synthesizer
// Generates realistic telephone ringback & WhatsApp-style musical incoming ringtone
// 100% zero external audio file dependencies — works in all modern browsers reliably

let audioCtx = null;
let outgoingInterval = null;
let incomingInterval = null;
let outgoingOscillators = [];
let incomingOscillators = [];
let masterOutgoingGain = null;
let masterIncomingGain = null;

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Stop any and all active ringtones instantly with zero delay
 */
export function stopAllRingtones() {
  stopOutgoingRingtone();
  stopIncomingRingtone();
}

/**
 * Start WhatsApp-style Outgoing Ringback Tone (calling someone else)
 * Produces standard periodic dual-tone cadence (440Hz + 480Hz)
 */
export function startOutgoingRingtone() {
  stopOutgoingRingtone();
  stopIncomingRingtone();

  const ctx = getAudioContext();
  if (!ctx) return;

  masterOutgoingGain = ctx.createGain();
  masterOutgoingGain.gain.setValueAtTime(1.0, ctx.currentTime);
  masterOutgoingGain.connect(ctx.destination);

  const playToneBurst = () => {
    try {
      if (!masterOutgoingGain) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const burstGain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      burstGain.gain.setValueAtTime(0, now);
      burstGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      burstGain.gain.setValueAtTime(0.08, now + 1.2);
      burstGain.gain.linearRampToValueAtTime(0, now + 1.3);

      osc1.connect(burstGain);
      osc2.connect(burstGain);
      burstGain.connect(masterOutgoingGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.35);
      osc2.stop(now + 1.35);

      outgoingOscillators.push(osc1, osc2);
    } catch {}
  };

  playToneBurst();
  outgoingInterval = setInterval(playToneBurst, 3200);
}

export function stopOutgoingRingtone() {
  if (outgoingInterval) {
    clearInterval(outgoingInterval);
    outgoingInterval = null;
  }
  if (masterOutgoingGain && audioCtx) {
    try {
      masterOutgoingGain.gain.setValueAtTime(0, audioCtx.currentTime);
      masterOutgoingGain.disconnect();
    } catch {}
    masterOutgoingGain = null;
  }
  outgoingOscillators.forEach(osc => {
    try { osc.stop(); } catch {}
  });
  outgoingOscillators = [];
}

/**
 * Start WhatsApp-style Musical Incoming Ringtone (someone calling you)
 * Loops a bright, cheerful arpeggiated melodic chime until picked up or declined
 */
export function startIncomingRingtone() {
  stopOutgoingRingtone();
  stopIncomingRingtone();

  const ctx = getAudioContext();
  if (!ctx) return;

  masterIncomingGain = ctx.createGain();
  masterIncomingGain.gain.setValueAtTime(1.0, ctx.currentTime);
  masterIncomingGain.connect(ctx.destination);

  const playMelody = () => {
    try {
      if (!masterIncomingGain) return;
      const now = ctx.currentTime;

      // WhatsApp / iPhone style musical ringtone sequence
      const notes = [
        { freq: 659.25, time: 0.00, dur: 0.18 },
        { freq: 830.61, time: 0.20, dur: 0.18 },
        { freq: 987.77, time: 0.40, dur: 0.22 },
        { freq: 1318.51, time: 0.65, dur: 0.35 },
        { freq: 987.77, time: 1.05, dur: 0.18 },
        { freq: 830.61, time: 1.25, dur: 0.28 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        noteGain.gain.setValueAtTime(0.001, now + time);
        noteGain.gain.linearRampToValueAtTime(0.22, now + time + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(noteGain);
        noteGain.connect(masterIncomingGain);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);

        incomingOscillators.push(osc);
      });
    } catch {}
  };

  playMelody();
  incomingInterval = setInterval(playMelody, 2000);
}

export function stopIncomingRingtone() {
  if (incomingInterval) {
    clearInterval(incomingInterval);
    incomingInterval = null;
  }
  if (masterIncomingGain && audioCtx) {
    try {
      masterIncomingGain.gain.setValueAtTime(0, audioCtx.currentTime);
      masterIncomingGain.disconnect();
    } catch {}
    masterIncomingGain = null;
  }
  incomingOscillators.forEach(osc => {
    try { osc.stop(); } catch {}
  });
  incomingOscillators = [];
}

/**
 * Play brief Call Connected chime
 */
export function playConnectedChime() {
  stopAllRingtones();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chimeNotes = [523.25, 659.25, 783.99]; // C5, E5, G5
    chimeNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.2);
    });
  } catch {}
}

/**
 * Play brief Call Ended / Disconnected tone
 */
export function playEndedChime() {
  stopAllRingtones();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.25);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  } catch {}
}
