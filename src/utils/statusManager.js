/**
 * Status & Music Story Manager for SecureChat
 * Manages WhatsApp-style status updates with background songs, text captions, and photos.
 */

import { createMomentApi, getMomentsApi, viewMomentApi, deleteMomentApi } from './api';

const STATUS_STORAGE_KEY = 'securechat_statuses';

// Pre-packaged movie themes and popular song presets with REAL MP3 Audio Streams
export const POPULAR_SONG_PRESETS = [
  {
    id: 'movie_titanic',
    title: 'Titanic (My Heart Will Go On)',
    artist: 'Celine Dion / Orchestral Original',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=romantic-flute-20155.mp3',
    genre: 'Movie Romantic',
    cover: '🚢'
  },
  {
    id: 'movie_avengers',
    title: 'Avengers Main Theme',
    artist: 'Cinematic Hero Brass Orchestra',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=epic-cinematic-trailer-113988.mp3',
    genre: 'Cinematic Hero',
    cover: '🦸'
  },
  {
    id: 'movie_interstellar',
    title: 'Interstellar (Cornfield Chase)',
    artist: 'Hans Zimmer Organ Theme',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    genre: 'Sci-Fi Organ',
    cover: '🚀'
  },
  {
    id: 'movie_pirates',
    title: 'Pirates of Caribbean',
    artist: 'He\'s a Pirate Symphony',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c268837e20.mp3?filename=action-orchestral-18361.mp3',
    genre: 'Action Violin',
    cover: '🎻'
  },
  {
    id: 'movie_bollywood',
    title: 'Bollywood Romance (Tum Hi Ho)',
    artist: 'Arijit Singh Acoustic Melody',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=indian-romantic-melody-116170.mp3',
    genre: 'Bollywood',
    cover: '🌹'
  },
  {
    id: 'movie_kgf',
    title: 'KGF & Pushpa Mass Action BGM',
    artist: 'Rocky Bhai South Hero Bass',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_3497b79d23.mp3?filename=heavy-bass-action-bgm-20512.mp3',
    genre: 'South Mass Bass',
    cover: '⚡'
  }
];

export const STATUS_BACKGROUND_GRADIENTS = [
  'linear-gradient(135deg, #0575E6 0%, #00F260 100%)',
  'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%)',
  'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  'linear-gradient(135deg, #f12711 0%, #f5af19 100%)'
];

// In-memory fallback store to ensure statuses never fail even if LocalStorage hits quota limits
let inMemoryStatuses = [];

function safePersistStatuses(statuses) {
  try {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statuses));
  } catch (err) {
    try {
      // If large base64 media exceeds localStorage quota, save metadata with light media references
      const light = statuses.map(s => {
        const isHugeVideo = typeof s.videoUrl === 'string' && s.videoUrl.length > 200000;
        const isHugeImage = typeof s.imageUrl === 'string' && s.imageUrl.length > 300000;
        return {
          ...s,
          videoUrl: isHugeVideo ? null : s.videoUrl,
          imageUrl: isHugeImage ? null : s.imageUrl,
          hasFullMediaOnServer: isHugeVideo || isHugeImage
        };
      });
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(light));
    } catch {}
  }
}

/**
 * Fetch active statuses (removes statuses strictly older than 24 hours)
 */
export function getActiveStatuses() {
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    const localAll = raw ? JSON.parse(raw) : [];
    
    // Combine local storage and in-memory statuses, deduplicating by ID
    const combinedMap = new Map();
    [...inMemoryStatuses, ...localAll].forEach(s => {
      if (!s || !s.id) return;
      const ts = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
      // Keep moment for full 24 hours (86,400,000 ms)
      if (!isNaN(ts) && (now - ts) < TWENTY_FOUR_HOURS) {
        combinedMap.set(s.id, { ...s, timestamp: ts });
      }
    });

    const valid = Array.from(combinedMap.values())
      .map(s => {
        if (s && s.userId && Array.isArray(s.views)) {
          return { ...s, views: s.views.filter(vId => String(vId) !== String(s.userId)) };
        }
        return s;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
    inMemoryStatuses = valid;

    // Persist cleaned list back to localStorage to drop expired moments automatically (>24 hours)
    if (valid.length !== localAll.length) {
      safePersistStatuses(valid);
    }

    return valid;
  } catch (err) {
    console.warn('Failed to parse localStorage statuses:', err);
    return inMemoryStatuses.filter(s => {
      const ts = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
      return !isNaN(ts) && (now - ts) < TWENTY_FOUR_HOURS;
    });
  }
}

/**
 * Sync statuses from backend server (enables cross-device Moments visibility)
 */
export async function syncStatusesFromBackend() {
  try {
    const serverMoments = await getMomentsApi();
    if (Array.isArray(serverMoments)) {
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const combinedMap = new Map();
      
      // Existing local & in-memory
      getActiveStatuses().forEach(s => combinedMap.set(s.id, s));
      // Merge server moments
      serverMoments.forEach(s => {
        if (!s || !s.id) return;
        const ts = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
        if (!isNaN(ts) && (now - ts) < TWENTY_FOUR_HOURS) {
          combinedMap.set(s.id, { ...combinedMap.get(s.id), ...s, timestamp: ts });
        }
      });

      const merged = Array.from(combinedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      inMemoryStatuses = merged;
      safePersistStatuses(merged);
      return merged;
    }
  } catch {}
  return getActiveStatuses();
}

/**
 * Save a new status update safely and sync to backend
 */
export function createStatusUpdate(statusData) {
  const existing = getActiveStatuses();
  const newStatus = {
    id: 'status_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: Date.now(),
    views: [], // Author is NEVER in viewers list
    ...statusData
  };
  
  // Add to memory list
  inMemoryStatuses = [newStatus, ...existing.filter(s => s.id !== newStatus.id)];

  // Safely persist to LocalStorage (with memory store fallback)
  safePersistStatuses(inMemoryStatuses);

  // Broadcast & persist to backend server immediately so all devices see it and stay for 24 hours
  createMomentApi(newStatus).catch((err) => {
    console.warn('Error syncing created moment to server:', err);
  });

  return newStatus;
}

/**
 * Mark a status as viewed by current user (author is excluded)
 */
export function markStatusAsViewed(statusId, userId) {
  if (!statusId || !userId) return;
  const existing = getActiveStatuses();
  let modified = false;

  const updated = existing.map(item => {
    // Creator should never be added to their own views list
    if (item.id === statusId && String(item.userId) !== String(userId) && !item.views.includes(userId)) {
      modified = true;
      return { ...item, views: [...item.views, userId] };
    }
    return item;
  });

  if (modified) {
    inMemoryStatuses = updated;
    try {
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Memory store is active
    }
    viewMomentApi(statusId, userId).catch(() => {});
  }
  return updated;
}

/**
 * Delete a status update by ID
 */
export function deleteStatus(statusId) {
  if (!statusId) return getActiveStatuses();
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  inMemoryStatuses = inMemoryStatuses.filter(s => s.id !== statusId);

  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    if (raw) {
      const all = JSON.parse(raw);
      const filtered = all.filter(s => s.id !== statusId && (now - s.timestamp) < TWENTY_FOUR_HOURS);
      safePersistStatuses(filtered);
    }
  } catch (err) {
    console.warn('Failed to delete status from localStorage:', err);
  }

  deleteMomentApi(statusId).catch(() => {});
  return inMemoryStatuses;
}

/**
 * Group active statuses by user (strictly filters out statuses older than 24 hours)
 */
export function groupStatusesByUser(statuses) {
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const userMap = {};

  (Array.isArray(statuses) ? statuses : []).forEach(s => {
    if (!s || !s.userId) return;
    const ts = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
    if (!isNaN(ts) && Math.abs(now - ts) < TWENTY_FOUR_HOURS) {
      if (!userMap[s.userId]) {
        userMap[s.userId] = {
          userId: s.userId,
          userName: s.userName || 'User',
          userAvatar: s.userAvatar,
          statuses: []
        };
      }
      userMap[s.userId].statuses.push({ ...s, timestamp: ts });
    }
  });

  return Object.values(userMap);
}
