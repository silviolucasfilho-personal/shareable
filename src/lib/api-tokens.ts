import { createHash, randomBytes } from 'crypto';
import { getS3Engine } from './s3-client';

/**
 * Personal API tokens let CLI tools (e.g. the shareable-upload skill) act on
 * behalf of a signed-in user without browser cookies.
 *
 * Only the SHA-256 hash of a token is stored: `tokens/{sha256}.json`.
 * The plaintext token is shown to the user exactly once, at creation time.
 */

export const API_TOKEN_PREFIX = 'shr_';

export interface ApiTokenRecord {
  email: string;
  userId: string;
  createdAt: string;
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const tokenKey = (hash: string) => `tokens/${hash}.json`;
const userTokenKey = (userId: string) => `token-owners/${encodeURIComponent(userId)}.json`;

/**
 * Creates a new token for the user, revoking the user's previous token.
 * Returns the plaintext token (never stored).
 */
export async function createApiToken(email: string, userId: string): Promise<string> {
  const engine = getS3Engine();

  // One active token per user: revoke the previous one, if any.
  const previousRaw = await engine.getObject(userTokenKey(userId));
  if (previousRaw) {
    try {
      const { hash } = JSON.parse(previousRaw) as { hash?: string };
      if (hash) await engine.deleteObject(tokenKey(hash));
    } catch {
      // ignore malformed pointer
    }
  }

  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  const hash = hashApiToken(token);
  const record: ApiTokenRecord = {
    email: email.trim().toLowerCase(),
    userId,
    createdAt: new Date().toISOString(),
  };

  await engine.putObject(tokenKey(hash), JSON.stringify(record), 'application/json');
  await engine.putObject(
    userTokenKey(userId),
    JSON.stringify({ hash, createdAt: record.createdAt }),
    'application/json'
  );
  return token;
}

export async function revokeApiToken(userId: string): Promise<void> {
  const engine = getS3Engine();
  const pointerRaw = await engine.getObject(userTokenKey(userId));
  if (!pointerRaw) return;
  try {
    const { hash } = JSON.parse(pointerRaw) as { hash?: string };
    if (hash) await engine.deleteObject(tokenKey(hash));
  } finally {
    await engine.deleteObject(userTokenKey(userId));
  }
}

export async function getApiTokenInfo(userId: string): Promise<{ createdAt: string } | null> {
  const raw = await getS3Engine().getObject(userTokenKey(userId));
  if (!raw) return null;
  try {
    const { createdAt } = JSON.parse(raw) as { createdAt: string };
    return { createdAt };
  } catch {
    return null;
  }
}

/** Resolves a plaintext token to its owner, or null if unknown/revoked. */
export async function resolveApiToken(token: string): Promise<ApiTokenRecord | null> {
  if (!token || !token.startsWith(API_TOKEN_PREFIX) || token.length < 20) return null;
  const raw = await getS3Engine().getObject(tokenKey(hashApiToken(token)));
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as ApiTokenRecord;
    if (!record.email || !record.userId) return null;
    return record;
  } catch {
    return null;
  }
}
