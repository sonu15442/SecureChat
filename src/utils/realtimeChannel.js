// Real-time communication via BroadcastChannel API
// Works across tabs in the same browser origin

const CHANNEL_NAME = 'securechat_realtime';
const HEARTBEAT_INTERVAL = 3000;
const PRESENCE_TIMEOUT = 8000;

let channel = null;
let heartbeatTimer = null;
let presenceCheckTimer = null;
let currentUserId = null;
let currentUserData = null;
const onlineUsers = new Map(); // userId -> { user, lastSeen }
const listeners = new Map(); // eventType -> Set<callback>

function emit(eventType, data) {
  const cbs = listeners.get(eventType);
  if (cbs) cbs.forEach(cb => cb(data));
}

export function initChannel(user) {
  if (channel) destroyChannel();
  
  currentUserId = user.id;
  currentUserData = user;
  channel = new BroadcastChannel(CHANNEL_NAME);

  channel.onmessage = (e) => {
    const { type, payload, senderId } = e.data;
    if (senderId === currentUserId) return; // ignore own messages

    switch (type) {
      case 'message':
        emit('message', payload);
        break;
      case 'heartbeat':
        onlineUsers.set(payload.user.id, { user: payload.user, lastSeen: Date.now() });
        emit('presence', getOnlineUsersList());
        break;
      case 'user_joined':
        onlineUsers.set(payload.user.id, { user: payload.user, lastSeen: Date.now() });
        emit('presence', getOnlineUsersList());
        emit('user_joined', payload.user);
        // Respond with our own presence so the new user sees us
        broadcastRaw('heartbeat', { user: currentUserData });
        break;
      case 'user_left':
        onlineUsers.delete(payload.userId);
        emit('presence', getOnlineUsersList());
        break;
      case 'typing':
        emit('typing', payload);
        break;
    }
  };

  // Announce join
  broadcastRaw('user_joined', { user: currentUserData });

  // Start heartbeat
  heartbeatTimer = setInterval(() => {
    broadcastRaw('heartbeat', { user: currentUserData });
  }, HEARTBEAT_INTERVAL);

  // Check for stale users
  presenceCheckTimer = setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [uid, entry] of onlineUsers) {
      if (now - entry.lastSeen > PRESENCE_TIMEOUT) {
        onlineUsers.delete(uid);
        changed = true;
      }
    }
    if (changed) emit('presence', getOnlineUsersList());
  }, PRESENCE_TIMEOUT / 2);
}

function broadcastRaw(type, payload) {
  if (!channel) return;
  channel.postMessage({ type, payload, senderId: currentUserId });
}

export function broadcastMessage(msg) {
  broadcastRaw('message', msg);
}

export function broadcastTyping(userId, userName) {
  broadcastRaw('typing', { userId, userName, timestamp: Date.now() });
}

export function on(eventType, callback) {
  if (!listeners.has(eventType)) listeners.set(eventType, new Set());
  listeners.get(eventType).add(callback);
  return () => {
    listeners.get(eventType)?.delete(callback);
  };
}

export function getOnlineUsersList() {
  return Array.from(onlineUsers.values()).map(e => e.user);
}

export function destroyChannel() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (presenceCheckTimer) clearInterval(presenceCheckTimer);
  if (channel) {
    broadcastRaw('user_left', { userId: currentUserId });
    channel.close();
    channel = null;
  }
  onlineUsers.clear();
  listeners.clear();
  currentUserId = null;
  currentUserData = null;
}
