/**
 * hooks/useCollabEditor.js — The main collaboration hook
 *
 * Wires together:
 *   - WebSocket connection lifecycle (connect, reconnect, cleanup)
 *   - OTClient state machine
 *   - Editor DOM mutation → OT op generation
 *   - Incoming server messages → OT application
 *   - Presence state (cursor positions, active users)
 *
 * Returns everything the Editor component needs:
 *   { editorRef, doc, presence, status, title, setTitle }
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { OTClient } from '../lib/ot.js';
import { v4 as uuid } from 'uuid';

const rawWsUrl = import.meta.env.VITE_WS_URL;
const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const WS_URL = rawWsUrl || (isProd ? null : 'ws://localhost:3001');
const RECONNECT_DELAY_MS = 3000;

export function useCollabEditor(docId, token) {
  const [status,   setStatus]   = useState(WS_URL ? 'connecting' : 'disconnected'); // 'connecting' | 'connected' | 'disconnected'
  const [presence, setPresence] = useState([]);           // [{ socketId, email, color, cursor }]
  const [title,    setTitleState] = useState('Untitled');

  const wsRef       = useRef(null);
  const otRef       = useRef(null);      // OTClient instance
  const editorRef   = useRef(null);      // contentEditable DOM node
  const clientId    = useRef(uuid());    // stable per browser session
  const offlineOps  = useRef([]);        // ops queued while disconnected
  const reconnTimer = useRef(null);

  // ── Build and connect WebSocket ────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!docId || !token || !WS_URL) {
      if (!WS_URL) setStatus('disconnected');
      return;
    }

    const wsUrl = `${WS_URL}?token=${encodeURIComponent(token)}&docId=${encodeURIComponent(docId)}`;
    const ws    = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => {
      setStatus('connected');
      clearTimeout(reconnTimer.current);

      // If we have offline ops, send a sync request
      if (offlineOps.current.length > 0 && otRef.current) {
        const { fromRev, ops } = otRef.current.getOfflineQueue();
        ws.send(JSON.stringify({ type: 'sync', docId, fromRev, ops }));
        offlineOps.current = [];
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    };

    ws.onclose = () => {
      setStatus('disconnected');
      // Auto-reconnect after delay
      reconnTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [docId, token]); // eslint-disable-line

  useEffect(() => {
    // Initialize OT client
    otRef.current = new OTClient({
      clientId: clientId.current,
      sendOp: (op) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'op', docId, op }));
        } else {
          offlineOps.current.push(op);
        }
      },
    });

    connect();

    return () => {
      clearTimeout(reconnTimer.current);
      wsRef.current?.close();
    };
  }, [connect, docId]);

  // ── Handle messages from server ────────────────────────────────────────────
  const handleServerMessage = useCallback((msg) => {
    const ot  = otRef.current;
    const el  = editorRef.current;

    switch (msg.type) {

      case 'init': {
        // Fresh load — initialize OT state and set editor content
        ot.init(msg.doc, msg.revision);
        if (el) setEditorText(el, msg.doc);
        if (msg.title) setTitleState(msg.title);
        setPresence(msg.presence ?? []);
        break;
      }

      case 'ack': {
        // Our op was accepted by server
        ot.handleAck(msg.revision);
        break;
      }

      case 'op': {
        // Remote op from another client (already server-transformed)
        const { doc } = ot.handleRemoteOp(msg.op);
        if (el) setEditorText(el, doc);
        break;
      }

      case 'sync_complete': {
        // After offline reconnect sync
        ot.init(msg.doc, msg.revision);
        if (el) setEditorText(el, msg.doc);
        break;
      }

      case 'presence': {
        setPresence(msg.users ?? []);
        break;
      }

      case 'error': {
        console.error('[WS] server error:', msg.message);
        break;
      }
    }
  }, []); // eslint-disable-line

  // ── Editor input handler ───────────────────────────────────────────────────
  // We intercept keydown instead of relying on contentEditable's default
  // behavior, so we have full control over which ops we generate.
  const handleKeyDown = useCallback((e) => {
    const ot  = otRef.current;
    const el  = editorRef.current;
    if (!ot || !el) return;

    // Get cursor position in the plain-text document
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const pos   = getTextOffset(el, range.startContainer, range.startOffset);

    if (e.key === 'Backspace') {
      if (pos === 0) return;
      e.preventDefault();
      const newDoc = ot.localDelete(pos - 1);
      setEditorText(el, newDoc);
      restoreCursor(el, pos - 1);
      sendCursorPosition(pos - 1);
    } else if (e.key === 'Delete') {
      if (pos >= ot.doc.length) return;
      e.preventDefault();
      const newDoc = ot.localDelete(pos);
      setEditorText(el, newDoc);
      restoreCursor(el, pos);
      sendCursorPosition(pos);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const newDoc = ot.localInsert(pos, '\n');
      setEditorText(el, newDoc);
      restoreCursor(el, pos + 1);
      sendCursorPosition(pos + 1);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const newDoc = ot.localInsert(pos, e.key);
      setEditorText(el, newDoc);
      restoreCursor(el, pos + 1);
      sendCursorPosition(pos + 1);
    }
  }, []); // eslint-disable-line

  // Send cursor position to server
  const sendCursorPosition = useCallback((pos) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cursor', docId, pos }));
    }
  }, [docId]);

  // Handle selectionchange (mouse clicks, arrow keys)
  useEffect(() => {
    const handler = () => {
      const el  = editorRef.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.startContainer)) return;
      const pos = getTextOffset(el, range.startContainer, range.startOffset);
      sendCursorPosition(pos);
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [sendCursorPosition]);

  const setTitle = useCallback((newTitle) => {
    setTitleState(newTitle);
    // Debounced title update happens in the component
  }, []);

  return { editorRef, presence, status, title, setTitle, handleKeyDown, clientId: clientId.current };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set the contentEditable element's text without destroying the cursor.
 * We set textContent directly (fastest) and restore the cursor after.
 */
function setEditorText(el, text) {
  // Only update if text actually changed (avoid unnecessary reflow)
  if (el.textContent === text) return;
  el.textContent = text;
}

/**
 * Restore the cursor to a given plain-text offset after we've overwritten
 * the editor's textContent.
 */
function restoreCursor(el, offset) {
  const range = document.createRange();
  const sel   = window.getSelection();

  // Walk text nodes to find the right position
  let remaining = offset;
  let found = false;

  function walk(node) {
    if (found) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= node.textContent.length) {
        range.setStart(node, remaining);
        range.collapse(true);
        found = true;
      } else {
        remaining -= node.textContent.length;
      }
    } else {
      for (const child of node.childNodes) walk(child);
    }
  }

  walk(el);

  if (!found) {
    // Place cursor at end
    range.selectNodeContents(el);
    range.collapse(false);
  }

  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * Get the plain-text character offset of a DOM selection point
 * within the editor element.
 */
function getTextOffset(root, node, offset) {
  let pos = 0;
  let found = false;

  function walk(current) {
    if (found) return;
    if (current === node) {
      pos += offset;
      found = true;
      return;
    }
    if (current.nodeType === Node.TEXT_NODE) {
      pos += current.textContent.length;
    } else {
      for (const child of current.childNodes) walk(child);
    }
  }

  walk(root);
  return pos;
}
