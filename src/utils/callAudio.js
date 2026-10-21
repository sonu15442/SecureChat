// Web Audio API Ringtone & Call Audio Synthesizer
// Generates realistic telephone ringback & WhatsApp-style musical incoming ringtone
// 100% zero external audio file dependencies — works in all modern browsers reliably

let audioCtx = null;
let outgoingInterval = null;
let incomingInterval = null;
let activeOscillators = [];

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Start WhatsApp-style Outgoing Ringback Tone (calling someone else)
 * Produces standard periodic dual-tone cadence (440Hz + 480Hz)
 */
export function startOutgoingRingtone() {
  stopOutgoingRingtone();
  stopIncomingRingtone();

  const playToneBurst = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // Standard US/UK ringback frequencies
      osc2.frequency.setValueAtTime(480, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gainNode.gain.setValueAtTime(0.08, now + 1.2);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.3);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.35);
      osc2.stop(now + 1.35);

      activeOscillators.push(osc1, osc2);
      setTimeout(() => {
        activeOscillators = activeOscillators.filter(o => o !== osc1 && o !== osc2);
      }, 1400);
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
  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch {}
  });
  activeOscillators = [];
}

/**
 * Start WhatsApp-style Musical Incoming Ringtone (someone calling you)
 * Loops a bright, cheerful arpeggiated melodic chime until picked up or declined
 */
export function startIncomingRingtone() {
  stopOutgoingRingtone();
  stopIncomingRingtone();

  const playMelody = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // WhatsApp / iPhone style musical ringtone sequence:
      // Notes: E5 (659Hz), G#5 (830Hz), B5 (987Hz), E6 (1318Hz), B5 (987Hz), G#5 (830Hz)
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
        const gain = ctx.createGain();

        // Pleasant bell/marimba tone shape
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(0.22, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);

        activeOscillators.push(osc);
      });

      setTimeout(() => {
        activeOscillators = [];
      }, 1600);
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
  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch {}
  });
  activeOscillators = [];
}

/**
 * Play brief Call Connected chime
 */
export function playConnectedChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.12); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {}
}

/**
 * Play Call Ended disconnect tone
 */
export function playEndedChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.25);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch {}
}
