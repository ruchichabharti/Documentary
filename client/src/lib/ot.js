/**
 * lib/ot.js — Client-side OT state machine
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CLIENT STATE MACHINE (Jupiter model, client side)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every client maintains three pieces of state:
 *
 *   serverRev  — The revision number of the last server ACK we received.
 *                Our local document matches the server document at this rev.
 *
 *   inFlight   — An op we've sent to the server but haven't received an ACK
 *                for yet. While inFlight exists, we don't send more ops —
 *                we buffer them instead.
 *                (null when nothing is in flight)
 *
 *   buffer     — Ops typed locally while waiting for an inFlight ACK.
 *                These are composed together (a sequence to apply after inFlight).
 *
 * ─── When the user types ─────────────────────────────────────────────────────
 *   1. Create an op from the keystroke.
 *   2. Apply it to the local document immediately (optimistic update).
 *   3. If nothing is inFlight, send the op and mark it as inFlight.
 *      Else, append it to buffer.
 *
 * ─── When ACK arrives from server ────────────────────────────────────────────
 *   1. Clear inFlight. Update serverRev.
 *   2. If buffer has ops, send the first one as new inFlight.
 *
 * ─── When a remote op arrives from server ─────────────────────────────────────
 *   Remote op was applied AFTER our inFlight and buffer on the server.
 *   We must transform the remote op against our local (inFlight + buffer)
 *   before applying it to our local doc, so our local text stays consistent.
 *
 *   remoteOp' = transform(transform(remoteOp, inFlight), each buffer op)
 *
 *   Also transform inFlight and buffer against remoteOp' so they're still
 *   correct when we eventually send them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { transform, applyOp } from './transform.js';
import { v4 as uuid } from 'uuid';

export class OTClient {
  constructor({ clientId, sendOp }) {
    this.clientId  = clientId;  // stable ID for this browser session
    this.sendOp    = sendOp;    // function(op) → sends op over WebSocket

    this.serverRev = 0;
    this.inFlight  = null;      // op | null
    this.buffer    = [];        // op[]
    this.doc       = '';        // current local document text
  }

  // ─── Initialize from server's init message ─────────────────────────────────
  init(doc, revision) {
    this.doc       = doc;
    this.serverRev = revision;
    this.inFlight  = null;
    this.buffer    = [];
  }

  // ─── User typed something — create and apply op locally ───────────────────
  localInsert(pos, char) {
    return this._applyLocal({ type: 'insert', pos, char, clientId: this.clientId, opId: uuid() });
  }

  localDelete(pos) {
    return this._applyLocal({ type: 'delete', pos, clientId: this.clientId, opId: uuid() });
  }

  _applyLocal(op) {
    // Apply optimistically to local doc
    this.doc = applyOp(this.doc, op);

    if (!this.inFlight) {
      // Send immediately
      const toSend = { ...op, rev: this.serverRev };
      this.inFlight = toSend;
      this.sendOp(toSend);
    } else {
      // Buffer until ACK
      this.buffer.push(op);
    }

    return this.doc;
  }

  // ─── Server ACKed our inFlight op ─────────────────────────────────────────
  handleAck(revision) {
    this.serverRev = revision;
    this.inFlight  = null;

    if (this.buffer.length > 0) {
      // Send next buffered op
      const next    = this.buffer.shift();
      const toSend  = { ...next, rev: this.serverRev };
      this.inFlight = toSend;
      this.sendOp(toSend);
    }
  }

  // ─── Remote op received from server (another client's op, server-transformed)
  handleRemoteOp(remoteOp) {
    // Transform remoteOp against our inFlight, then our buffer
    let op = { ...remoteOp };

    if (this.inFlight) {
      // We need to transform in both directions:
      // - op against inFlight (so op lands correctly on our local doc)
      // - inFlight against op (so inFlight is still correct when server gets it)
      const transformedOp       = transform(op, this.inFlight);
      const transformedInFlight = transform(this.inFlight, op);
      this.inFlight = { ...transformedInFlight, rev: this.inFlight.rev };
      op = transformedOp;
    }

    // Transform against each buffered op
    const newBuffer = [];
    for (const buffered of this.buffer) {
      const transformedOp      = transform(op, buffered);
      const transformedBuffered = transform(buffered, op);
      newBuffer.push(transformedBuffered);
      op = transformedOp;
    }
    this.buffer = newBuffer;

    // Apply the fully-transformed remote op to our local doc
    if (op.type !== 'noop') {
      this.doc = applyOp(this.doc, op);
    }

    this.serverRev = remoteOp.rev ?? this.serverRev;
    return { op, doc: this.doc };
  }

  // ─── Build offline sync payload for reconnect ──────────────────────────────
  getOfflineQueue() {
    const ops = [];
    if (this.inFlight) ops.push(this.inFlight);
    ops.push(...this.buffer);
    return { fromRev: this.serverRev, ops };
  }
}
