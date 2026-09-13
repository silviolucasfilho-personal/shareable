# Shareable 📑 (Amazon S3 Edition)

**Shareable** is a modern full-stack markdown document repository powered by **Amazon S3** (and S3-compatible object stores such as Cloudflare R2, MinIO, and LocalStack). It allows teams and individuals to write, organize, search, and share markdown documents via secure, public or unlisted read-only links.

---

## 🪣 S3 Object Storage Architecture

All markdown documents and metadata are persisted directly in **Amazon S3**:

```
s3://<your-bucket>/
├── documents/
│   └── <id>.md                  # Pure raw Markdown document body
├── metadata/
│   └── <id>.json                # Document attributes, tags, folder, timestamps
├── shares/
│   └── <shareToken>.json        # O(1) direct share pointer for visitors
└── index/
    └── documents-index.json     # Document catalog for instant search & listing
```

### Supported Storage Backends
- **Amazon Web Services (AWS) S3**
- **Cloudflare R2**
- **MinIO** (Self-hosted S3)
- **Wasabi / DigitalOcean Spaces**
- **Local S3 Emulation** (built-in zero-dependency fallback for local development when AWS credentials are not set)

---

## ⚙️ S3 Configuration

To connect to your AWS S3 bucket, create a `.env.local` file:

```bash
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET_NAME=my-shareable-markdown-docs

# Optional: Custom S3 Endpoint (for MinIO, Cloudflare R2, LocalStack)
# S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
# S3_FORCE_PATH_STYLE=false
```

> **Note**: If credentials are not provided, Shareable automatically uses a local S3-compatible backend in `./data/s3-bucket/` with the exact same key hierarchy, so you can develop and test immediately without configuring AWS accounts first.

---

## 🌟 Key Features

- **In-Browser Markdown Editor & Live Preview**:
  - Real-time split-view editing with GitHub Flavored Markdown (GFM).
  - Rich formatting toolbar (H1-H3, Bold, Italic, Strikethrough, Code blocks, Lists, Checkboxes, Blockquotes, Tables, Links, Dividers).
  - Live word count, character count, and reading time estimation.
  - Keyboard shortcuts (`Cmd+S` / `Ctrl+S` to save).

- **Shareable Links & Access Control**:
  - Secure, unique, unguessable share tokens (e.g. `/s/:shareToken`).
  - Read-only visitor view with distraction-free typography and dynamic table of contents.
  - One-click link copying and token regeneration (to revoke previously shared links).
  - Public vs. Unlisted visibility toggles.
  - Export capabilities: Copy raw Markdown, Download `.md` file, or Print to PDF.

- **Full-Text Search & Organization**:
  - Instant search across document titles, tags, folders, and full markdown body in S3.
  - Quick search triggered with keyboard shortcut `/`.
  - Folder categorization and Tag cloud filters.
  - Sort by recently updated, creation date, title (A-Z), or reader view counts.

- **Import & File Upload**:
  - Drag-and-drop file upload for `.md`, `.markdown`, `.txt`, and HTML (`.html`, `.htm`) files.
  - Automatic HTML to Markdown conversion via Turndown, preserving rich formatting and tables.
  - Automatic YAML frontmatter and HTML `<title>` / `<meta>` extraction (`title`, `tags`, `folder`, `category`).
  - Automatic heading extraction for documents without explicit frontmatter.
  - Full native HTML rendering support in reader and preview via `rehype-raw` and LaTeX formulas via KaTeX.

---

## 🚀 Quick Start

### 1. Install & Run
```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the dashboard.

### 2. Production Build
```bash
npm run build
npm start
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents?q=&tag=&folder=&isPublic=&sortBy=` | List and search documents from S3 |
| `POST` | `/api/documents` | Create a new document in S3 |
| `GET` | `/api/documents/:id` | Fetch document and markdown from S3 |
| `PUT` | `/api/documents/:id` | Update document content and metadata in S3 |
| `DELETE` | `/api/documents/:id` | Remove document objects from S3 |
| `POST` | `/api/documents/:id/share` | Regenerate share token or toggle visibility |
| `GET` | `/api/share/:token` | Public view endpoint (increments view count in S3) |
| `GET` | `/api/upload` | Public upload API metadata and usage instructions |
| `POST` | `/api/upload` | Public document upload endpoint (supports multipart, raw Markdown/HTML, and JSON with CORS) |
| `OPTIONS` | `/api/upload` | CORS preflight handler for cross-origin uploads |

### 📤 Public Upload Endpoint Usage

The `/api/upload` endpoint is fully public and accepts documents in multiple formats:

1. **Multipart Form Upload** (`multipart/form-data`):
   ```bash
   # Markdown or HTML file
   curl -F "file=@notes.html" -F "folder=Guides" http://localhost:3000/api/upload
   ```
   Supports form fields: `file`, `files` (batch), or `document` (`.md`, `.markdown`, `.txt`, `.html`, `.htm`), plus optional `folder`, `title`, `tags`, and `isPublic`.

2. **Raw Markdown / HTML / Text Body** (`text/markdown`, `text/html`, or `text/plain`):
   ```bash
   # Raw Markdown
   curl -X POST http://localhost:3000/api/upload \
     -H "Content-Type: text/markdown" \
     -H "X-Title: My Document" \
     -H "X-Folder: Documentation" \
     --data "# Hello World\nUploaded directly via raw markdown."

   # Raw HTML
   curl -X POST http://localhost:3000/api/upload \
     -H "Content-Type: text/html" \
     -H "X-Title: Architecture Report" \
     --data-binary @report.html
   ```

3. **JSON Payload** (`application/json`):
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -H "Content-Type: application/json" \
     -d '{"title": "API Spec", "content": "# API Specification", "tags": ["api", "spec"], "folder": "Engineering"}'
   ```


---

## 📄 License
MIT
