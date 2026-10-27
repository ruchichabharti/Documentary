-- ============================================================
--  collab-editor database schema
--  Using SQLite syntax (compatible with PostgreSQL with minor
--  changes: swap TEXT pk for UUID, use gen_random_uuid(), etc.)
-- ============================================================

-- Enable WAL mode for concurrent reads while writing
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------
-- Users
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,          -- UUID v4, generated in JS
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,             -- bcrypt hash (cost 12)
  created_at TEXT DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------
-- Documents
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,         -- UUID v4
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled',
  -- Latest snapshot of the full document text.
  -- Updated every SNAPSHOT_INTERVAL ops (see server/src/ot/server.js).
  -- On load we fetch this + all ops since snapshot_revision.
  content     TEXT NOT NULL DEFAULT '',
  revision    INTEGER NOT NULL DEFAULT 0,
  -- The revision at which content was last snapshotted.
  -- ops with revision > snapshot_revision need to be replayed.
  snapshot_revision INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------
-- Operation log
-- ----------------------------------------------------------
-- Every accepted (server-transformed) operation is stored here.
-- This gives us:
--   1. Full audit history
--   2. Source for offline-reconnect merge: replay ops since a client's
--      last known revision
--   3. Material for snapshotting: we replay ops[snapshot_revision..N]
--      to rebuild content after a crash
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS operations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id     TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  client_id  TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('insert','delete','noop')),
  pos        INTEGER NOT NULL,
  char       TEXT,                      -- NULL for delete / noop
  revision   INTEGER NOT NULL,          -- server revision AFTER this op
  created_at TEXT DEFAULT (datetime('now'))
);

-- Fetch ops since a given revision quickly
CREATE INDEX IF NOT EXISTS idx_ops_doc_rev ON operations(doc_id, revision);

-- ----------------------------------------------------------
-- Document access (who can edit which doc)
-- ----------------------------------------------------------
-- Simple ACL: owner always has access; additional collaborators
-- can be invited (future feature — table scaffolded now).
CREATE TABLE IF NOT EXISTS document_access (
  doc_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role    TEXT NOT NULL DEFAULT 'editor' CHECK(role IN ('owner','editor','viewer')),
  PRIMARY KEY (doc_id, user_id)
);
