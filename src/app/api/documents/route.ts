import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, createDocument, getRepositoryStats, getAllTags, getAllFolders, canUserCreateDocument } from '@/lib/storage';
import { DocumentFilter } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const folder = searchParams.get('folder') || undefined;
    const isPublicParam = searchParams.get('isPublic');
    const sortBy = (searchParams.get('sortBy') as DocumentFilter['sortBy']) || 'updated_desc';
    const scope = (searchParams.get('scope') as DocumentFilter['scope']) || 'all';

    const caller = await getAuthenticatedUser(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const filter: DocumentFilter = {
      query,
      tag,
      folder,
      isPublic: isPublicParam !== null ? isPublicParam === 'true' : undefined,
      sortBy,
      scope,
      userEmail: caller.email,
      userId: caller.userId,
    };

    const [documents, stats, tags, folders, userQuota] = await Promise.all([
      getDocuments(filter),
      getRepositoryStats(caller.email, caller.userId),
      getAllTags(caller.email, caller.userId),
      getAllFolders(caller.email, caller.userId),
      canUserCreateDocument(caller.email, caller.userId, 0),
    ]);

    return NextResponse.json({
      success: true,
      documents,
      stats,
      tags,
      folders,
      currentUser: caller,
      userQuota: {
        role: userQuota.role,
        currentCount: userQuota.currentCount,
        maxDocuments: userQuota.maxDocuments,
        canCreate: userQuota.allowed,
        remaining: userQuota.remaining,
      },
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
    const caller = await getAuthenticatedUser(request);
    const ownerEmail = caller?.email?.trim().toLowerCase();
    if (!caller || !ownerEmail) {
      return NextResponse.json(
        { success: false, error: 'Document creation rejected: an explicit owner is required. Please sign in.' },
        { status: 401 }
      );
    }

    // Role-based quota enforcement: Free users can keep up to 3 documents
    const quotaCheck = await canUserCreateDocument(ownerEmail, caller.userId, 1);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: quotaCheck.error || 'Free user document limit reached (maximum 3 documents).',
          role: quotaCheck.role,
          currentCount: quotaCheck.currentCount,
          maxDocuments: quotaCheck.maxDocuments,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, tags, folder, isPublic, ttl, expiresAt } = body;

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
      isPublic: isPublic === true,
      ownerId: caller.userId,
      ownerEmail: ownerEmail,
      collaborators: [],
      ttl,
      expiresAt,
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create document in S3 storage';
    console.error('Failed to create document in S3:', error);
    const isQuotaError = message.toLowerCase().includes('free users can keep up to');
    return NextResponse.json(
      { success: false, error: message },
      { status: isQuotaError ? 403 : 500 }
    );
  }
}
