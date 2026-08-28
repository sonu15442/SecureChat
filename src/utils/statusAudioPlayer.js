import { POPULAR_SONG_PRESETS } from './statusManager';

let audioCtx = null;
let currentSynthInterval = null;
let currentHtmlAudio = null;

export function resumeAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function resolveAudioUrl(target) {
  if (!target) return null;
  if (typeof target === 'string') {
    if (target.startsWith('http') || target.startsWith('data:')) {
      return target;
    }
    const preset = POPULAR_SONG_PRESETS.find(p => p.id === target || p.title === target || target.includes(p.id));
    if (preset) return preset.audioUrl;
    return target;
  }
  if (typeof target === 'object') {
    return target.audioUrl || target.songAudioUrl || resolveAudioUrl(target.id || target.title);
  }
  return null;
}

/**
 * Play a status song (Real MP3 audio stream, uploaded device song, or Base64 audio)
 */
export function playStatusSong(songPresetOrUrl, isMuted = false) {
  stopStatusSong();
  if (isMuted || !songPresetOrUrl) return;

  const audioUrl = resolveAudioUrl(songPresetOrUrl);

  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      audio.loop = true;
      audio.muted = isMuted;
      currentHtmlAudio = audio;
      audio.play().catch(err => {
        console.warn('Real MP3 audio playback user gesture required:', err);
      });
    } catch (err) {
      console.error('Audio initialization error:', err);
    }
  }
}

/**
 * Stop currently playing status song immediately
 */
export function stopStatusSong() {
  if (currentSynthInterval) {
    clearInterval(currentSynthInterval);
    currentSynthInterval = null;
  }
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
      currentHtmlAudio.removeAttribute('src');
      currentHtmlAudio.load();
    } catch (e) {
      // ignore
    }
    currentHtmlAudio = null;
  }
  if (audioCtx && audioCtx.state !== 'closed') {
    try {
      audioCtx.suspend();
    } catch (e) {
      // ignore
    }
  }
}
