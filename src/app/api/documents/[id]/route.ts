import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, updateDocument, deleteDocument } from '@/lib/storage';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const doc = await getDocumentById(id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // If public in repo, allow reading
    if (doc.isPublic) {
      return NextResponse.json({ success: true, document: doc });
    }

    // Check caller permission for restricted / unlisted documents
    const caller = await getAuthenticatedUser(request);
    if (!caller) {
      // If no owner is assigned to document (legacy/sample), allow view
      if (!doc.ownerEmail && !doc.ownerId && (!doc.collaborators || doc.collaborators.length === 0)) {
        return NextResponse.json({ success: true, document: doc });
      }
      return NextResponse.json(
        { success: false, error: 'Authentication required to view this private document' },
        { status: 401 }
      );
    }

    const callerEmail = caller.email.toLowerCase();
    const isOwner =
      (doc.ownerEmail && doc.ownerEmail.toLowerCase() === callerEmail) ||
      (doc.ownerId && doc.ownerId === caller.userId);

    const isCollaborator = doc.collaborators?.some(
      (c) => c.email.toLowerCase() === callerEmail
    );

    if (isOwner || isCollaborator) {
      return NextResponse.json({ success: true, document: doc });
    }

    return NextResponse.json(
      { success: false, error: 'You do not have permission to view this document' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Failed to get document from S3:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const doc = await getDocumentById(id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const caller = await getAuthenticatedUser(request);

    // If doc has an owner, check permissions
    if (doc.ownerEmail || doc.ownerId || (doc.collaborators && doc.collaborators.length > 0)) {
      if (!caller) {
        return NextResponse.json(
          { success: false, error: 'Authentication required to edit this document' },
          { status: 401 }
        );
      }

      const callerEmail = caller.email.toLowerCase();
      const isOwner =
        (doc.ownerEmail && doc.ownerEmail.toLowerCase() === callerEmail) ||
        (doc.ownerId && doc.ownerId === caller.userId);

      const collaborator = doc.collaborators?.find(
        (c) => c.email.toLowerCase() === callerEmail
      );

      if (!isOwner) {
        if (!collaborator) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to edit this document' },
            { status: 403 }
          );
        }
        if (collaborator.role !== 'editor') {
          return NextResponse.json(
            { success: false, error: 'You have read-only (viewer) access to this document' },
            { status: 403 }
          );
        }
      }
    }

    const body = await request.json();
    const updated = await updateDocument(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, document: updated });
  } catch (error) {
    console.error('Failed to update document in S3:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const doc = await getDocumentById(id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const caller = await getAuthenticatedUser(request);

    // Only owner can delete
    if (doc.ownerEmail || doc.ownerId) {
      if (!caller) {
        return NextResponse.json(
          { success: false, error: 'Authentication required to delete this document' },
          { status: 401 }
        );
      }

      const callerEmail = caller.email.toLowerCase();
      const isOwner =
        (doc.ownerEmail && doc.ownerEmail.toLowerCase() === callerEmail) ||
        (doc.ownerId && doc.ownerId === caller.userId);

      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Only the document owner can delete this document' },
          { status: 403 }
        );
      }
    }

    const deleted = await deleteDocument(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Document deleted from S3 successfully' });
  } catch (error) {
    console.error('Failed to delete document from S3:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
