import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, updateDocument, deleteDocument } from '@/lib/storage';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';
import { canUserViewDocument, canUserEditDocument, isDocumentOwner } from '@/lib/permissions';

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

    const caller = await getAuthenticatedUser(request);
    if (!canUserViewDocument(doc, caller?.email, caller?.userId)) {
      if (!caller) {
        return NextResponse.json(
          { success: false, error: 'This document is private. Please sign in to access.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'You do not have permission to view this private document' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, document: doc });
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

      if (!canUserEditDocument(doc, caller.email, caller.userId)) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to edit this document' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();

    // Only owner can change visibility (isPublic)
    if (body.isPublic !== undefined && body.isPublic !== doc.isPublic) {
      if (!isDocumentOwner(doc, caller?.email, caller?.userId)) {
        return NextResponse.json(
          { success: false, error: 'Only the document owner can change visibility settings' },
          { status: 403 }
        );
      }
    }

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

      if (!isDocumentOwner(doc, caller.email, caller.userId)) {
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
