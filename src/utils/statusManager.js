/**
 * Status & Music Story Manager for SecureChat
 * Manages WhatsApp-style status updates with background songs, text captions, and photos.
 */

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

/**
 * Fetch active statuses (removes statuses older than 24 hours)
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
      if (s && s.id && (now - s.timestamp) < TWENTY_FOUR_HOURS) {
        combinedMap.set(s.id, s);
      }
    });

    const valid = Array.from(combinedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    inMemoryStatuses = valid;
    return valid;
  } catch (err) {
    console.warn('Failed to parse localStorage statuses:', err);
    return inMemoryStatuses.filter(s => (now - s.timestamp) < TWENTY_FOUR_HOURS);
  }
}

/**
 * Save a new status update safely
 */
export function createStatusUpdate(statusData) {
  const existing = getActiveStatuses();
  const newStatus = {
    id: 'status_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: Date.now(),
    views: [statusData.userId || 'user_anon'],
    ...statusData
  };
  
  // Add to memory list
  inMemoryStatuses = [newStatus, ...existing];

  // Safely persist to LocalStorage (with memory store fallback)
  try {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(inMemoryStatuses));
  } catch (err) {
    console.warn('LocalStorage quota limit reached, in-memory store active:', err);
    // If LocalStorage quota limit is reached, save existing light statuses without crashing
    try {
      const recentLight = inMemoryStatuses.slice(0, 5);
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(recentLight));
    } catch {
      // Memory store keeps current session intact with full images and songs!
    }
  }

  return newStatus;
}

/**
 * Mark a status as viewed by current user
 */
export function markStatusAsViewed(statusId, userId) {
  if (!statusId || !userId) return;
  const existing = getActiveStatuses();
  let modified = false;

  const updated = existing.map(item => {
    if (item.id === statusId && !item.views.includes(userId)) {
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
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('Failed to delete status from localStorage:', err);
  }

  return getActiveStatuses();
}

/**
 * Group active statuses by user (strictly filters out statuses older than 24 hours)
 */
export function groupStatusesByUser(statuses) {
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const userMap = {};

  statuses.forEach(s => {
    // Enforce strict 24-hour expiration window (24h = 86,400,000 ms)
    if (s && s.timestamp && (now - s.timestamp) < TWENTY_FOUR_HOURS) {
      if (!userMap[s.userId]) {
        userMap[s.userId] = {
          userId: s.userId,
          userName: s.userName,
          userAvatar: s.userAvatar,
          statuses: []
        };
      }
      userMap[s.userId].statuses.push(s);
    }
  });

  return Object.values(userMap);
}
