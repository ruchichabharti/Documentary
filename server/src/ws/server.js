/**
 * ws/server.js — WebSocket message handler
 *
 * This is the core collaboration loop:
 *   1. Client connects with ?token=<JWT>&docId=<id>
 *   2. Server verifies token, loads document from DB
 *   3. Client sends operations (insert/delete/cursor/sync)
 *   4. Server transforms ops (OT), persists, broadcasts to room
 *   5. Server sends ACK with new revision to the sender
 *
 * ─────────────────────────────────────────────────────────────
 * MESSAGE TYPES (client → server)
 * ─────────────────────────────────────────────────────────────
 *   op:     { type:'op', docId, op: {type,pos,char,rev,clientId} }
 *   cursor: { type:'cursor', docId, pos }
 *   sync:   { type:'sync', docId, fromRev, ops: [...] }  — reconnect
 *
 * MESSAGE TYPES (server → client)
 * ─────────────────────────────────────────────────────────────
 *   init:     { type:'init', doc, revision, presence }
 *   ack:      { type:'ack', revision, opId }            — to sender
 *   op:       { type:'op', op, revision }               — to peers
 *   presence: { type:'presence', users }                — all in room
 *   error:    { type:'error', message }
 */

import { WebSocketServer } from 'ws';
import { v4 as uuid }      from 'uuid';
import { verifyToken }     from '../auth/jwt.js';
import { transformAgainstMany, applyOp } from '../ot/transform.js';
import {
  joinRoom, leaveAllRooms, broadcastToRoom,
  updateCursor, getPresence, getClient,
} from './rooms.js';
import {
  getDocument, getOrCreateDocument, saveOperation, updateDocumentContent,
  getOpsSinceRevision,
} from '../db/queries.js';

// How often to write a content snapshot (avoids replaying all history on load)
const SNAPSHOT_INTERVAL = 50;

export function createWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', async (ws, req) => {
    // ── 1. Parse query string ─────────────────────────────────────────────
    const url    = new URL(req.url, 'http://localhost');
    const token  = url.searchParams.get('token');
    const docId  = url.searchParams.get('docId');

    if (!token || !docId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing token or docId' }));
      ws.close(4001, 'Unauthorized');
      return;
    }

    // ── 2. Verify JWT or support Guest/Demo mode ──────────────────────────
    let user;
    try {
      user = verifyToken(token);
    } catch {
      if (
        token.startsWith('mock-') ||
        token.startsWith('demo-') ||
        token === 'guest-collab-token' ||
        token.includes('guest')
      ) {
        user = { sub: 'guest-' + Math.random().toString(36).slice(2, 8), email: 'guest@docmind.local' };
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
        ws.close(4001, 'Unauthorized');
        return;
      }
    }

    // ── 3. Load document (async with getOrCreateDocument) ─────────────────
    const doc = await getOrCreateDocument(docId, user.sub);
    if (!doc) {
      ws.send(JSON.stringify({ type: 'error', message: 'Document not found' }));
      ws.close(4004, 'Not Found');
      return;
    }

    // Assign a deterministic color from the userId (HSL wheel)
    const hue   = stringToHue(user.sub);
    const color = `hsl(${hue}, 65%, 55%)`;
    const socketId = uuid();

    // ── 4. Join the room ──────────────────────────────────────────────────
    joinRoom(docId, socketId, ws, {
      userId: user.sub,
      email:  user.email,
      color,
    });

    // ── 5. Send initial document state to the joining client ──────────────
    ws.send(JSON.stringify({
      type:     'init',
      doc:      doc.content,
      revision: doc.revision,
      title:    doc.title,
      presence: getPresence(docId),
    }));

    // Broadcast updated presence to existing room members
    broadcastToRoom(docId, socketId, {
      type:  'presence',
      users: getPresence(docId),
    });

    // ── 6. Message loop ───────────────────────────────────────────────────
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); }
      catch { return; }

      switch (msg.type) {

        // ── Operation (insert / delete) ───────────────────────────────────
        case 'op': {
          handleOp(docId, socketId, msg.op);
          break;
        }

        // ── Cursor position update ────────────────────────────────────────
        case 'cursor': {
          updateCursor(docId, socketId, msg.pos);
          broadcastToRoom(docId, socketId, {
            type:     'presence',
            users:    getPresence(docId),
          });
          break;
        }

        // ── Offline reconnect: client sends buffered ops ──────────────────
        case 'sync': {
          handleSync(docId, socketId, msg, ws);
          break;
        }
      }
    });

    // ── 7. Cleanup on disconnect ──────────────────────────────────────────
    ws.on('close', () => {
      leaveAllRooms(socketId);
      // Broadcast updated presence (user left)
      broadcastToRoom(docId, socketId, {
        type:  'presence',
        users: getPresence(docId),
      });
    });
  });

  return wss;
}

// ─────────────────────────────────────────────────────────────────────────────
// handleOp — apply a single client operation via OT
// ─────────────────────────────────────────────────────────────────────────────
async function handleOp(docId, socketId, clientOp) {
  // Load current doc state from DB (snapshot + replay is handled by getDocument)
  const doc = await getDocument(docId);
  if (!doc) return;

  const serverRev = doc.revision;
  const clientRev = clientOp.rev; // the revision the client composed this op against

  let op = { ...clientOp };

  // Transform against any ops the client missed since clientRev
  if (clientRev < serverRev) {
    const missedOps = await getOpsSinceRevision(docId, clientRev);
    op = transformAgainstMany(op, missedOps);
  }

  // Apply the (now correctly positioned) op to the document
  const newContent = applyOp(doc.content, op);
  const newRev     = serverRev + 1;

  // Persist the transformed op to the operations log
  await saveOperation({
    docId,
    clientId: op.clientId,
    type:     op.type,
    pos:      op.pos,
    char:     op.char ?? null,
    revision: newRev,
  });

  // Write snapshot every SNAPSHOT_INTERVAL ops to avoid full-history replay
  if (newRev % SNAPSHOT_INTERVAL === 0) {
    await updateDocumentContent(docId, newContent, newRev, newRev);
  } else {
    await updateDocumentContent(docId, newContent, newRev, doc.snapshot_revision);
  }

  // Send ACK to the originating client with the server-assigned revision
  const { ws: senderWs } = getSenderFromRoom(docId, socketId) ?? {};
  if (senderWs?.readyState === 1) {
    senderWs.send(JSON.stringify({
      type:     'ack',
      opId:     clientOp.opId,   // echo client's temp ID so client can match it
      revision: newRev,
      op:       { ...op, rev: newRev },
    }));
  }

  // Broadcast the server-transformed op to all other clients in the room
  broadcastToRoom(docId, socketId, {
    type:     'op',
    op:       { ...op, rev: newRev },
    revision: newRev,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// handleSync — merge offline buffered ops on reconnect
// ─────────────────────────────────────────────────────────────────────────────
async function handleSync(docId, socketId, msg, ws) {
  const { fromRev, ops: bufferedOps } = msg;
  if (!Array.isArray(bufferedOps) || bufferedOps.length === 0) return;

  // For each buffered op, run it through OT against server ops since fromRev
  for (const op of bufferedOps) {
    await handleOp(docId, socketId, { ...op, rev: fromRev });
  }

  // Send full doc state so client can reconcile
  const doc = await getDocument(docId);
  ws.send(JSON.stringify({
    type:     'sync_complete',
    doc:      doc ? doc.content : '',
    revision: doc ? doc.revision : 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getSenderFromRoom(docId, socketId) {
  return getClient(docId, socketId);
}

/** Deterministic hue from a string (userId) — stable across reconnects */
function stringToHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
