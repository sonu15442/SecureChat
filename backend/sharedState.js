// Server-Sent Events (SSE) clients for real-time synchronization across Web and Mobile
export const sseClients = new Set();

export function broadcastEvent(type, payload) {
  const data = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// In-memory active presence tracking across devices (25s timeout)
export const activePresenceMap = new Map(); // userId -> { user, lastSeen }
export const PRESENCE_TIMEOUT_MS = 25000;

// Active Call Signaling & State Hub for Web & Mobile
export const activeCallSignals = new Map(); // callId -> Array of { signal, timestamp }
export const activeCalls = new Map(); // callId -> { callId, status, callerId, recipientId, lastUpdated }

// Threat intelligence and crypto caches
export const fraudThreatReports = [];
export const clientPublicKeys = new Map();
export const mobileDeviceVaults = new Map();
