/**
 * IndexedDB storage for Moments (Stories)
 * Provides persistent offline storage for large media (videos and high-res images)
 * so that video stories never disappear or get stripped to null when offline or when USB is unplugged.
 */

const DB_NAME = 'SecureChat_MomentsDB';
const DB_VERSION = 1;
const STORE_NAME = 'moments';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

let dbPromise = null;

function getDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB open error for moments:', event.target.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB initialization failed:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Save a single moment into IndexedDB
 */
export async function saveMomentToDb(moment) {
  if (!moment || !moment.id) return;
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(moment);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Save multiple moments into IndexedDB
 */
export async function saveMomentsToDb(moments) {
  if (!Array.isArray(moments) || moments.length === 0) return;
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      moments.forEach((m) => {
        if (m && m.id) {
          store.put(m);
        }
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Get all active moments from IndexedDB (<24h)
 */
export async function getAllMomentsFromDb() {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result || [];
        const now = Date.now();
        const active = all.filter((m) => {
          if (!m || !m.timestamp) return false;
          const ts = typeof m.timestamp === 'number' ? m.timestamp : new Date(m.timestamp).getTime();
          return !isNaN(ts) && now - ts < TWENTY_FOUR_HOURS;
        });
        resolve(active);
      };

      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Delete a moment by ID from IndexedDB
 */
export async function deleteMomentFromDb(momentId) {
  if (!momentId) return;
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(momentId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
