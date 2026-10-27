/**
 * db/queries.js — All database queries using @libsql/client (async)
 *
 * @libsql/client uses a promise-based API similar to pg.
 * Each execute() call returns { rows: [...], columns: [...] }.
 *
 * We use named parameters (:name) for readability.
 */

import { db }  from './db.js';
import { v4 as uuid } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// User queries
// ─────────────────────────────────────────────────────────────────────────────

export async function createUser(email, hashedPassword) {
  const id = uuid();
  await db.execute({
    sql: `INSERT INTO users (id, email, password) VALUES (?, ?, ?)`,
    args: [id, email, hashedPassword],
  });
  return { id, email };
}

export async function getUserByEmail(email) {
  const res = await db.execute({
    sql: `SELECT * FROM users WHERE email = ?`,
    args: [email],
  });
  return res.rows[0] ?? null;
}

export async function getUserById(id) {
  const res = await db.execute({
    sql: `SELECT id, email, created_at FROM users WHERE id = ?`,
    args: [id],
  });
  return res.rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document queries
// ─────────────────────────────────────────────────────────────────────────────

export async function createDocument(ownerId, title = 'Untitled') {
  const id = uuid();
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, email, password) VALUES (?, ?, 'no-password')`,
    args: [ownerId, `${ownerId}@docmind.local`],
  });
  await db.execute({
    sql: `INSERT INTO documents (id, owner_id, title, content, revision, snapshot_revision)
          VALUES (?, ?, ?, '', 0, 0)`,
    args: [id, ownerId, title],
  });
  // Owner gets 'owner' role automatically
  await db.execute({
    sql: `INSERT OR IGNORE INTO document_access (doc_id, user_id, role) VALUES (?, ?, 'owner')`,
    args: [id, ownerId],
  });
  return getDocument(id);
}

export async function getDocument(docId) {
  const res = await db.execute({
    sql: `SELECT * FROM documents WHERE id = ?`,
    args: [docId],
  });
  return res.rows[0] ?? null;
}

export async function getOrCreateDocument(docId, ownerId = 'default-owner', title = 'Collaborative Document') {
  let doc = await getDocument(docId);
  if (!doc) {
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO users (id, email, password) VALUES (?, ?, 'no-password')`,
        args: [ownerId, `${ownerId}@docmind.local`],
      });
      await db.execute({
        sql: `INSERT OR IGNORE INTO documents (id, owner_id, title, content, revision, snapshot_revision)
              VALUES (?, ?, ?, '', 0, 0)`,
        args: [docId, ownerId, title],
      });
      doc = await getDocument(docId);
    } catch (err) {
      console.error('[DB] getOrCreateDocument insert error:', err);
    }
  }
  return doc || { id: docId, owner_id: ownerId, title, content: '', revision: 0, snapshot_revision: 0 };
}

export async function getDocumentsByOwner(ownerId) {
  const res = await db.execute({
    sql: `SELECT id, title, revision, updated_at FROM documents WHERE owner_id = ? ORDER BY updated_at DESC`,
    args: [ownerId],
  });
  return res.rows;
}

export async function updateDocumentContent(docId, content, newRevision, snapshotRevision) {
  await db.execute({
    sql: `UPDATE documents
          SET content = ?, revision = ?, snapshot_revision = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [content, newRevision, snapshotRevision, docId],
  });
}

export async function updateDocumentTitle(docId, title) {
  await db.execute({
    sql: `UPDATE documents SET title = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [title, docId],
  });
}

export async function deleteDocument(docId, ownerId) {
  const res = await db.execute({
    sql: `DELETE FROM documents WHERE id = ? AND owner_id = ?`,
    args: [docId, ownerId],
  });
  return (res.rowsAffected ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Operation queries
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOperation({ docId, clientId, type, pos, char, revision }) {
  await db.execute({
    sql: `INSERT INTO operations (doc_id, client_id, type, pos, char, revision)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [docId, clientId, type, pos, char ?? null, revision],
  });
}

/**
 * Get all operations after a given revision (for OT transform and offline merge).
 * Returns ops in ascending revision order.
 */
export async function getOpsSinceRevision(docId, sinceRevision) {
  const res = await db.execute({
    sql: `SELECT type, pos, char, client_id as clientId, revision
          FROM operations
          WHERE doc_id = ? AND revision > ?
          ORDER BY revision ASC`,
    args: [docId, sinceRevision],
  });
  return res.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Access control
// ─────────────────────────────────────────────────────────────────────────────

export async function hasAccess(docId, userId) {
  const res = await db.execute({
    sql: `SELECT role FROM document_access WHERE doc_id = ? AND user_id = ?`,
    args: [docId, userId],
  });
  return res.rows[0] ?? null;
}

export async function grantAccess(docId, userId, role = 'editor') {
  await db.execute({
    sql: `INSERT OR IGNORE INTO document_access (doc_id, user_id, role) VALUES (?, ?, ?)`,
    args: [docId, userId, role],
  });
}
