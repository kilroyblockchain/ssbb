import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export type AuthenticatedUser = { email: string | null; sub?: string | null; displayName?: string | null };

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_1gLLbw4HH';
const CLIENT_ID    = process.env.COGNITO_CLIENT_ID    || '6nl7u3h2bhv1vtqs6n3upstuqi';

const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'id',
  clientId: CLIENT_ID,
});

async function verifyBearerToken(authHeader: string): Promise<AuthenticatedUser | null> {
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const payload = await verifier.verify(token);
    return {
      email: (payload.email as string) || null,
      sub: payload.sub || null,
      displayName: (payload['cognito:username'] as string) || null,
    };
  } catch {
    return null;
  }
}

function resolveDevUser(req: Request): AuthenticatedUser | null {
  if (process.env.NODE_ENV === 'production') return null;
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

export async function extractUser(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string') {
    const user = await verifyBearerToken(authHeader);
    if (user) return user;
  }
  return resolveDevUser(req);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await extractUser(req);
  if (!user?.email) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  req.user = user;
  next();
}
