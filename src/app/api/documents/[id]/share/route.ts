import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, regenerateShareToken, updateDocument } from '@/lib/storage';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { action, isPublic } = body;

    const doc = await getDocumentById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (action === 'regenerate') {
      const newToken = await regenerateShareToken(id);
      return NextResponse.json({ success: true, shareToken: newToken });
    }

    if (typeof isPublic === 'boolean') {
      const updated = await updateDocument(id, { isPublic });
      return NextResponse.json({ success: true, document: updated });
    }

    return NextResponse.json({
      success: true,
      shareToken: doc.shareToken,
      isPublic: doc.isPublic,
    });
  } catch (error) {
    console.error('Failed to update share settings in S3:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
