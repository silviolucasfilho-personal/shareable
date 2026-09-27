import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth/server';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import outputs from '../../amplify_outputs.json';

import { UserRole } from './types';
import { getUserRole } from './roles';

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
 * Extracts authenticated user information from cookies/session in Next.js Server Components / Route Handlers.
 * Gracefully falls back to mock dev header if Amplify is not yet configured with live Cognito.
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<ServerUserIdentity | null> {
  // Check for dev simulation header/cookie in local dev mode
  if (request) {
    const devUserHeader = request.headers.get('x-dev-user-email');
    if (devUserHeader) {
      const email = devUserHeader.toLowerCase().trim();
      return {
        userId: `dev-${email}`,
        email,
        name: email.split('@')[0],
        role: getUserRole(email),
      };
    }
  }

  // Also check cookie for dev user if in development
  try {
    const cookieStore = await cookies();
    const devCookie = cookieStore.get('dev_user_email');
    if (devCookie?.value) {
      const email = devCookie.value.toLowerCase().trim();
      return {
        userId: `dev-${email}`,
        email,
        name: email.split('@')[0],
        role: getUserRole(email),
      };
    }
  } catch {
    // cookies() may fail if called outside server context
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
