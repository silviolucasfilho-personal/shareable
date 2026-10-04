import { isUserAdmin } from './roles';
import { CollaboratorRole } from './types';

export interface MinimalDocAuth {
  isPublic: boolean;
  ownerEmail?: string | null;
  ownerId?: string | null;
  collaborators?: Array<{ email: string; role: CollaboratorRole }>;
}

/**
 * Checks if a user is the owner of a document or has Admin privileges.
 */
export function isDocumentOwner(
  doc: MinimalDocAuth,
  userEmail?: string | null,
  userId?: string | null
): boolean {
  if (!userEmail && !userId) return false;
  const normalizedEmail = userEmail?.trim().toLowerCase();

  // Configured Admin has owner-level access to manage/view
  if (isUserAdmin(normalizedEmail)) return true;

  if (userId && doc.ownerId && doc.ownerId === userId) return true;
  if (normalizedEmail && doc.ownerEmail && doc.ownerEmail.trim().toLowerCase() === normalizedEmail) {
    return true;
  }
  return false;
}

/**
 * Checks if a user is an invited collaborator on a document.
 */
export function isDocumentCollaborator(
  doc: MinimalDocAuth,
  userEmail?: string | null
): { isCollaborator: boolean; role?: CollaboratorRole } {
  if (!userEmail) return { isCollaborator: false };
  const normalizedEmail = userEmail.trim().toLowerCase();
  const match = doc.collaborators?.find((c) => c.email.trim().toLowerCase() === normalizedEmail);
  return {
    isCollaborator: Boolean(match),
    role: match?.role,
  };
}

/**
 * Checks if a user has permission to view a document.
 * - Public documents: Anyone with the link can view.
 * - Private documents: Only the owner, invited collaborators, and Admins can view.
 *   Private documents without an owner are visible to Admins only (never to everyone).
 */
export function canUserViewDocument(
  doc: MinimalDocAuth,
  userEmail?: string | null,
  userId?: string | null
): boolean {
  if (doc.isPublic) return true;

  if (!userEmail && !userId) return false;

  const normalizedEmail = userEmail?.trim().toLowerCase();
  if (isUserAdmin(normalizedEmail)) return true;
  if (isDocumentOwner(doc, userEmail, userId)) return true;

  const { isCollaborator } = isDocumentCollaborator(doc, userEmail);
  return isCollaborator;
}

/**
 * Checks if a user has permission to edit a document.
 * - Owner and Admin: Full edit access.
 * - Collaborator with role 'editor': Edit access.
 * - Others: No edit access.
 */
export function canUserEditDocument(
  doc: MinimalDocAuth,
  userEmail?: string | null,
  userId?: string | null
): boolean {
  if (!userEmail && !userId) return false;
  if (isDocumentOwner(doc, userEmail, userId)) return true;

  const { isCollaborator, role } = isDocumentCollaborator(doc, userEmail);
  return isCollaborator && role === 'editor';
}

/**
 * Checks if a document should appear in a user's dashboard listing.
 *
 * Dashboards are personal: a user only sees documents they own and documents
 * explicitly shared with them. Public documents of other users are reachable
 * via their link but are never listed. This applies to Admins as well; Admins
 * keep owner-level access when opening a document directly.
 */
export function isListedForUser(
  doc: MinimalDocAuth,
  userEmail?: string | null,
  userId?: string | null
): boolean {
  if (!userEmail && !userId) return false;
  const normalizedEmail = userEmail?.trim().toLowerCase();

  if (userId && doc.ownerId && doc.ownerId === userId) return true;
  if (normalizedEmail && doc.ownerEmail && doc.ownerEmail.trim().toLowerCase() === normalizedEmail) {
    return true;
  }
  return isDocumentCollaborator(doc, userEmail).isCollaborator;
}
