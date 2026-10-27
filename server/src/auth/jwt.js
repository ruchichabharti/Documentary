/**
 * auth/jwt.js — JWT issuance and verification
 *
 * We use HS256 (HMAC-SHA256) — a symmetric algorithm.
 * The same secret signs and verifies tokens.
 *
 * Trade-off vs RS256 (asymmetric):
 *   HS256: simpler, single secret, fine for single-server deployments
 *   RS256: public key can be shared with other services to verify tokens
 *          without exposing the private key — better for microservices
 *
 * For this portfolio project, HS256 is the right choice.
 * In an interview, mention that RS256 would be the upgrade path for
 * a multi-service architecture.
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET  = process.env.JWT_SECRET ?? 'dev_secret_change_me';
const JWT_EXPIRES = '7d'; // 7 days — stateless, no refresh tokens in v1

/**
 * Issue a JWT for an authenticated user.
 * Payload:
 *   sub   — user ID (UUID)
 *   email — user's email (handy for display without a DB lookup)
 */
export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/**
 * Verify a JWT and return its decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Express middleware: extract Bearer token from Authorization header,
 * verify it, and attach the decoded payload to req.user.
 *
 * Usage: router.get('/protected', authMiddleware, handler)
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
