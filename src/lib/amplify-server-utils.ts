import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth/server';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import outputs from '../../amplify_outputs.json';

import { UserRole } from './types';
import { getUserRole } from './roles';
import { resolveApiToken } from './api-tokens';

const isAmplifyConfigured = Boolean(
  outputs &&
  outputs.auth &&
  outputs.auth.user_pool_id &&
  outputs.auth.user_pool_id.length > 0
);

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

export interface ServerUserIdentity {
  userId: string;
  email: string;
  name?: string;
  role: UserRole;
}

/**
 * Dev impersonation (x-dev-user-email header / dev_user_email cookie) is only
 * honored outside production, or when Cognito is not configured at all.
 * In production anyone could otherwise forge an identity with a single header.
 */
const allowDevImpersonation =
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH === 'true';

function devIdentity(rawEmail: string): ServerUserIdentity {
  const email = rawEmail.toLowerCase().trim();
  return {
    userId: `dev-${email}`,
    email,
    name: email.split('@')[0],
    role: getUserRole(email),
  };
}

/**
 * Extracts authenticated user information in Next.js Server Components / Route Handlers.
 * Order: Bearer API token → (dev only) dev header/cookie → Amplify Cognito session cookies.
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<ServerUserIdentity | null> {
  // 1. Personal API token (used by CLI tools such as the shareable-upload skill)
  const authHeader = request?.headers.get('authorization');
  if (authHeader && /^bearer\s+/i.test(authHeader)) {
    const record = await resolveApiToken(authHeader.replace(/^bearer\s+/i, '').trim());
    if (!record) return null; // An invalid token never falls back to other methods
    return {
      userId: record.userId,
      email: record.email,
      name: record.email.split('@')[0],
      role: getUserRole(record.email),
    };
  }

  // 2. Dev simulation (local development only)
  if (allowDevImpersonation || !isAmplifyConfigured) {
    const devUserHeader = request?.headers.get('x-dev-user-email');
    if (devUserHeader) return devIdentity(devUserHeader);

    try {
      const cookieStore = await cookies();
      const devCookie = cookieStore.get('dev_user_email');
      if (devCookie?.value) return devIdentity(devCookie.value);
    } catch {
      // cookies() may fail if called outside server context
    }
  }

  if (!isAmplifyConfigured) {
    return null;
  }

  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    });

    const userSub = session.userSub;
    if (!userSub) return null;

    let email = '';
    let name = '';

    try {
      const attributes = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: (contextSpec) => fetchUserAttributes(contextSpec),
      });
      email = attributes.email || '';
      name = attributes.name || '';
    } catch {
      // Attributes fetch may be empty or failed
    }

    const cleanEmail = email.toLowerCase().trim() || userSub;

    return {
      userId: userSub,
      email: cleanEmail,
      name: name || undefined,
      role: getUserRole(cleanEmail),
    };
  } catch {
    return null;
  }
}
