import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { createDocument } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderOverride = formData.get('folder') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
    }

    const createdDocs = [];

    for (const file of files) {
      const fileName = file.name;
      const text = await file.text();

      let title = fileName.replace(/\.(md|markdown|txt)$/i, '');
      let tags: string[] = [];
      let folder = folderOverride || '';
      let content = text;

      try {
        const parsed = matter(text);
        if (parsed.data.title && typeof parsed.data.title === 'string') {
          title = parsed.data.title;
        }
        if (Array.isArray(parsed.data.tags)) {
          tags = parsed.data.tags.map((t) => String(t));
        } else if (typeof parsed.data.tags === 'string') {
          tags = parsed.data.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
        if (parsed.data.folder && typeof parsed.data.folder === 'string') {
          folder = parsed.data.folder;
        } else if (parsed.data.category && typeof parsed.data.category === 'string') {
          folder = parsed.data.category;
        }
        content = parsed.content.trim() || text;
      } catch {
        content = text;
      }

      // If title is still default filename and markdown starts with # Heading, extract it
      const headerMatch = content.match(/^#\s+(.+)$/m);
      if (headerMatch && (!title || title === fileName.replace(/\.(md|markdown|txt)$/i, ''))) {
        title = headerMatch[1].trim();
      }

      const doc = await createDocument({
        title: title || 'Imported Document',
        content,
        tags,
        folder,
        isPublic: true,
      });

      createdDocs.push(doc);
    }

    return NextResponse.json({
      success: true,
      count: createdDocs.length,
      documents: createdDocs,
    });
  } catch (error) {
    console.error('File upload error to S3:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload and parse documents into S3' },
      { status: 500 }
    );
  }
}
