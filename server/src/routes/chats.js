/**
 * routes/chats.js — Persistent AI Chat Conversations API
 *
 * GET    /api/chats            → List user's past chat threads (optional ?docId=...)
 * POST   /api/chats            → Save / update a chat thread (with messages, title, doc scope)
 * DELETE /api/chats/:id        → Delete a specific conversation thread
 * DELETE /api/chats            → Clear all conversation threads (optional ?docId=...)
 */

import { Router } from 'express';
import { verifyToken } from '../auth/jwt.js';
import {
  getChatThreads,
  saveChatThread,
  deleteChatThread,
  clearChatThreads,
} from '../db/queries.js';

const router = Router();

// Flexible auth extractor: prefers JWT Bearer, falls back gracefully to guest or body/query user
function extractUser(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = verifyToken(authHeader.slice(7));
      return {
        id: decoded.sub,
        email: (decoded.email || '').toLowerCase(),
      };
    } catch (_) { }
  }

  // Fallback to query/body or guest
  const customId = req.query.userId || req.body?.userId || 'guest_user';
  const customEmail = (req.query.userEmail || req.body?.userEmail || 'guest@docmind.local').toLowerCase();

  return {
    id: customId,
    email: customEmail,
  };
}

router.get('/', async (req, res) => {
  try {
    const user = extractUser(req);
    const { docId } = req.query;
    const threads = await getChatThreads(user.id, user.email, docId);
    res.json({ threads });
  } catch (err) {
    console.error('[chats GET error]:', err);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = extractUser(req);
    const { id, title, docId, docTitle, messages } = req.body;

    if (!id || !title) {
      return res.status(400).json({ error: 'id and title are required' });
    }

    const saved = await saveChatThread({
      id,
      userId: user.id,
      userEmail: user.email,
      title,
      docId: docId || 'all',
      docTitle: docTitle || 'All Documents',
      messages: messages || [],
    });

    res.json({ thread: saved });
  } catch (err) {
    console.error('[chats POST error]:', err);
    res.status(500).json({ error: 'Failed to save chat thread' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = extractUser(req);
    const success = await deleteChatThread(req.params.id, user.id, user.email);
    res.json({ success });
  } catch (err) {
    console.error('[chats DELETE error]:', err);
    res.status(500).json({ error: 'Failed to delete chat thread' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const user = extractUser(req);
    const { docId } = req.query;
    const success = await clearChatThreads(user.id, user.email, docId);
    res.json({ success });
  } catch (err) {
    console.error('[chats CLEAR error]:', err);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;

