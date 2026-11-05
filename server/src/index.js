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
import path     from 'path';
import { fileURLToPath } from 'url';
import fs       from 'fs';
import express  from 'express';
import cors     from 'cors';
import authRouter from './routes/auth.js';
import docsRouter from './routes/docs.js';
import { createWsServer } from './ws/server.js';

// Initialize database tables on startup
import { runMigrations } from './db/db.js';
await runMigrations();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../dist'),
  path.resolve(process.cwd(), 'dist'),
];
const clientDistPath = candidatePaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

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

// ── Static Frontend Serving & Single Page App Fallback ────────────────────────
if (clientDistPath && fs.existsSync(clientDistPath)) {
  console.log(`[server] Serving static frontend from ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA fallback: any non-API GET route serves client/dist/index.html
  app.get('*', (req, res, next) => {
    // Let API routes pass through if they are not requesting HTML
    if (
      req.path === '/health' ||
      (req.path.startsWith('/docs') && !req.accepts('html'))
    ) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      name: 'DocMind API & Collaboration Server',
      status: 'online',
      message: 'Backend server is running. Build the frontend to view the UI directly on this domain.',
      health: '/health',
      docs: '/docs',
    });
  });
}

// ── HTTP + WebSocket server ───────────────────────────────────────────────────
// We attach the WebSocket server to the same http.Server instance so that
// both HTTP and WS share port 3001. The ws library handles the Upgrade header.
const httpServer = http.createServer(app);
createWsServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] HTTP + WS listening on http://localhost:${PORT}`);
});
