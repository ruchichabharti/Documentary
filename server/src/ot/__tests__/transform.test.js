/**
 * transform.test.js — OT convergence and correctness tests
 *
 * These tests are the specification for the OT algorithm.
 * If these pass, the algorithm is correct — divergence is impossible
 * as long as every client follows the same transform rules.
 *
 * Run with: npm test  (from /server)
 */

// Jest doesn't support ESM by default — use require-style import shim
import { transform, applyOp, transformAgainstMany } from '../transform.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: simulate the server receiving two concurrent ops and applying OT.
// Returns the final doc state from both clients' perspectives.
// ─────────────────────────────────────────────────────────────────────────────
function simulateConcurrentEdits(initialDoc, opA, opB) {
  // Server receives opA first, applies it
  const docAfterA = applyOp(initialDoc, opA);

  // Server transforms opB against opA, then applies
  const opB_prime = transform(opB, opA);
  const docAfterAB = applyOp(docAfterA, opB_prime);

  // Client B's perspective: it already applied opB locally,
  // then receives opA which must be transformed against opB
  const opA_prime = transform(opA, opB);
  const docAfterBA = applyOp(applyOp(initialDoc, opB), opA_prime);

  return { serverFinal: docAfterAB, clientB_final: docAfterBA };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERGENCE TESTS
// The golden rule: both clients must arrive at the SAME final document.
// ─────────────────────────────────────────────────────────────────────────────

describe('OT Convergence — Insert vs Insert', () => {
  test('same position: converges with deterministic tie-break', () => {
    const doc = 'ab';
    // Both insert at pos 1 simultaneously
    const opA = { type: 'insert', pos: 1, char: 'X', rev: 0, clientId: 'alice' };
    const opB = { type: 'insert', pos: 1, char: 'Y', rev: 0, clientId: 'bob' };

    const { serverFinal, clientB_final } = simulateConcurrentEdits(doc, opA, opB);

    // Both must converge to the same string
    expect(serverFinal).toBe(clientB_final);

    // alice < bob lexicographically → alice wins position 1, bob shifts to 2
    // Server order: opA applied first → 'aXb', then opB' (pos 2) → 'aXYb'
    expect(serverFinal).toBe('aXYb');
  });

  test('different positions: both converge without interference', () => {
    const doc = 'ac';
    const opA = { type: 'insert', pos: 0, char: 'Z', rev: 0, clientId: 'alice' };
    const opB = { type: 'insert', pos: 1, char: 'b', rev: 0, clientId: 'bob' };

    const { serverFinal, clientB_final } = simulateConcurrentEdits(doc, opA, opB);
    expect(serverFinal).toBe(clientB_final);
    expect(serverFinal).toBe('Zabc'); // Z at 0, b at 2 after shift
  });

  test('insert after another insert: position shifts correctly', () => {
    const doc = 'hello';
    const opA = { type: 'insert', pos: 0, char: '!', rev: 0, clientId: 'alice' };
    const opB = { type: 'insert', pos: 3, char: '-', rev: 0, clientId: 'bob' };

    const { serverFinal, clientB_final } = simulateConcurrentEdits(doc, opA, opB);
    expect(serverFinal).toBe(clientB_final);
    expect(serverFinal).toBe('!hel-lo');
  });
});

describe('OT Convergence — Delete vs Delete', () => {
  test('same position: second delete becomes noop', () => {
    const doc = 'abc';
    const opA = { type: 'delete', pos: 1, rev: 0, clientId: 'alice' };
    const opB = { type: 'delete', pos: 1, rev: 0, clientId: 'bob' };

    const { serverFinal, clientB_final } = simulateConcurrentEdits(doc, opA, opB);
    expect(serverFinal).toBe(clientB_final);
    expect(serverFinal).toBe('ac'); // 'b' deleted once, not twice
  });

  test('different positions: both characters deleted', () => {
    const doc = 'abcd';
    const opA = { type: 'delete', pos: 0, rev: 0, clientId: 'alice' }; // delete 'a'
    const opB = { type: 'delete', pos: 2, rev: 0, clientId: 'bob' };   // delete 'c'

    const { serverFinal, clientB_final } = simulateConcurrentEdits(doc, opA, opB);
    expect(serverFinal).toBe(clientB_final);
    expect(serverFinal).toBe('bd');
  });

  test('adjacent deletes converge', () => {
    const doc = 'hello';
    const opA = { type: 'delete', pos: 1, rev: 0, clientId: 'alice' }; // delete 'e'
    const opB = { type: 'delete', pos: 2, rev: 0, clientId: 'bob' };   // delete 'l'

    const { serverFinal, clientB_final } = simulateConcurrentEdits(doc, opA, opB);
    expect(serverFinal).toBe(clientB_final);
    expect(serverFinal).toBe('hlo');
  });
});

describe('OT Convergence — Insert vs Delete', () => {
  test('insert before deleted position: position shifts left', () => {
    const doc = 'abc';
    const opA = { type: 'delete', pos: 0, rev: 0, clientId: 'alice' }; // delete 'a'
    const opB = { type: 'insert', pos: 2, char: 'X', rev: 0, clientId: 'bob' };

    const { serverFinal, clientB_final } = simulateConcurrentEdits(doc, opA, opB);
    expect(serverFinal).toBe(clientB_final);
    expect(serverFinal).toBe('bXc');
  });

  test('delete before insert position: insert shifts left', () => {
    const doc = 'abc';
    const opA = { type: 'insert', pos: 2, char: 'X', rev: 0, clientId: 'alice' };
    const opB = { type: 'delete', pos: 0, rev: 0, clientId: 'bob' };

    const { serverFinal, clientB_final } = simulateConcurrentEdits(doc, opA, opB);
    expect(serverFinal).toBe(clientB_final);
    expect(serverFinal).toBe('bXc');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-OP SEQUENCE TESTS
// Simulates a client being multiple revisions behind (offline scenario)
// ─────────────────────────────────────────────────────────────────────────────

describe('transformAgainstMany — offline reconnect scenario', () => {
  test('client op transforms correctly against 3 server ops', () => {
    // Server has applied 3 ops while client was offline
    const serverOps = [
      { type: 'insert', pos: 0, char: 'A', clientId: 'server' },
      { type: 'insert', pos: 1, char: 'B', clientId: 'server' },
      { type: 'delete', pos: 0,             clientId: 'server' }, // removes 'A'
    ];

    // Client's buffered op: insert 'Z' at pos 0 (client was at rev 0)
    const clientOp = { type: 'insert', pos: 0, char: 'Z', clientId: 'client' };

    // Server doc after serverOps: "" → "A" → "AB" → "B"
    const serverDoc = serverOps.reduce(applyOp, '');
    expect(serverDoc).toBe('B');

    // Transform client op against server ops
    const transformed = transformAgainstMany(clientOp, serverOps);

    const finalDoc = applyOp(serverDoc, transformed);
    expect(finalDoc).toBe('ZB');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — individual transform cases
// ─────────────────────────────────────────────────────────────────────────────

describe('transform() unit tests', () => {
  test('noop passes through unchanged', () => {
    const op = { type: 'noop' };
    expect(transform(op, { type: 'insert', pos: 0, char: 'x', clientId: 'a' })).toEqual({ type: 'noop' });
  });

  test('insert/insert: pos before → shift right', () => {
    const op1 = { type: 'insert', pos: 3, char: 'A', clientId: 'b' };
    const op2 = { type: 'insert', pos: 1, char: 'B', clientId: 'a' };
    expect(transform(op1, op2).pos).toBe(4);
  });

  test('insert/insert: pos after → no change', () => {
    const op1 = { type: 'insert', pos: 1, char: 'A', clientId: 'b' };
    const op2 = { type: 'insert', pos: 3, char: 'B', clientId: 'a' };
    expect(transform(op1, op2).pos).toBe(1);
  });

  test('delete/delete: same pos → noop', () => {
    const op1 = { type: 'delete', pos: 2, clientId: 'b' };
    const op2 = { type: 'delete', pos: 2, clientId: 'a' };
    expect(transform(op1, op2).type).toBe('noop');
  });

  test('applyOp insert: inserts char at correct position', () => {
    expect(applyOp('hello', { type: 'insert', pos: 5, char: '!' })).toBe('hello!');
    expect(applyOp('hello', { type: 'insert', pos: 0, char: '*' })).toBe('*hello');
  });

  test('applyOp delete: removes char at position', () => {
    expect(applyOp('hello', { type: 'delete', pos: 4 })).toBe('hell');
    expect(applyOp('hello', { type: 'delete', pos: 0 })).toBe('ello');
  });
});
