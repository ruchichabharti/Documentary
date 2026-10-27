/**
 * db/db.js — libsql client (pure-JS SQLite, no native build required)
 *
 * @libsql/client wraps SQLite in WebAssembly — no C++ compilation needed.
 * It uses the same SQL dialect as SQLite, and its cloud variant (Turso)
 * is a drop-in upgrade path to a hosted DB without changing any queries.
 *
 * The API is async (unlike better-sqlite3's sync API), so all DB callers
 * use await. This is closer to what you'd write with pg anyway.
 */

import { createClient } from '@libsql/client';
import { readFileSync }  from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = process.env.DB_PATH ?? 'file:collab.db';

// Use 'file:' prefix for local SQLite file
const url = DB_PATH.startsWith('file:') ? DB_PATH : `file:${DB_PATH}`;

export const db = createClient({ url });

// Run schema migrations once on startup
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

// Split schema into individual statements (libsql executeMultiple)
export async function runMigrations() {
  await db.executeMultiple(schema);
  console.log('[db] libsql connected and migrations applied:', url);
}
