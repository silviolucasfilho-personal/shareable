# Shareable Upload API Reference

This document provides complete technical specifications for uploading and sharing documents to **Shareable** on production:
**`https://main.d1yv1vn3p51ec7.amplifyapp.com`**

---

## 1. Upload Endpoint Overview

| Method | Path | Content-Types | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/upload` | N/A | Returns live endpoint status, schema, and usage documentation |
| `POST` | `/api/upload` | `multipart/form-data`, `text/markdown`, `text/html`, `text/plain`, `application/json` | Ingests and stores documents in S3 object storage |

---

## 2. Ingestion Methods

### A. Multipart Form-Data (Recommended for files)

```bash
curl -X POST \
  -F "file=@example.md" \
  -F "folder=Engineering" \
  -F "tags=architecture,rfc" \
  -F "ttl=7d" \
  https://main.d1yv1vn3p51ec7.amplifyapp.com/api/upload
```

#### Supported Form Fields:
- `files` / `file` / `document`: One or more files (`.md`, `.markdown`, `.html`, `.htm`, `.txt`).
- `title` *(optional)*: Custom title override.
- `folder` *(optional)*: Destination folder/category.
- `tags` *(optional)*: Comma-separated list of tags (e.g. `api,guide`).
- `ttl` *(optional)*: Time-To-Live expiration preset (e.g. `1h`, `24h`, `7d`, `30d`, `never`).
- `expiresAt` *(optional)*: Explicit ISO 8601 expiration date (e.g. `2026-10-15T00:00:00Z`).
- `isPublic` *(optional)*: `true` (default) for public listing or `false` for unlisted/restricted.

---

### B. Raw Markdown / HTML / Plain Text

Send the raw document content directly in the HTTP request body:

```bash
curl -X POST \
  -H "Content-Type: text/markdown" \
  -H "X-Title: System Design RFC" \
  -H "X-Folder: Architecture" \
  -H "X-Tags: rfc,backend" \
  -H "X-TTL: 30d" \
  --data-binary @design.md \
  https://main.d1yv1vn3p51ec7.amplifyapp.com/api/upload
```

#### Headers & Query Parameters:
- `X-Title` (or `?title=...`)
- `X-Folder` (or `?folder=...`)
- `X-Tags` (or `?tags=...`)
- `X-Filename` (or `?filename=...`)
- `X-TTL` (or `?ttl=...`)
- `X-Expires-At` (or `?expiresAt=...`)
- `?isPublic=true|false`

---

### C. JSON Payload

Ideal for programmatic uploads:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Onboarding Guide",
    "content": "# Welcome to the team!\n\nHere are the instructions...",
    "folder": "Guides",
    "tags": ["team", "onboarding"],
    "ttl": "24h"
  }' \
  https://main.d1yv1vn3p51ec7.amplifyapp.com/api/upload
```

Can also submit an array of objects to batch import multiple documents at once.

---

## 3. Metadata Auto-Extraction

When fields like `title`, `tags`, or `folder` are omitted, Shareable automatically infers them:

1. **YAML Frontmatter**:
   If the document starts with YAML frontmatter:
   ```yaml
   ---
   title: My Document
   folder: Projects
   tags: [v1, beta]
   ttl: 7d
   ---
   ```
2. **HTML Pages**:
   - Title is extracted from `<title>`, `<meta name="title">`, or the first `<h1>`.
   - Tags are extracted from `<meta name="keywords">`.
   - Category is extracted from `<meta name="folder">` or `<meta name="category">`.
   - HTML body is automatically cleaned (stripping `<script>` and `<style>`) and transformed into GitHub Flavored Markdown.
3. **Markdown Headings**:
   - First `# Header` is used as title if title is not specified.

---

## 4. Response Format

### Success (HTTP 201)

```json
{
  "success": true,
  "count": 1,
  "document": {
    "id": "87640710-375c-4f92-be89-84f57fbe86e0",
    "slug": "architecture-spec-a81k2",
    "title": "Architecture Spec",
    "tags": ["architecture", "rfc"],
    "folder": "Engineering",
    "isPublic": true,
    "shareToken": "SkbzXuqus30U",
    "viewCount": 0,
    "createdAt": "2026-10-02T19:08:51.810Z",
    "updatedAt": "2026-10-02T19:08:51.810Z",
    "expiresAt": "2026-10-09T19:08:51.810Z"
  },
  "url": "/doc/87640710-375c-4f92-be89-84f57fbe86e0",
  "shareUrl": "/s/SkbzXuqus30U"
}
```

- **Visitor Share Link**: `https://main.d1yv1vn3p51ec7.amplifyapp.com/s/<shareToken>`
- **Full View & Editor Link**: `https://main.d1yv1vn3p51ec7.amplifyapp.com/doc/<id>`

---

## 5. Quota & Expiration (TTL)

- **Free Users**: Can store up to **3 active documents**.
- **Admin** (`silviolucasfilho@gmail.com`): Unlimited documents.
- **TTL Auto-Purge**: Documents with an expiration date (`expiresAt`) are automatically purged from S3 and the document index once expired, immediately freeing up quota slots.
