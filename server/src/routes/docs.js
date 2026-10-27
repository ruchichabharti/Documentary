/**
 * routes/docs.js — Document CRUD endpoints (async)
 *
 * GET    /docs          → list user's documents
 * POST   /docs          → create new document
 * GET    /docs/:id      → get document
 * PATCH  /docs/:id      → update title
 * DELETE /docs/:id      → delete document
 */

import { Router } from 'express';
import { authMiddleware } from '../auth/jwt.js';
import {
  createDocument, getDocument, getDocumentsByOwner,
  updateDocumentTitle, deleteDocument, hasAccess,
} from '../db/queries.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const docs = await getDocumentsByOwner(req.user.sub);
    res.json({ documents: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await createDocument(req.user.sub, title ?? 'Untitled');
    res.status(201).json({ document: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await getDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const access = await hasAccess(doc.id, req.user.sub);
    if (!access) return res.status(403).json({ error: 'Forbidden' });
    res.json({ document: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const doc = await getDocument(req.params.id);
    if (!doc)   return res.status(404).json({ error: 'Document not found' });
    const access = await hasAccess(doc.id, req.user.sub);
    if (!access || access.role === 'viewer') return res.status(403).json({ error: 'Forbidden' });
    await updateDocumentTitle(doc.id, title);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteDocument(req.params.id, req.user.sub);
    if (!deleted) return res.status(404).json({ error: 'Document not found or not owner' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
