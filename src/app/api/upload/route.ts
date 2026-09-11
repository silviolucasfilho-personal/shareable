import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import TurndownService from 'turndown';
import { createDocument } from '@/lib/storage';
import { Document } from '@/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Title, X-Folder, X-Tags, X-Filename',
};

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Configure Turndown to keep table formatting intact
turndown.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'video', 'audio', 'iframe']);

interface DocumentInput {
  title?: string;
  content: string;
  tags?: string[];
  folder?: string;
  isPublic?: boolean;
}

function isHtmlDocument(text: string, fileName?: string): boolean {
  if (fileName && /\.(html|htm)$/i.test(fileName)) {
    return true;
  }
  const trimmed = text.trim();
  return (
    trimmed.startsWith('<!DOCTYPE html') ||
    /<html[\s>]/i.test(trimmed) ||
    (/<head[\s>]/i.test(trimmed) && /<body[\s>]/i.test(trimmed)) ||
    /<(h[1-6]|p|div|table|article|section)[\s>]/i.test(trimmed)
  );
}

function parseDocumentContent(
  rawText: string,
  fileName?: string,
  overrides?: {
    title?: string | null;
    folder?: string | null;
    tags?: string[] | string | null;
    isPublic?: boolean | null;
  }
): DocumentInput {
  let title = overrides?.title?.trim() || '';
  if (!title && fileName) {
    title = fileName.replace(/\.(md|markdown|txt|html|htm)$/i, '');
  }

  let tags: string[] = [];
  if (Array.isArray(overrides?.tags)) {
    tags = overrides.tags.map(String);
  } else if (typeof overrides?.tags === 'string' && overrides.tags.trim()) {
    tags = overrides.tags.split(',').map((t) => t.trim()).filter(Boolean);
  }

  let folder = overrides?.folder?.trim() || '';
  let isPublic = overrides?.isPublic !== undefined && overrides.isPublic !== null ? overrides.isPublic : true;
  let content = rawText;

  // 1. First, parse YAML frontmatter if present
  try {
    const parsed = matter(rawText);
    if (!title && parsed.data.title && typeof parsed.data.title === 'string') {
      title = parsed.data.title.trim();
    }
    if (tags.length === 0) {
      if (Array.isArray(parsed.data.tags)) {
        tags = parsed.data.tags.map((t) => String(t));
      } else if (typeof parsed.data.tags === 'string') {
        tags = parsed.data.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }
    if (!folder) {
      if (typeof parsed.data.folder === 'string') {
        folder = parsed.data.folder.trim();
      } else if (typeof parsed.data.category === 'string') {
        folder = parsed.data.category.trim();
      }
    }
    if (overrides?.isPublic === undefined && typeof parsed.data.isPublic === 'boolean') {
      isPublic = parsed.data.isPublic;
    }
    content = parsed.content.trim() || rawText;
  } catch {
    content = rawText;
  }

  // 2. If the document is HTML, extract HTML metadata and convert body to clean Markdown
  if (isHtmlDocument(content, fileName)) {
    // Extract <title> if title not explicitly provided
    const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if ((!title || (fileName && title === fileName.replace(/\.(md|markdown|txt|html|htm)$/i, ''))) && titleMatch) {
      const extracted = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      if (extracted) {
        title = extracted;
      }
    }

    // Extract meta title
    if (!title) {
      const metaTitleMatch = content.match(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i);
      if (metaTitleMatch && metaTitleMatch[1].trim()) {
        title = metaTitleMatch[1].trim();
      }
    }

    // Extract meta keywords for tags
    if (tags.length === 0) {
      const kwMatch = content.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
      if (kwMatch && kwMatch[1]) {
        tags = kwMatch[1].split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    // Extract meta folder or category
    if (!folder) {
      const folderMeta = content.match(/<meta[^>]*name=["'](folder|category)["'][^>]*content=["']([^"']+)["']/i);
      if (folderMeta && folderMeta[2]) {
        folder = folderMeta[2].trim();
      }
    }

    // Extract body content
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyToConvert = bodyMatch ? bodyMatch[1] : content;

    // Remove scripts and style tags for safety and clean content
    bodyToConvert = bodyToConvert
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');

    // Extract <h1> if title is still default filename
    if (!title || (fileName && title === fileName.replace(/\.(md|markdown|txt|html|htm)$/i, ''))) {
      const h1Match = bodyToConvert.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1Match) {
        const extractedH1 = h1Match[1].replace(/<[^>]+>/g, '').trim();
        if (extractedH1) {
          title = extractedH1;
        }
      }
    }

    // Convert HTML to clean Markdown
    try {
      const converted = turndown.turndown(bodyToConvert).trim();
      if (converted) {
        content = converted;
      } else {
        content = bodyToConvert.trim();
      }
    } catch {
      content = bodyToConvert.trim();
    }
  }

  // 3. If title is still empty or default filename, check for Markdown `# Heading`
  const headerMatch = content.match(/^#\s+(.+)$/m);
  if (headerMatch && (!title || (fileName && title === fileName.replace(/\.(md|markdown|txt|html|htm)$/i, '')))) {
    title = headerMatch[1].trim();
  }

  return {
    title: title || 'Imported Document',
    content,
    tags,
    folder,
    isPublic,
  };
}

/**
 * OPTIONS /api/upload
 * Handles CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/upload
 * Returns metadata and usage documentation for the public upload endpoint
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = `${protocol}://${host}`;

  return NextResponse.json(
    {
      name: 'Shareable Public Document Upload Endpoint',
      status: 'active',
      description: 'Public API endpoint to upload Markdown, HTML, and text documents directly to S3 storage.',
      methods: {
        POST: {
          description: 'Upload one or more documents',
          acceptedContentTypes: [
            'multipart/form-data',
            'text/markdown',
            'text/html',
            'text/plain',
            'application/json',
          ],
          multipartFields: {
            files: 'One or more files (.md, .markdown, .txt, .html, .htm)',
            file: 'Alternative single-file field name',
            document: 'Alternative single-document field name',
            folder: '(Optional) Folder/category name to categorize documents under',
            title: '(Optional) Custom title override',
            tags: '(Optional) Comma-separated list of tags',
            isPublic: '(Optional) Boolean flag, default true',
          },
          rawBodyHeadersOrQueryParams: {
            'X-Title' : 'Custom title (or query param ?title=...)',
            'X-Folder': 'Folder name (or query param ?folder=...)',
            'X-Tags'  : 'Comma-separated tags (or query param ?tags=...)',
            'X-Filename': 'Original filename (or query param ?filename=...)',
            'isPublic': 'Query param ?isPublic=true|false',
          },
          examples: {
            curlMultipart: `curl -F "file=@example.html" -F "folder=Docs" ${baseUrl}/api/upload`,
            curlRawMarkdown: `curl -X POST -H "Content-Type: text/markdown" -H "X-Title: My Doc" --data-binary @example.md ${baseUrl}/api/upload`,
            curlRawHtml: `curl -X POST -H "Content-Type: text/html" -H "X-Title: Web Report" --data-binary @report.html ${baseUrl}/api/upload`,
            curlJson: `curl -X POST -H "Content-Type: application/json" -d '{"title":"API Guide","content":"# Intro to API"}' ${baseUrl}/api/upload`,
          },
        },
      },
    },
    { headers: corsHeaders }
  );
}

/**
 * POST /api/upload
 * Public endpoint where documents can be uploaded via:
 * 1. multipart/form-data (fields: files, file, document, or any file input)
 * 2. text/markdown or text/plain (raw document body)
 * 3. application/json ({ title, content, tags, folder, isPublic } or array)
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const { searchParams } = new URL(request.url);

    const queryTitle = searchParams.get('title');
    const queryFolder = searchParams.get('folder');
    const queryTags = searchParams.get('tags');
    const queryIsPublic = searchParams.get('isPublic');
    const isPublicParam = queryIsPublic !== null ? queryIsPublic !== 'false' : undefined;

    const toCreate: DocumentInput[] = [];

    // 1. Handle multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      // Collect files from common field names ('files', 'file', 'document') or any file entry
      const rawFiles: File[] = [];
      const seenFileNames = new Set<string>();

      for (const key of ['files', 'file', 'document']) {
        const entries = formData.getAll(key);
        for (const entry of entries) {
          if (entry instanceof File) {
            const fileIdentifier = `${entry.name}-${entry.size}-${entry.lastModified}`;
            if (!seenFileNames.has(fileIdentifier)) {
              seenFileNames.add(fileIdentifier);
              rawFiles.push(entry);
            }
          }
        }
      }

      // Also inspect other form entries in case custom field name was used
      if (rawFiles.length === 0) {
        for (const [, value] of formData.entries()) {
          if (value instanceof File) {
            const fileIdentifier = `${value.name}-${value.size}-${value.lastModified}`;
            if (!seenFileNames.has(fileIdentifier)) {
              seenFileNames.add(fileIdentifier);
              rawFiles.push(value);
            }
          }
        }
      }

      if (rawFiles.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No files provided in form data' },
          { status: 400, headers: corsHeaders }
        );
      }

      const formFolder = (formData.get('folder') as string | null) || queryFolder;
      const formTitle = (formData.get('title') as string | null) || queryTitle;
      const formTags = (formData.get('tags') as string | null) || queryTags;
      const formIsPublicStr = formData.get('isPublic') as string | null;
      const formIsPublic = formIsPublicStr !== null ? formIsPublicStr !== 'false' : isPublicParam;

      for (const file of rawFiles) {
        const text = await file.text();
        const parsed = parseDocumentContent(text, file.name, {
          title: rawFiles.length === 1 ? formTitle : undefined,
          folder: formFolder,
          tags: formTags,
          isPublic: formIsPublic,
        });
        toCreate.push(parsed);
      }
    }
    // 2. Handle raw markdown, HTML, or plain text
    else if (
      contentType.includes('text/markdown') ||
      contentType.includes('text/plain') ||
      contentType.includes('text/html') ||
      contentType.includes('application/octet-stream')
    ) {
      const rawText = await request.text();
      if (!rawText || !rawText.trim()) {
        return NextResponse.json(
          { success: false, error: 'Empty document content received' },
          { status: 400, headers: corsHeaders }
        );
      }

      const headerTitle = request.headers.get('x-title') || queryTitle;
      const headerFolder = request.headers.get('x-folder') || queryFolder;
      const headerTags = request.headers.get('x-tags') || queryTags;
      const fileName = request.headers.get('x-filename') || searchParams.get('filename') || undefined;

      const parsed = parseDocumentContent(rawText, fileName, {
        title: headerTitle,
        folder: headerFolder,
        tags: headerTags,
        isPublic: isPublicParam,
      });
      toCreate.push(parsed);
    }
    // 3. Handle JSON payload
    else if (contentType.includes('application/json')) {
      const body = await request.json();

      if (Array.isArray(body)) {
        for (const item of body) {
          if (item && typeof item === 'object' && (item.content || item.title)) {
            const parsed = parseDocumentContent(item.content || '', undefined, {
              title: item.title,
              folder: item.folder || queryFolder,
              tags: item.tags || queryTags,
              isPublic: typeof item.isPublic === 'boolean' ? item.isPublic : isPublicParam,
            });
            toCreate.push(parsed);
          }
        }
      } else if (body && typeof body === 'object') {
        const content = body.content || body.text || body.markdown || '';
        if (!content && !body.title) {
          return NextResponse.json(
            { success: false, error: 'Document must provide content or title' },
            { status: 400, headers: corsHeaders }
          );
        }

        const parsed = parseDocumentContent(content, body.filename, {
          title: body.title || queryTitle,
          folder: body.folder || queryFolder,
          tags: body.tags || queryTags,
          isPublic: typeof body.isPublic === 'boolean' ? body.isPublic : isPublicParam,
        });
        toCreate.push(parsed);
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON payload structure' },
          { status: 400, headers: corsHeaders }
        );
      }
    }
    // 4. Fallback for unspecified or other text content
    else {
      const rawText = await request.text();
      if (!rawText || !rawText.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported content-type or empty body. Send multipart/form-data, text/markdown, text/html, or application/json.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const parsed = parseDocumentContent(rawText, undefined, {
        title: queryTitle,
        folder: queryFolder,
        tags: queryTags,
        isPublic: isPublicParam,
      });
      toCreate.push(parsed);
    }

    if (toCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No documents could be processed for upload' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Persist all documents to S3 storage
    const createdDocs: Document[] = [];
    for (const docInput of toCreate) {
      const doc = await createDocument({
        title: docInput.title || 'Imported Document',
        content: docInput.content,
        tags: docInput.tags,
        folder: docInput.folder,
        isPublic: docInput.isPublic,
      });
      createdDocs.push(doc);
    }

    const firstDoc = createdDocs[0];

    return NextResponse.json(
      {
        success: true,
        count: createdDocs.length,
        document: firstDoc,
        documents: createdDocs,
        url: firstDoc ? `/doc/${firstDoc.id}` : undefined,
        shareUrl: firstDoc ? `/s/${firstDoc.shareToken}` : undefined,
      },
      {
        status: 201,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload and store document in S3 storage' },
      { status: 500, headers: corsHeaders }
    );
  }
}

