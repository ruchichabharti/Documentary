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

import dotenv   from 'dotenv';
import http     from 'http';
import path     from 'path';
import { fileURLToPath } from 'url';
import fs       from 'fs';
import express  from 'express';
import cors     from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded regardless of execution working directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../client/.env') });

import authRouter from './routes/auth.js';
import docsRouter from './routes/docs.js';
import chatsRouter from './routes/chats.js';
import { createWsServer } from './ws/server.js';

// Initialize database tables on startup
import { runMigrations } from './db/db.js';
await runMigrations();

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
app.use('/api/chats', chatsRouter);
app.use('/chats', chatsRouter);

app.post('/api/ai-summary', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    const models = ['gemini-3.5-flash', 'gemini-3.6-flash'];

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 8192,
              },
            }),
          }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          const nonThoughtText = parts
            .filter((p) => !p.thought && p.text)
            .map((p) => p.text)
            .join('');
          const text = nonThoughtText.trim().length > 0 
            ? nonThoughtText 
            : parts.map((p) => p.text || '').join('');

          if (text && text.trim().length > 0) {
            return res.json({ success: true, text });
          }
        }
      } catch (mErr) {
        console.warn(`[server ai-summary] ${model} error:`, mErr.message);
      }
    }

    res.status(502).json({ error: 'AI models temporarily unavailable' });
  } catch (err) {
    console.error('[server ai-summary error]:', err);
    res.status(500).json({ error: 'Internal server error during AI generation' });
  }
});

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
