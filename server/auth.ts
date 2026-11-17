import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialization: string;
  skills: string[];
}

interface DbUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  specialization: string;
  skills_json: string;
}

export interface AuthenticatedRequest extends Request {
  currentUser?: PublicUser;
}

const SESSION_COOKIE_NAME = 'novaworks_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function resolveSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret && envSecret !== 'CHANGE_ME_SESSION_SECRET') {
    return envSecret;
  }
  if (process.env.VERCEL) {
    const seed =
      process.env.GEMINI_API_KEY ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      'novaworks-vercel-default-session-seed';
    return createHash('sha256')
      .update(`novaworks-session:${seed}`)
      .digest('hex');
  }
  const secretPath = path.resolve(process.cwd(), 'data', '.session_secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    const generated = randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    return generated;
  } catch {
    return randomBytes(32).toString('hex');
  }
}

const SESSION_SECRET = resolveSessionSecret();

interface SessionPayload {
  userId: string;
  exp: number;
}

function signToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;

  const expectedSig = createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (!parsed?.userId || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

export function mapDbUserToPublic(row: DbUserRow): PublicUser {
  let skills: string[] = [];
  try {
    const parsed = JSON.parse(row.skills_json);
    if (Array.isArray(parsed)) {
      skills = parsed.map((s) => String(s));
    }
  } catch {
    skills = [];
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    specialization: row.specialization,
    skills,
  };
}

export function findUserByEmailWithHash(email: string): DbUserRow | undefined {
  const stmt = db.prepare(
    'SELECT id, name, email, password_hash, role, specialization, skills_json FROM users WHERE lower(email) = lower(?)'
  );
  return stmt.get(email.trim()) as unknown as DbUserRow | undefined;
}

export function findPublicUserById(userId: string): PublicUser | null {
  const stmt = db.prepare(
    'SELECT id, name, email, password_hash, role, specialization, skills_json FROM users WHERE id = ?'
  );
  const row = stmt.get(userId) as unknown as DbUserRow | undefined;
  return row ? mapDbUserToPublic(row) : null;
}

function buildCookieAttrs(req: Request, maxAgeSec: number): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const origin = String(req.headers.origin || '').toLowerCase();
  const host = String(req.headers.host || '').toLowerCase();
  const isHttps =
    req.secure ||
    forwardedProto === 'https' ||
    origin.startsWith('https://') ||
    host.endsWith('.run.app');
  const sameSitePart = isHttps
    ? 'SameSite=None; Secure; Partitioned'
    : 'SameSite=Lax';
  return `Path=/; HttpOnly; ${sameSitePart}; Max-Age=${maxAgeSec}`;
}

export function setSessionCookie(req: Request, res: Response, userId: string): string {
  const token = signToken({
    userId,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; ${buildCookieAttrs(req, maxAgeSec)}`
  );
  return token;
}

export function clearSessionCookie(req: Request, res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; ${buildCookieAttrs(req, 0)}`
  );
}

function extractSessionToken(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const raw = authHeader.slice(7).trim();
    if (raw) return raw;
  }
  return null;
}

export function getOptionalSessionUser(req: Request): PublicUser | null {
  const token = extractSessionToken(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return findPublicUserById(payload.userId);
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    clearSessionCookie(req, res);
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    return;
  }

  const user = findPublicUserById(payload.userId);
  if (!user) {
    clearSessionCookie(req, res);
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  req.currentUser = user;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.currentUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.currentUser.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}
