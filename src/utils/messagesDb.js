/**
 * IndexedDB storage for Chat Messages
 * Provides persistent offline storage for all messages including large media
 * (videos, documents, audio recordings, high-res photos)
 * Bypasses the strict 5MB LocalStorage quota limit so sending and receiving
 * attachments never fails with QuotaExceededError.
 */

const DB_NAME = 'SecureChat_MessagesDB';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

let dbPromise = null;

function getDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
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
        console.warn('IndexedDB open error for messages:', event.target.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB initialization failed for messages:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Save a single message into IndexedDB
 */
export async function saveMessageToDb(message) {
  if (!message || !message.id) return;
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(message);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Save multiple messages into IndexedDB
 */
export async function saveMessagesToDb(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return;
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      messages.forEach((m) => {
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
 * Get all messages from IndexedDB
 */
export async function getAllMessagesFromDb() {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result;
        if (Array.isArray(results)) {
          resolve(results);
        } else {
          resolve([]);
        }
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Delete a single message from IndexedDB
 */
export async function deleteMessageFromDb(messageId) {
  if (!messageId) return;
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(messageId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Clear messages for a specific conversation or global chat from IndexedDB
 */
export async function clearMessagesFromDb(userId, targetId) {
  const all = await getAllMessagesFromDb();
  const isGlobal = targetId === 'global' || !targetId;

  const toDelete = all.filter(m => {
    if (isGlobal) {
      return !m.recipientId || m.recipientId === 'global';
    }
    return (
      (m.senderId === userId && (m.recipientId === targetId || m.receiverId === targetId)) ||
      (m.senderId === targetId && (m.recipientId === userId || m.receiverId === userId))
    );
  });

  const db = await getDb();
  if (!db || toDelete.length === 0) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      toDelete.forEach(m => store.delete(m.id));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
