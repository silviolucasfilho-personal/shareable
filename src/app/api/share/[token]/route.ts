import { NextRequest, NextResponse } from 'next/server';
import { getDocumentByShareToken, incrementViewCount } from '@/lib/storage';

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
      },
    });
  } catch (error) {
    console.error('Failed to get shared document from S3:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
