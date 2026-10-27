/**
 * index.js — Server entry point
 *
 * Bootstraps Express + WebSocket server on the same HTTP server handle.
 * This avoids CORS issues: both HTTP and WS traffic go to the same port.
 *
 *   http://localhost:3001/auth/*   — auth routes
 *   http://localhost:3001/docs/*   — document CRUD
 *   ws://localhost:3001?docId=...&token=... — WebSocket collaboration
 */

import 'dotenv/config';
import http     from 'http';
import express  from 'express';
import cors     from 'cors';
import authRouter from './routes/auth.js';
import docsRouter from './routes/docs.js';
import { createWsServer } from './ws/server.js';

// Initialize database tables on startup
import { runMigrations } from './db/db.js';
await runMigrations();

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/docs', docsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── HTTP + WebSocket server ───────────────────────────────────────────────────
// We attach the WebSocket server to the same http.Server instance so that
// both HTTP and WS share port 3001. The ws library handles the Upgrade header.
const httpServer = http.createServer(app);
createWsServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] HTTP + WS listening on http://localhost:${PORT}`);
});
