import { Request, Response, NextFunction } from 'express';

export type AuthenticatedUser = { email: string | null; sub?: string | null; displayName?: string | null };

function decodeOidcPayload(token: string): AuthenticatedUser | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return { email: decoded.email || null, sub: decoded.sub || null, displayName: decoded['cognito:username'] || null };
  } catch {
    return null;
  }
}

function resolveDevUser(req: Request): AuthenticatedUser | null {
  const header = req.headers['x-dev-email'];
  const queryEmail = typeof req.query.devEmail === 'string' ? req.query.devEmail : null;
  const value =
    (typeof header === 'string' && header) ||
    (Array.isArray(header) ? header[0] : null) ||
    queryEmail ||
    process.env.DEV_BYPASS_EMAIL ||
    null;
  if (!value) return null;
  return { email: value, sub: 'dev', displayName: value.split('@')[0] };
}

export function extractUser(req: Request): AuthenticatedUser | null {
  const oidcHeader = req.headers['x-amzn-oidc-data'];
  if (typeof oidcHeader === 'string') {
    const user = decodeOidcPayload(oidcHeader);
    if (user) return user;
  }
  return resolveDevUser(req);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = extractUser(req);
  if (!user?.email) {
    return res.status(401).json({ error: 'Authentication required. Provide AWS ALB OIDC headers or x-dev-email.' });
  }
  req.user = user;
  next();
}
