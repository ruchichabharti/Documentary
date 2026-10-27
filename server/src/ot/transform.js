/**
 * ot/transform.js — Operational Transformation engine (from first principles)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BACKGROUND: Why OT?
 * ─────────────────────────────────────────────────────────────────────────────
 * When two clients edit a shared document simultaneously, their operations are
 * composed against *different* document states. If we naively apply both, the
 * final document differs between clients — divergence.
 *
 * OT solves this by *transforming* a concurrent operation so it remains
 * semantically correct when applied to a state it wasn't originally composed
 * against.
 *
 * Example:
 *   Doc: "ac"   (rev 0)
 *   Client A:   insert 'b' at pos 1  → "abc"   (composed against rev 0)
 *   Client B:   insert 'X' at pos 1  → "aXc"   (composed against rev 0)
 *
 *   Server receives A first (rev 0 → 1: "abc"), then receives B (still at rev 0).
 *   B's op must be transformed against A's op before applying to rev 1:
 *     transform(B, A) → insert 'X' at pos 2  (because A shifted everything right)
 *   Result: "abXc"  ✓  (both clients converge to "abXc")
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHORITY MODEL (Jupiter / single-server)
 * ─────────────────────────────────────────────────────────────────────────────
 * The server is the single authority for revision numbers.
 * Every op carries the revision it was *composed against* (op.rev).
 * If the server is at revision R and receives op at rev r < R, it transforms
 * op against every accepted op from r+1 to R.
 *
 * This avoids the complexity of peer-to-peer OT (which requires n² transforms
 * and a convergence proof for every pair).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OPERATION SCHEMA
 * ─────────────────────────────────────────────────────────────────────────────
 *   { type: 'insert', pos: number, char: string, rev: number, clientId: string }
 *   { type: 'delete', pos: number,               rev: number, clientId: string }
 *   { type: 'noop'  }   — produced by delete/delete conflict (already deleted)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core transform function: transform op1 against op2
//
// "op1 was composed against the same state as op2, but op2 has already been
//  applied. Return op1' such that applying op1' after op2 gives the same
//  result as applying op1 and op2 in the other order."
// ─────────────────────────────────────────────────────────────────────────────
export function transform(op1, op2) {
  // Noops pass through unchanged
  if (op1.type === 'noop' || op2.type === 'noop') return op1;

  if (op1.type === 'insert' && op2.type === 'insert') {
    return transformInsertInsert(op1, op2);
  }
  if (op1.type === 'insert' && op2.type === 'delete') {
    return transformInsertDelete(op1, op2);
  }
  if (op1.type === 'delete' && op2.type === 'insert') {
    return transformDeleteInsert(op1, op2);
  }
  if (op1.type === 'delete' && op2.type === 'delete') {
    return transformDeleteDelete(op1, op2);
  }

  throw new Error(`Unknown op types: ${op1.type} / ${op2.type}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// INSERT vs INSERT
//
// op2 has inserted a character somewhere. Where does op1's insertion land?
//
// Case 1: op2.pos < op1.pos
//   op2 inserted before our target position — everything to the right shifted
//   by 1. We must move op1's position right by 1.
//     "ab"  op2=ins('X',0) → "Xab"   op1=ins('Y',1) → must become ins('Y',2)
//
// Case 2: op2.pos > op1.pos
//   op2 inserted after our target — our position is unaffected.
//     "ab"  op2=ins('X',2) → "abX"   op1=ins('Y',1) stays ins('Y',1)
//
// Case 3: op2.pos === op1.pos  (CONFLICT — same position!)
//   Both want to insert at the same spot. We need a deterministic tie-break
//   so *both* clients produce the same final order.
//   Tie-break rule: the client with the *lower* clientId (lexicographic) wins
//   the earlier position. The other client shifts right.
//
//   Why this tie-break? It's arbitrary but must be *symmetric* — the same
//   rule on both clients produces the same result. Using clientId is stable
//   across reconnects (unlike timestamp which can skew).
// ─────────────────────────────────────────────────────────────────────────────
function transformInsertInsert(op1, op2) {
  if (op2.pos < op1.pos) {
    // op2 inserted before us — shift our position right
    return { ...op1, pos: op1.pos + 1 };
  }

  if (op2.pos > op1.pos) {
    // op2 inserted after us — no change
    return { ...op1 };
  }

  // op2.pos === op1.pos: tie-break by clientId
  // If op2's client "wins" (sorts first), op2 occupies our slot — shift right
  if (op2.clientId < op1.clientId) {
    return { ...op1, pos: op1.pos + 1 };
  }

  // op1's client wins or same client (shouldn't happen in practice)
  return { ...op1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// INSERT vs DELETE
//
// op2 deleted a character. How does that affect op1's insert position?
//
// Case 1: op2.pos < op1.pos
//   op2 deleted something before us — everything shifted left by 1.
//   We move op1's position left by 1.
//     "abc"  op2=del(0) → "bc"   op1=ins('X',2) → must become ins('X',1)
//
// Case 2: op2.pos >= op1.pos
//   op2 deleted at or after our target — our position is unaffected.
// ─────────────────────────────────────────────────────────────────────────────
function transformInsertDelete(op1, op2) {
  if (op2.pos < op1.pos) {
    return { ...op1, pos: op1.pos - 1 };
  }
  return { ...op1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE vs INSERT
//
// op2 inserted a character. How does that affect op1's delete position?
//
// Case 1: op2.pos <= op1.pos
//   op2 inserted at or before our target — everything shifted right by 1.
//   We move op1's position right by 1.
//     "ab"  op2=ins('X',0) → "Xab"   op1=del(1) → must become del(2)
//
// Case 2: op2.pos > op1.pos
//   op2 inserted after our target — no change.
// ─────────────────────────────────────────────────────────────────────────────
function transformDeleteInsert(op1, op2) {
  if (op2.pos <= op1.pos) {
    return { ...op1, pos: op1.pos + 1 };
  }
  return { ...op1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE vs DELETE
//
// op2 deleted a character. How does that affect op1's delete position?
//
// Case 1: op2.pos < op1.pos
//   op2 deleted something before us — everything shifted left by 1.
//   We move op1's position left by 1.
//     "abc"  op2=del(0) → "bc"   op1=del(2) → must become del(1)
//
// Case 2: op2.pos > op1.pos
//   op2 deleted something after us — no change.
//
// Case 3: op2.pos === op1.pos  (CONFLICT — same character!)
//   Both clients tried to delete the same character.
//   op2 already deleted it (it's already been applied to the server).
//   op1's deletion is now a no-op: the character no longer exists.
//   We return { type: 'noop' } — applying a noop has no effect on the doc.
// ─────────────────────────────────────────────────────────────────────────────
function transformDeleteDelete(op1, op2) {
  if (op2.pos < op1.pos) {
    return { ...op1, pos: op1.pos - 1 };
  }

  if (op2.pos > op1.pos) {
    return { ...op1 };
  }

  // Same position — already deleted by op2
  return { type: 'noop' };
}

// ─────────────────────────────────────────────────────────────────────────────
// applyOp — apply a single operation to a document string
//
// This runs on both the server (before persisting) and on each client
// (when receiving a remote op). Both sides run identical logic → convergence.
// ─────────────────────────────────────────────────────────────────────────────
export function applyOp(doc, op) {
  if (op.type === 'noop') return doc;

  if (op.type === 'insert') {
    // Guard against out-of-bounds (shouldn't happen after correct transform)
    if (op.pos < 0 || op.pos > doc.length) {
      console.warn('[OT] insert pos out of bounds, clamping', op);
      op = { ...op, pos: Math.max(0, Math.min(op.pos, doc.length)) };
    }
    return doc.slice(0, op.pos) + op.char + doc.slice(op.pos);
  }

  if (op.type === 'delete') {
    if (op.pos < 0 || op.pos >= doc.length) {
      console.warn('[OT] delete pos out of bounds, treating as noop', op);
      return doc;
    }
    return doc.slice(0, op.pos) + doc.slice(op.pos + 1);
  }

  throw new Error(`Unknown op type: ${op.type}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// transformAgainstMany — convenience: transform op against an array of ops
//
// Used by the server when an incoming op is behind by multiple revisions:
//   for each op in serverOps[client_rev .. current_rev]:
//     incoming_op = transform(incoming_op, server_op)
// ─────────────────────────────────────────────────────────────────────────────
export function transformAgainstMany(op, serverOps) {
  let result = op;
  for (const serverOp of serverOps) {
    result = transform(result, serverOp);
  }
  return result;
}
