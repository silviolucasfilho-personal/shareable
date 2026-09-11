import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, createDocument, getRepositoryStats, getAllTags, getAllFolders } from '@/lib/storage';
import { DocumentFilter } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const folder = searchParams.get('folder') || undefined;
    const isPublicParam = searchParams.get('isPublic');
    const sortBy = (searchParams.get('sortBy') as DocumentFilter['sortBy']) || 'updated_desc';

    const filter: DocumentFilter = {
      query,
      tag,
      folder,
      isPublic: isPublicParam !== null ? isPublicParam === 'true' : undefined,
      sortBy,
    };

    const [documents, stats, tags, folders] = await Promise.all([
      getDocuments(filter),
      getRepositoryStats(),
      getAllTags(),
      getAllFolders(),
    ]);

    return NextResponse.json({
      success: true,
      documents,
      stats,
      tags,
      folders,
    });
  } catch (error) {
    console.error('Failed to fetch documents from S3:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents from S3 storage' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, tags, folder, isPublic } = body;

    if (!title && !content) {
      return NextResponse.json(
        { success: false, error: 'Document must have a title or content' },
        { status: 400 }
      );
    }

    const doc = await createDocument({
      title: title || 'Untitled Document',
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      folder: typeof folder === 'string' ? folder : '',
      isPublic: isPublic !== false,
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error) {
    console.error('Failed to create document in S3:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create document in S3 storage' },
      { status: 500 }
    );
  }
}
