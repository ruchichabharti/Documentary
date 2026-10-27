/**
 * ws/rooms.js — WebSocket room management
 *
 * A "room" is just the set of WebSocket connections that are editing the same
 * document. Every message that arrives for docId X is broadcast to all other
 * sockets in that room (excluding the sender).
 *
 * Data structure:
 *   rooms: Map<docId, Map<socketId, { ws, userId, email, color, cursor }>>
 *
 * We use a Map of Maps (not Map<docId, Set>) so we can attach metadata
 * to each socket (user info, cursor position) without extra lookup tables.
 */

// rooms: Map<docId, Map<socketId, ClientInfo>>
const rooms = new Map();

/**
 * Add a socket to a document room.
 * @param {string} docId
 * @param {string} socketId  - unique ID generated on connection
 * @param {WebSocket} ws
 * @param {object} userInfo  - { userId, email, color }
 */
export function joinRoom(docId, socketId, ws, userInfo) {
  if (!rooms.has(docId)) {
    rooms.set(docId, new Map());
  }
  rooms.get(docId).set(socketId, { ws, ...userInfo, cursor: null });
}

/**
 * Remove a socket from all rooms (called on socket 'close').
 */
export function leaveAllRooms(socketId) {
  for (const [docId, clients] of rooms) {
    if (clients.has(socketId)) {
      clients.delete(socketId);
      if (clients.size === 0) {
        rooms.delete(docId); // GC empty rooms
      }
    }
  }
}

/**
 * Broadcast a message to all sockets in a room EXCEPT the sender.
 * @param {string}  docId
 * @param {string}  senderSocketId
 * @param {object}  message - will be JSON.stringify'd
 */
export function broadcastToRoom(docId, senderSocketId, message) {
  const clients = rooms.get(docId);
  if (!clients) return;

  const payload = JSON.stringify(message);
  for (const [id, client] of clients) {
    if (id !== senderSocketId && client.ws.readyState === 1 /* OPEN */) {
      client.ws.send(payload);
    }
  }
}

/**
 * Update a client's cursor position in the room metadata.
 */
export function updateCursor(docId, socketId, cursor) {
  const clients = rooms.get(docId);
  if (clients?.has(socketId)) {
    clients.get(socketId).cursor = cursor;
  }
}

/**
 * Get presence info for all clients in a room (for broadcasting on join/leave/cursor).
 */
export function getPresence(docId) {
  const clients = rooms.get(docId);
  if (!clients) return [];
  return Array.from(clients.entries()).map(([socketId, info]) => ({
    socketId,
    userId:  info.userId,
    email:   info.email,
    color:   info.color,
    cursor:  info.cursor,
  }));
}

/**
 * Get a specific client's WebSocket (used to send direct ACKs).
 */
export function getClient(docId, socketId) {
  return rooms.get(docId)?.get(socketId) ?? null;
}
