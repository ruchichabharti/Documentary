/**
 * lib/transform.js — Client-side copy of the OT transform functions
 *
 * This is intentionally identical to server/src/ot/transform.js.
 * Both sides run the same transform rules — that's the invariant that
 * guarantees convergence. Any divergence = bug in the transform logic.
 */

export function transform(op1, op2) {
  if (op1.type === 'noop' || op2.type === 'noop') return op1;
  if (op1.type === 'insert' && op2.type === 'insert') return transformInsertInsert(op1, op2);
  if (op1.type === 'insert' && op2.type === 'delete') return transformInsertDelete(op1, op2);
  if (op1.type === 'delete' && op2.type === 'insert') return transformDeleteInsert(op1, op2);
  if (op1.type === 'delete' && op2.type === 'delete') return transformDeleteDelete(op1, op2);
  throw new Error(`Unknown op types: ${op1.type} / ${op2.type}`);
}

function transformInsertInsert(op1, op2) {
  if (op2.pos < op1.pos) return { ...op1, pos: op1.pos + 1 };
  if (op2.pos > op1.pos) return { ...op1 };
  // Same position — tie-break by clientId
  return op2.clientId < op1.clientId ? { ...op1, pos: op1.pos + 1 } : { ...op1 };
}

function transformInsertDelete(op1, op2) {
  return op2.pos < op1.pos ? { ...op1, pos: op1.pos - 1 } : { ...op1 };
}

function transformDeleteInsert(op1, op2) {
  return op2.pos <= op1.pos ? { ...op1, pos: op1.pos + 1 } : { ...op1 };
}

function transformDeleteDelete(op1, op2) {
  if (op2.pos < op1.pos) return { ...op1, pos: op1.pos - 1 };
  if (op2.pos > op1.pos) return { ...op1 };
  return { type: 'noop' }; // same position — already deleted
}

export function applyOp(doc, op) {
  if (op.type === 'noop') return doc;
  if (op.type === 'insert') {
    const pos = Math.max(0, Math.min(op.pos, doc.length));
    return doc.slice(0, pos) + op.char + doc.slice(pos);
  }
  if (op.type === 'delete') {
    if (op.pos < 0 || op.pos >= doc.length) return doc;
    return doc.slice(0, op.pos) + doc.slice(op.pos + 1);
  }
  return doc;
}
