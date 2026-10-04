import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByShareToken, incrementViewCount } from '@/lib/storage';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';
import { canUserViewDocument } from '@/lib/permissions';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const doc = await getDocumentByShareToken(token);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Shared document not found' }, { status: 404 });
    }

    // Private documents require the owner, an invited collaborator, or an admin.
    if (!doc.isPublic) {
      const caller = await getAuthenticatedUser(request);
      if (!canUserViewDocument(doc, caller?.email, caller?.userId)) {
        return NextResponse.json(
          { success: false, error: 'This document is private.' },
          { status: caller ? 403 : 401 }
        );
      }
    }

    // Increment view count asynchronously in S3
    await incrementViewCount(token);

    // Return read-only document data
    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        folder: doc.folder,
        viewCount: doc.viewCount + 1,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        expiresAt: doc.expiresAt,
      },
    });
  } catch (error) {
    console.error('Failed to get shared document from S3:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
