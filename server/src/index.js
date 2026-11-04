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
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed: ' + origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
