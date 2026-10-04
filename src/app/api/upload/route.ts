import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import TurndownService from 'turndown';
import { createDocument, canUserCreateDocument } from '@/lib/storage';
import { Document } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Title, X-Folder, X-Tags, X-Filename, X-TTL, X-Expires-At',
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
  ttl?: string | null;
  expiresAt?: string | null;
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
    ttl?: string | null;
    expiresAt?: string | null;
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
  let isPublic = overrides?.isPublic !== undefined && overrides.isPublic !== null ? overrides.isPublic : false;
  let ttl = overrides?.ttl !== undefined ? overrides.ttl : null;
  let expiresAt = overrides?.expiresAt !== undefined ? overrides.expiresAt : null;
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
    if (overrides?.ttl === undefined && parsed.data.ttl) {
      ttl = String(parsed.data.ttl).trim();
    }
    if (overrides?.expiresAt === undefined && parsed.data.expiresAt) {
      expiresAt = String(parsed.data.expiresAt).trim();
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

    // Extract meta TTL / expiration
    if (!ttl && !expiresAt) {
      const ttlMeta = content.match(/<meta[^>]*name=["'](ttl|expires-at|expires_at)["'][^>]*content=["']([^"']+)["']/i);
      if (ttlMeta && ttlMeta[2]) {
        ttl = ttlMeta[2].trim();
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
    ttl,
    expiresAt,
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
            ttl: '(Optional) Document time-to-live preset (e.g. 1h, 24h, 7d, 30d, never)',
            expiresAt: '(Optional) Explicit ISO expiration timestamp',
          },
          rawBodyHeadersOrQueryParams: {
            'X-Title' : 'Custom title (or query param ?title=...)',
            'X-Folder': 'Folder name (or query param ?folder=...)',
            'X-Tags'  : 'Comma-separated tags (or query param ?tags=...)',
            'X-Filename': 'Original filename (or query param ?filename=...)',
            'X-TTL'   : 'TTL preset e.g. 1h, 24h, 7d, 30d (or query param ?ttl=...)',
            'X-Expires-At': 'ISO expiration timestamp (or query param ?expiresAt=...)',
            'isPublic': 'Query param ?isPublic=true|false',
          },
          examples: {
            curlMultipart: `curl -F "file=@example.html" -F "folder=Docs" -F "ttl=24h" ${baseUrl}/api/upload`,
            curlRawMarkdown: `curl -X POST -H "Content-Type: text/markdown" -H "X-Title: My Doc" -H "X-TTL: 7d" --data-binary @example.md ${baseUrl}/api/upload`,
            curlRawHtml: `curl -X POST -H "Content-Type: text/html" -H "X-Title: Web Report" --data-binary @report.html ${baseUrl}/api/upload`,
            curlJson: `curl -X POST -H "Content-Type: application/json" -d '{"title":"API Guide","content":"# Intro to API","ttl":"30d"}' ${baseUrl}/api/upload`,
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
    const queryTtl = searchParams.get('ttl');
    const queryExpiresAt = searchParams.get('expiresAt');

    const headerTitle = request.headers.get('x-title') || queryTitle;
    const headerFolder = request.headers.get('x-folder') || queryFolder;
    const headerTags = request.headers.get('x-tags') || queryTags;
    const headerTtl = request.headers.get('x-ttl') || queryTtl;
    const headerExpiresAt = request.headers.get('x-expires-at') || queryExpiresAt;

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

      const formFolder = (formData.get('folder') as string | null) || headerFolder;
      const formTitle = (formData.get('title') as string | null) || headerTitle;
      const formTags = (formData.get('tags') as string | null) || headerTags;
      const formIsPublicStr = formData.get('isPublic') as string | null;
      const formIsPublic = formIsPublicStr !== null ? formIsPublicStr === 'true' : isPublicParam;
      const formTtl = (formData.get('ttl') as string | null) || headerTtl;
      const formExpiresAt = (formData.get('expiresAt') as string | null) || headerExpiresAt;

      for (const file of rawFiles) {
        const text = await file.text();
        const parsed = parseDocumentContent(text, file.name, {
          title: rawFiles.length === 1 ? formTitle : undefined,
          folder: formFolder,
          tags: formTags,
          isPublic: formIsPublic,
          ttl: formTtl,
          expiresAt: formExpiresAt,
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

      const fileName = request.headers.get('x-filename') || searchParams.get('filename') || undefined;

      const parsed = parseDocumentContent(rawText, fileName, {
        title: headerTitle,
        folder: headerFolder,
        tags: headerTags,
        isPublic: isPublicParam,
        ttl: headerTtl,
        expiresAt: headerExpiresAt,
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
              folder: item.folder || headerFolder,
              tags: item.tags || headerTags,
              isPublic: typeof item.isPublic === 'boolean' ? item.isPublic : isPublicParam,
              ttl: item.ttl || headerTtl,
              expiresAt: item.expiresAt || headerExpiresAt,
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
          title: body.title || headerTitle,
          folder: body.folder || headerFolder,
          tags: body.tags || headerTags,
          isPublic: typeof body.isPublic === 'boolean' ? body.isPublic : isPublicParam,
          ttl: body.ttl || headerTtl,
          expiresAt: body.expiresAt || headerExpiresAt,
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
        title: headerTitle,
        folder: headerFolder,
        tags: headerTags,
        isPublic: isPublicParam,
        ttl: headerTtl,
        expiresAt: headerExpiresAt,
      });
      toCreate.push(parsed);
    }

    if (toCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No documents could be processed for upload' },
        { status: 400, headers: corsHeaders }
      );
    }

    const caller = await getAuthenticatedUser(request);
    const ownerEmail = caller?.email?.trim().toLowerCase();
    if (!caller || !ownerEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Upload rejected: an explicit owner is required. Sign in, or provide "Authorization: Bearer <token>" with a personal API token.',
        },
        { status: 401, headers: corsHeaders }
      );
    }

    // Enforce role-based document limit (Free users can keep up to 3 documents)
    const quotaCheck = await canUserCreateDocument(ownerEmail, caller.userId, toCreate.length);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: quotaCheck.error || 'Upload would exceed the document limit for free users.',
          role: quotaCheck.role,
          currentCount: quotaCheck.currentCount,
          maxDocuments: quotaCheck.maxDocuments,
          remaining: quotaCheck.remaining,
        },
        { status: 403, headers: corsHeaders }
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
        ttl: docInput.ttl,
        expiresAt: docInput.expiresAt,
        ownerId: caller.userId,
        ownerEmail: ownerEmail,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload and store document in S3 storage';
    console.error('Document upload error:', error);
    const isQuota = message.toLowerCase().includes('free users can keep up to');
    return NextResponse.json(
      { success: false, error: message },
      { status: isQuota ? 403 : 500, headers: corsHeaders }
    );
  }
}

