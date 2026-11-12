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
import { signToken, authMiddleware } from '../auth/jwt.js';
import { createUser, getUserByEmail, updateUserPassword } from '../db/queries.js';

const router = Router();

// In-memory OTP store: Map<email, { code, expiresAt }>()
const otpStore = new Map();

// POST /auth/send-otp (Sends real verification code to user's inbox over HTTPS or SMTP)
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log(`[server] Dispatching verification code to inbox for: ${cleanEmail}`);

    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ggndvjkruokzkkotskvr.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbmR2amtydW9remtrb3Rza3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTgyNjEsImV4cCI6MjEwODY3NDI2MX0.09IPqxIFHYkijEUbWYJinD_wZ4aAhdXN9oxxhiXgydM';

    // 1. Primary: Supabase HTTP Email Delivery (Runs over HTTPS port 443 — NEVER blocked by Render or cloud firewalls)
    try {
      const sbRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, create_user: true }),
      });

      if (sbRes.ok) {
        console.log(`[server] Real email verification code dispatched via Supabase to ${cleanEmail}`);
        return res.json({
          success: true,
          message: `Verification code sent to ${cleanEmail}! Please check your email inbox.`,
        });
      } else {
        const errData = await sbRes.json().catch(() => ({}));
        console.warn(`[server] Supabase OTP dispatch notice (${sbRes.status}):`, errData.msg || errData.error_description || 'trying SMTP');
      }
    } catch (sbErr) {
      console.warn('[server] Supabase OTP dispatch network error:', sbErr.message);
    }

    // 2. Secondary: Direct Gmail SMTP delivery
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || 'ruchichabharti07@gmail.com';
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_PASS || 'jfnordwxjouozesg').replace(/\s+/g, '');

    if (smtpUser && smtpPass) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(cleanEmail, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 5000,
        });

        await transporter.sendMail({
          from: `"DocMind AI" <${smtpUser}>`,
          to: cleanEmail,
          subject: `Your DocMind Verification Code: ${code}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
              <h2 style="color: #c2410c; margin-top: 0;">DocMind Verification Code</h2>
              <p style="color: #475569; font-size: 15px;">Your 6-digit verification code to complete your registration is:</p>
              <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 18px; border-radius: 12px; text-align: center; margin: 24px 0;">
                <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #9a3412;">${code}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
            </div>
          `,
        });

        console.log(`[server] Direct Gmail OTP sent to ${cleanEmail}`);
        return res.json({
          success: true,
          message: `Verification code sent to ${cleanEmail}! Please check your email inbox.`,
        });
      } catch (smtpErr) {
        console.error('[server] SMTP error:', smtpErr.message);
      }
    }

    return res.status(500).json({ error: 'Failed to dispatch verification email. Please check your email address.' });
  } catch (err) {
    console.error('[server] Error sending OTP:', err);
    res.status(500).json({ error: err.message || 'Failed to process verification code' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isVerified = false;

    // Check 1: In-memory store (SMTP)
    const stored = otpStore.get(cleanEmail);
    if (stored && stored.code === cleanCode && Date.now() <= stored.expiresAt) {
      isVerified = true;
      otpStore.delete(cleanEmail);
    }

    // Check 2: Supabase Auth HTTP verify API
    if (!isVerified) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ggndvjkruokzkkotskvr.supabase.co';
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbmR2amtydW9remtrb3Rza3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTgyNjEsImV4cCI6MjEwODY3NDI2MX0.09IPqxIFHYkijEUbWYJinD_wZ4aAhdXN9oxxhiXgydM';

      for (const vType of ['email', 'signup']) {
        try {
          const vRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: vType, email: cleanEmail, token: cleanCode }),
          });
          if (vRes.ok) {
            isVerified = true;
            break;
          }
        } catch (_) {}
      }
    }

    if (!isVerified) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
    }

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

// POST /auth/signup (For new users or verified password resets via OTP)
router.post('/signup', async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!otp) {
      return res.status(400).json({ error: 'Verification code (OTP) is required. Please check your email.' });
    }

    const cleanOtp = String(otp).trim();
    let isVerified = false;

    // Check 1: In-memory store (SMTP)
    const stored = otpStore.get(cleanEmail);
    if (stored && stored.code === cleanOtp && Date.now() <= stored.expiresAt) {
      isVerified = true;
      otpStore.delete(cleanEmail);
    }

    // Check 2: Supabase Auth HTTP verify API
    if (!isVerified) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ggndvjkruokzkkotskvr.supabase.co';
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbmR2amtydW9remtrb3Rza3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTgyNjEsImV4cCI6MjEwODY3NDI2MX0.09IPqxIFHYkijEUbWYJinD_wZ4aAhdXN9oxxhiXgydM';

      for (const vType of ['email', 'signup']) {
        try {
          const vRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: vType, email: cleanEmail, token: cleanOtp }),
          });
          if (vRes.ok) {
            isVerified = true;
            break;
          }
        } catch (_) {}
      }
    }

    if (!isVerified) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 12);
    let user = await getUserByEmail(cleanEmail);

    if (user) {
      // User already exists: update their password because they proved ownership via OTP!
      await updateUserPassword(cleanEmail, hash);
      console.log(`[server] Password updated for verified user ${cleanEmail}`);
    } else {
      user = await createUser(cleanEmail, hash);
      console.log(`[server] Created new verified user ${cleanEmail}`);
    }

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[signup]', err);
    res.status(500).json({ error: 'Internal server error processing registration' });
  }
});
    console.error('[signup]', err);
    res.status(500).json({ error: 'Internal server error processing registration' });
  }
});

// POST /auth/login (For existing users: requires only email and password)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please switch to Create Account.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = signToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Internal server error logging in' });
  }
});

// GET /auth/me (Verifies if token user still exists in database)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserByEmail(req.user.email);
    if (!user) {
      return res.status(401).json({ error: 'User does not exist in database' });
    }
    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

export default router;
