/**
 * routes/auth.js — Signup and Login endpoints
 *
 * POST /auth/signup  { email, password } → { token, user }
 * POST /auth/login   { email, password } → { token, user }
 */

import { Router }    from 'express';
import bcrypt        from 'bcryptjs';
import nodemailer    from 'nodemailer';
import { v4 as uuid } from 'uuid';
import { signToken } from '../auth/jwt.js';
import { createUser, getUserByEmail } from '../db/queries.js';

const router = Router();

// In-memory OTP store: Map<email, { code, expiresAt }>()
const otpStore = new Map();

// POST /auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanEmail, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_PASS || '').replace(/\s+/g, '');

    if (!smtpUser || !smtpPass) {
      console.warn('[server] SMTP_USER or SMTP_PASS not set in server/.env. Generated code:', code);
      return res.status(400).json({ error: 'Gmail credentials not configured in server/.env' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"DocMind AI" <${smtpUser}>`,
      to: cleanEmail,
      subject: `Your DocMind Verification Code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0;">DocMind Verification Code</h2>
          <p style="color: #475569; font-size: 15px;">Your 6-digit verification code to sign in is:</p>
          <div style="background: #f1f5f9; padding: 18px; border-radius: 12px; text-align: center; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #312e81;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log(`[server] Direct Gmail OTP sent to ${cleanEmail}`);
    res.json({ success: true, message: 'OTP sent to email successfully' });
  } catch (err) {
    console.error('[server] Error sending OTP email:', err);
    res.status(500).json({ error: err.message || 'Failed to send OTP email via Gmail' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const stored = otpStore.get(cleanEmail);

    if (!stored) {
      return res.status(400).json({ error: 'No OTP request found for this email or it has expired. Please request a new code.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
    }

    if (stored.code !== code.trim()) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
    }

    // OTP is valid! Consume it
    otpStore.delete(cleanEmail);

    // Find or create user in SQLite
    let user = await getUserByEmail(cleanEmail);
    if (!user) {
      const dummyHash = await bcrypt.hash(uuid(), 10);
      user = await createUser(cleanEmail, dummyHash);
    }

    const token = signToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[server] Error verifying OTP:', err);
    res.status(500).json({ error: 'Internal server error verifying OTP' });
  }
});

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
