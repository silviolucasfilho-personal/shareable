import { UserRole, UserQuota } from './types';

export const DEFAULT_ADMIN_EMAIL = 'silviolucasfilho@gmail.com';
export const FREE_USER_DOC_LIMIT = 3;

/**
 * Returns list of configured admin emails.
 * Reads from process.env.NEXT_PUBLIC_ADMIN_EMAIL or process.env.ADMIN_EMAIL (comma-separated if multiple),
 * and defaults to 'silviolucasfilho@gmail.com'.
 */
export function getAdminEmails(): string[] {
  const envAdmins =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.ADMIN_EMAILS ||
    DEFAULT_ADMIN_EMAIL;

  return envAdmins
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if a given email belongs to an ADMIN user.
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email || !email.trim()) return false;
  const normalized = email.trim().toLowerCase();
  const adminEmails = getAdminEmails();
  return adminEmails.includes(normalized);
}

/**
 * Determines the role of a user based on their email.
 * Only the configured ADMIN email(s) get 'ADMIN'; everyone else is 'FREE_USER'.
 */
export function getUserRole(email?: string | null): UserRole {
  return isUserAdmin(email) ? 'ADMIN' : 'FREE_USER';
}

/**
 * Calculates user quota details based on their role and active document count.
 */
export function calculateUserQuota(currentCount: number, email?: string | null): UserQuota {
  const role = getUserRole(email);

  if (role === 'ADMIN') {
    return {
      role: 'ADMIN',
      currentCount,
      maxDocuments: null, // Unlimited
      canCreate: true,
      remaining: null,
    };
  }

  const remaining = Math.max(0, FREE_USER_DOC_LIMIT - currentCount);

  return {
    role: 'FREE_USER',
    currentCount,
    maxDocuments: FREE_USER_DOC_LIMIT,
    canCreate: currentCount < FREE_USER_DOC_LIMIT,
    remaining,
  };
}
