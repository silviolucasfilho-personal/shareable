import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentById,
  regenerateShareToken,
  updateDocument,
  addCollaborator,
  removeCollaborator,
} from '@/lib/storage';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';
import { CollaboratorRole } from '@/lib/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { action, isPublic, email, role } = body;

    const doc = await getDocumentById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const caller = await getAuthenticatedUser(request);

    // If document is owned by a user, ensure only the owner can modify sharing & collaborators
    if (doc.ownerEmail && caller) {
      const isOwner =
        doc.ownerEmail.toLowerCase() === caller.email.toLowerCase() ||
        (doc.ownerId && doc.ownerId === caller.userId);
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Only the document owner can change sharing settings' },
          { status: 403 }
        );
      }
    }

    // 1. Add Collaborator
    if (action === 'addCollaborator') {
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'A valid email address is required' },
          { status: 400 }
        );
      }

      const validRole: CollaboratorRole = role === 'editor' ? 'editor' : 'viewer';
      const updated = await addCollaborator(id, { email: email.trim(), role: validRole });
      return NextResponse.json({ success: true, document: updated });
    }

    // 2. Remove Collaborator
    if (action === 'removeCollaborator') {
      if (!email || typeof email !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Email is required to remove collaborator' },
          { status: 400 }
        );
      }

      const updated = await removeCollaborator(id, email.trim());
      return NextResponse.json({ success: true, document: updated });
    }

    // 3. Regenerate Public Share Link
    if (action === 'regenerate') {
      const newToken = await regenerateShareToken(id);
      const updated = await getDocumentById(id);
      return NextResponse.json({ success: true, shareToken: newToken, document: updated });
    }

    // 4. Update isPublic visibility
    if (typeof isPublic === 'boolean') {
      const updated = await updateDocument(id, { isPublic });
      return NextResponse.json({ success: true, document: updated });
    }

    return NextResponse.json({
      success: true,
      shareToken: doc.shareToken,
      isPublic: doc.isPublic,
      collaborators: doc.collaborators || [],
    });
  } catch (error) {
    console.error('Failed to update share settings in S3:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
