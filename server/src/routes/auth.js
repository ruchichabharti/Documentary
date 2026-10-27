/**
 * routes/auth.js — Signup and Login endpoints
 *
 * POST /auth/signup  { email, password } → { token, user }
 * POST /auth/login   { email, password } → { token, user }
 */

import { Router }    from 'express';
import bcrypt        from 'bcryptjs';
import { signToken } from '../auth/jwt.js';
import { createUser, getUserByEmail } from '../db/queries.js';

const router = Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await getUserByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    // bcrypt cost 12 ≈ 250-400ms — strong against brute-force, acceptable UX
    const hash = await bcrypt.hash(password, 12);
    const user  = await createUser(email.toLowerCase(), hash);
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[signup]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await getUserByEmail(email.toLowerCase());
    // Use same message for wrong email and wrong password — prevents user enumeration
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
