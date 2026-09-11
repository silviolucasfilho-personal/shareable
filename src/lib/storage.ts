import { Document, DocumentSummary, CreateDocumentInput, UpdateDocumentInput, DocumentFilter } from './types';
import { generateSlug, generateShareToken, extractExcerpt, calculateReadingTime, countWords } from './utils';
import { getS3Engine, getStorageInfo } from './s3-client';

const INDEX_KEY = 'index/documents-index.json';

// Helper to construct S3 keys
export const s3Keys = {
  document: (id: string) => `documents/${id}.md`,
  metadata: (id: string) => `metadata/${id}.json`,
  share: (token: string) => `shares/${token}.json`,
  index: () => INDEX_KEY,
};

let _initPromise: Promise<void> | null = null;

export async function ensureStorageInitialized(): Promise<void> {
  if (!_initPromise) {
    _initPromise = initStorage();
  }
  return _initPromise;
}

async function initStorage(): Promise<void> {
  const engine = getS3Engine();
  const indexRaw = await engine.getObject(INDEX_KEY);

  if (!indexRaw) {
    // Check if there are existing metadata files in S3
    const metaKeys = await engine.listObjects('metadata/');
    if (metaKeys.length === 0) {
      // Bucket is empty, seed initial markdown documents
      await seedInitialDocuments();
    } else {
      // Rebuild index from metadata files
      await rebuildIndex();
    }
  }
}

async function rebuildIndex(): Promise<DocumentSummary[]> {
  const engine = getS3Engine();
  const metaKeys = await engine.listObjects('metadata/');
  const summaries: DocumentSummary[] = [];

  for (const key of metaKeys) {
    try {
      const metaRaw = await engine.getObject(key);
      if (metaRaw) {
        const doc = JSON.parse(metaRaw) as Document;
        // Fetch content if excerpt is needed
        const content = (await engine.getObject(s3Keys.document(doc.id))) || '';
        summaries.push({
          id: doc.id,
          slug: doc.slug,
          title: doc.title,
          excerpt: extractExcerpt(content),
          tags: doc.tags || [],
          folder: doc.folder || '',
          isPublic: doc.isPublic,
          shareToken: doc.shareToken,
          viewCount: doc.viewCount || 0,
          wordCount: countWords(content),
          readingTimeMinutes: calculateReadingTime(content),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
      }
    } catch (err) {
      console.error(`Failed to parse metadata key ${key}:`, err);
    }
  }

  await engine.putObject(INDEX_KEY, JSON.stringify(summaries), 'application/json');
  return summaries;
}

async function getIndex(): Promise<DocumentSummary[]> {
  await ensureStorageInitialized();
  const engine = getS3Engine();
  const raw = await engine.getObject(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveIndex(summaries: DocumentSummary[]): Promise<void> {
  const engine = getS3Engine();
  await engine.putObject(INDEX_KEY, JSON.stringify(summaries), 'application/json');
}

async function seedInitialDocuments() {
  const samples = [
    {
      title: 'Welcome to Shareable on Amazon S3 🚀',
      slug: 'welcome-to-shareable-s3',
      folder: 'Getting Started',
      tags: ['guide', 's3', 'storage', 'markdown'],
      content: `# Welcome to Shareable on Amazon S3 🚀

**Shareable** now uses **Amazon S3** as its persistent object storage engine for all markdown documents!

---

## 🪣 How S3 Storage Works

Each document in this repository is stored as first-class objects in your S3 bucket:

1. \`documents/{id}.md\`: The pure Markdown document body.
2. \`metadata/{id}.json\`: Document attributes, tags, folder, and share settings.
3. \`shares/{shareToken}.json\`: High-speed O(1) direct share pointer for visitors.
4. \`index/documents-index.json\`: Real-time index for instant search and listing.

---

## ⚡ Core Features

- [x] Persistent S3 storage (AWS S3, MinIO, Cloudflare R2, LocalStack)
- [x] In-browser Markdown editor with live preview & toolbar
- [x] Secure public & unlisted shareable URLs
- [x] Drag & drop Markdown file import
- [x] Full-text search and tag filtering

---

## 🛠️ S3 Storage Configuration

To point Shareable to your live AWS S3 bucket, configure your \`.env.local\`:

\`\`\`bash
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=my-shareable-docs
\`\`\`

> **Note**: If AWS credentials are not set, Shareable seamlessly runs with a local S3-compatible backend in \`./data/s3-bucket/\` so you can develop locally with zero dependencies!
`,
      isPublic: true,
    },
    {
      title: 'Markdown Syntax & Formatting Cheatsheet',
      slug: 'markdown-syntax-cheatsheet',
      folder: 'Guides',
      tags: ['cheatsheet', 'formatting', 'reference'],
      content: `# Markdown Syntax & Formatting Cheatsheet

A quick reference for the most common GitHub Flavored Markdown (GFM) conventions supported in Shareable.

---

## Headers

\`\`\`markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
\`\`\`

## Text Styling

- **Bold text**: \`**bold**\` or \`__bold__\`
- *Italic text*: \`*italic*\` or \`_italic_\`
- ~~Strikethrough~~: \`~~strikethrough~~\`
- \`Inline code\`: \`\` \`code\` \`\`
- Quote block: \`> Blockquote text\`

## Code Blocks with Syntax Highlighting

\`\`\`typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function uploadDoc(bucket: string, id: string, markdown: string) {
  const s3 = new S3Client({ region: 'us-east-1' });
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: \`documents/\${id}.md\`,
    Body: markdown,
    ContentType: 'text/markdown; charset=utf-8',
  }));
}
\`\`\`

---

Click **New Document** in the top navigation bar to create your own!
`,
      isPublic: true,
    },
    {
      title: 'REST API Design Guidelines',
      slug: 'rest-api-design-guidelines',
      folder: 'Engineering',
      tags: ['api', 'standards', 'backend', 'architecture'],
      content: `# REST API Design Guidelines

Standards and conventions for designing robust, scalable RESTful services.

---

## 1. URL Conventions

- Use **nouns**, not verbs, for resource endpoints.
- Keep collection names plural: \`/api/documents\`, \`/api/users\`.
- Nest sub-resources logically: \`/api/documents/:id/tags\`.

### Endpoints Table

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| \`GET\` | \`/api/documents\` | List documents with search & filter |
| \`POST\` | \`/api/documents\` | Create a new document in S3 |
| \`GET\` | \`/api/documents/:id\` | Fetch document from S3 |
| \`PUT\` | \`/api/documents/:id\` | Update document in S3 |
| \`DELETE\` | \`/api/documents/:id\` | Remove document objects from S3 |
| \`GET\` | \`/api/share/:token\` | Fetch shared document by token |
`,
      isPublic: true,
    },
  ];

  const engine = getS3Engine();
  const now = new Date().toISOString();
  const summaries: DocumentSummary[] = [];

  for (const sample of samples) {
    const id = crypto.randomUUID();
    const shareToken = generateShareToken();

    const doc: Document = {
      id,
      slug: sample.slug,
      title: sample.title,
      content: sample.content,
      tags: sample.tags,
      folder: sample.folder,
      isPublic: sample.isPublic,
      shareToken,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Save markdown content in S3
    await engine.putObject(s3Keys.document(id), sample.content, 'text/markdown; charset=utf-8');

    // 2. Save metadata in S3
    await engine.putObject(
      s3Keys.metadata(id),
      JSON.stringify({ ...doc, content: undefined }),
      'application/json'
    );

    // 3. Save share pointer in S3
    await engine.putObject(
      s3Keys.share(shareToken),
      JSON.stringify({ id, slug: doc.slug }),
      'application/json'
    );

    summaries.push({
      id,
      slug: doc.slug,
      title: doc.title,
      excerpt: extractExcerpt(sample.content),
      tags: doc.tags,
      folder: doc.folder,
      isPublic: doc.isPublic,
      shareToken: doc.shareToken,
      viewCount: 0,
      wordCount: countWords(sample.content),
      readingTimeMinutes: calculateReadingTime(sample.content),
      createdAt: now,
      updatedAt: now,
    });
  }

  await engine.putObject(INDEX_KEY, JSON.stringify(summaries), 'application/json');
}

export async function getDocuments(filter: DocumentFilter = {}): Promise<DocumentSummary[]> {
  const index = await getIndex();
  let results = [...index];

  const { query, tag, folder, isPublic, sortBy = 'updated_desc' } = filter;

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    const matched: DocumentSummary[] = [];
    const pendingFullTextChecks: DocumentSummary[] = [];

    for (const doc of results) {
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchExcerpt = doc.excerpt.toLowerCase().includes(q);
      const matchFolder = doc.folder.toLowerCase().includes(q);
      const matchTags = doc.tags.some((t) => t.toLowerCase().includes(q));
      if (matchTitle || matchExcerpt || matchFolder || matchTags) {
        matched.push(doc);
      } else {
        pendingFullTextChecks.push(doc);
      }
    }

    if (pendingFullTextChecks.length > 0) {
      const engine = getS3Engine();
      const contentChecks = await Promise.all(
        pendingFullTextChecks.map(async (doc) => {
          const content = await engine.getObject(s3Keys.document(doc.id));
          return content && content.toLowerCase().includes(q) ? doc : null;
        })
      );
      for (const m of contentChecks) {
        if (m) matched.push(m);
      }
    }

    results = matched;
  }

  if (tag) {
    const targetTag = tag.toLowerCase().trim();
    results = results.filter((d) => d.tags.some((t) => t.toLowerCase() === targetTag));
  }

  if (folder) {
    const targetFolder = folder.toLowerCase().trim();
    results = results.filter((d) => d.folder.toLowerCase() === targetFolder);
  }

  if (typeof isPublic === 'boolean') {
    results = results.filter((d) => d.isPublic === isPublic);
  }

  results.sort((a, b) => {
    if (sortBy === 'created_desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'title_asc') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'views_desc') {
      return b.viewCount - a.viewCount;
    }
    // updated_desc
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return results;
}

export async function getDocumentById(id: string): Promise<Document | null> {
  await ensureStorageInitialized();
  const engine = getS3Engine();

  const [metaRaw, content] = await Promise.all([
    engine.getObject(s3Keys.metadata(id)),
    engine.getObject(s3Keys.document(id)),
  ]);

  if (!metaRaw) return null;

  try {
    const meta = JSON.parse(metaRaw);
    return {
      ...meta,
      content: content || '',
    };
  } catch (err) {
    console.error(`Failed to parse document ${id}:`, err);
    return null;
  }
}

export async function getDocumentByShareToken(token: string): Promise<Document | null> {
  await ensureStorageInitialized();
  const engine = getS3Engine();

  // Instant O(1) lookup via S3 share pointer
  const shareRaw = await engine.getObject(s3Keys.share(token));
  if (!shareRaw) return null;

  try {
    const { id } = JSON.parse(shareRaw);
    if (!id) return null;
    return getDocumentById(id);
  } catch {
    return null;
  }
}

export async function createDocument(input: CreateDocumentInput): Promise<Document> {
  await ensureStorageInitialized();
  const engine = getS3Engine();

  const id = crypto.randomUUID();
  const slug = generateSlug(input.title);
  const shareToken = generateShareToken();
  const now = new Date().toISOString();
  const title = input.title.trim() || 'Untitled Document';
  const content = input.content || '';
  const tags = input.tags || [];
  const folder = (input.folder || '').trim();
  const isPublic = input.isPublic !== false;

  const doc: Document = {
    id,
    slug,
    title,
    content,
    tags,
    folder,
    isPublic,
    shareToken,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Put document content in S3
  await engine.putObject(s3Keys.document(id), content, 'text/markdown; charset=utf-8');

  // 2. Put metadata in S3
  await engine.putObject(
    s3Keys.metadata(id),
    JSON.stringify({ ...doc, content: undefined }),
    'application/json'
  );

  // 3. Put share token in S3
  await engine.putObject(
    s3Keys.share(shareToken),
    JSON.stringify({ id, slug }),
    'application/json'
  );

  // 4. Update index in S3
  const index = await getIndex();
  const summary: DocumentSummary = {
    id,
    slug,
    title,
    excerpt: extractExcerpt(content),
    tags,
    folder,
    isPublic,
    shareToken,
    viewCount: 0,
    wordCount: countWords(content),
    readingTimeMinutes: calculateReadingTime(content),
    createdAt: now,
    updatedAt: now,
  };

  index.unshift(summary);
  await saveIndex(index);

  return doc;
}

export async function updateDocument(id: string, input: UpdateDocumentInput): Promise<Document | null> {
  const existing = await getDocumentById(id);
  if (!existing) return null;

  const engine = getS3Engine();
  const now = new Date().toISOString();

  const newTitle = input.title !== undefined ? input.title.trim() : existing.title;
  const newContent = input.content !== undefined ? input.content : existing.content;
  const newTags = input.tags !== undefined ? input.tags : existing.tags;
  const newFolder = input.folder !== undefined ? input.folder.trim() : existing.folder;
  const newIsPublic = input.isPublic !== undefined ? input.isPublic : existing.isPublic;
  const newSlug = input.slug !== undefined && input.slug.trim() ? input.slug.trim() : existing.slug;

  const updatedDoc: Document = {
    ...existing,
    title: newTitle,
    content: newContent,
    tags: newTags,
    folder: newFolder,
    isPublic: newIsPublic,
    slug: newSlug,
    updatedAt: now,
  };

  // 1. Update markdown content in S3 if changed
  if (input.content !== undefined) {
    await engine.putObject(s3Keys.document(id), newContent, 'text/markdown; charset=utf-8');
  }

  // 2. Update metadata in S3
  await engine.putObject(
    s3Keys.metadata(id),
    JSON.stringify({ ...updatedDoc, content: undefined }),
    'application/json'
  );

  // 3. Update index in S3
  const index = await getIndex();
  const idx = index.findIndex((d) => d.id === id);
  if (idx !== -1) {
    index[idx] = {
      ...index[idx],
      title: newTitle,
      excerpt: extractExcerpt(newContent),
      tags: newTags,
      folder: newFolder,
      isPublic: newIsPublic,
      slug: newSlug,
      wordCount: countWords(newContent),
      readingTimeMinutes: calculateReadingTime(newContent),
      updatedAt: now,
    };
    await saveIndex(index);
  }

  return updatedDoc;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const doc = await getDocumentById(id);
  if (!doc) return false;

  const engine = getS3Engine();

  // 1. Delete markdown, metadata, and share objects from S3
  await Promise.all([
    engine.deleteObject(s3Keys.document(id)),
    engine.deleteObject(s3Keys.metadata(id)),
    engine.deleteObject(s3Keys.share(doc.shareToken)),
  ]);

  // 2. Remove from index
  const index = await getIndex();
  const filtered = index.filter((d) => d.id !== id);
  await saveIndex(filtered);

  return true;
}

export async function regenerateShareToken(id: string): Promise<string | null> {
  const doc = await getDocumentById(id);
  if (!doc) return null;

  const engine = getS3Engine();
  const oldToken = doc.shareToken;
  const newToken = generateShareToken();

  // 1. Delete old share token object in S3
  await engine.deleteObject(s3Keys.share(oldToken));

  // 2. Put new share token object in S3
  await engine.putObject(
    s3Keys.share(newToken),
    JSON.stringify({ id, slug: doc.slug }),
    'application/json'
  );

  // 3. Update metadata in S3
  doc.shareToken = newToken;
  doc.updatedAt = new Date().toISOString();
  await engine.putObject(
    s3Keys.metadata(id),
    JSON.stringify({ ...doc, content: undefined }),
    'application/json'
  );

  // 4. Update index in S3
  const index = await getIndex();
  const idx = index.findIndex((d) => d.id === id);
  if (idx !== -1) {
    index[idx].shareToken = newToken;
    index[idx].updatedAt = doc.updatedAt;
    await saveIndex(index);
  }

  return newToken;
}

export async function incrementViewCount(shareToken: string): Promise<void> {
  const engine = getS3Engine();
  const shareRaw = await engine.getObject(s3Keys.share(shareToken));
  if (!shareRaw) return;

  try {
    const { id } = JSON.parse(shareRaw);
    const metaRaw = await engine.getObject(s3Keys.metadata(id));
    if (!metaRaw) return;

    const meta = JSON.parse(metaRaw);
    meta.viewCount = (meta.viewCount || 0) + 1;

    // Update metadata in S3
    await engine.putObject(s3Keys.metadata(id), JSON.stringify(meta), 'application/json');

    // Update in index
    const index = await getIndex();
    const idx = index.findIndex((d) => d.id === id);
    if (idx !== -1) {
      index[idx].viewCount = meta.viewCount;
      await saveIndex(index);
    }
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const docs = await getIndex();
  const tagCountMap: Record<string, number> = {};

  for (const doc of docs) {
    for (const tag of doc.tags) {
      const normalized = tag.toLowerCase().trim();
      if (normalized) {
        tagCountMap[normalized] = (tagCountMap[normalized] || 0) + 1;
      }
    }
  }

  return Object.entries(tagCountMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getAllFolders(): Promise<{ folder: string; count: number }[]> {
  const docs = await getIndex();
  const folderCountMap: Record<string, number> = {};

  for (const doc of docs) {
    const folder = doc.folder.trim();
    if (folder) {
      folderCountMap[folder] = (folderCountMap[folder] || 0) + 1;
    }
  }

  return Object.entries(folderCountMap)
    .map(([folder, count]) => ({ folder, count }))
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

export async function getRepositoryStats() {
  const docs = await getIndex();
  const tags = await getAllTags();
  const folders = await getAllFolders();

  const totalDocuments = docs.length;
  const sharedDocuments = docs.filter((d) => d.isPublic).length;
  const totalViews = docs.reduce((acc, d) => acc + (d.viewCount || 0), 0);

  return {
    totalDocuments,
    sharedDocuments,
    totalViews,
    tagsCount: tags.length,
    foldersCount: folders.length,
    storage: getStorageInfo(),
  };
}
