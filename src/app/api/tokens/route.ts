import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';
import { createApiToken, getApiTokenInfo, revokeApiToken } from '@/lib/api-tokens';

/**
 * Personal API token management for the signed-in user.
 * Tokens must be managed from a browser session; a Bearer token cannot mint or revoke tokens.
 */
async function requireSessionUser(request: NextRequest) {
  if (request.headers.get('authorization')) return null;
  return getAuthenticatedUser(request);
}

const unauthorized = () =>
  NextResponse.json(
    { success: false, error: 'Sign in with your browser session to manage API tokens.' },
    { status: 401 }
  );

export async function GET(request: NextRequest) {
  const caller = await requireSessionUser(request);
  if (!caller) return unauthorized();
  const info = await getApiTokenInfo(caller.userId);
  return NextResponse.json({ success: true, hasToken: Boolean(info), createdAt: info?.createdAt ?? null });
}

export async function POST(request: NextRequest) {
  const caller = await requireSessionUser(request);
  if (!caller) return unauthorized();
  const token = await createApiToken(caller.email, caller.userId);
  return NextResponse.json({ success: true, token, email: caller.email }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const caller = await requireSessionUser(request);
  if (!caller) return unauthorized();
  await revokeApiToken(caller.userId);
  return NextResponse.json({ success: true });
}
