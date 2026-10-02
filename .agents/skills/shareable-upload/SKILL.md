---
name: shareable-upload
description: Use when the user asks to upload, publish, share, or generate a shareable link for documents, Markdown files, HTML pages, RFCs, specs, runbooks, or notes to Shareable (https://main.d1yv1vn3p51ec7.amplifyapp.com). Triggers include "/shareable", "upload to shareable", "publish to shareable", "share on shareable", "create shareable link", "share document".
---

# Shareable Document Uploader

Uploads Markdown, HTML, and text documents directly to **Shareable** on production:
`https://main.d1yv1vn3p51ec7.amplifyapp.com`

---

## Quick Workflow

When the user asks to upload or share a document, follow these steps:

### 1. Identify Content and Metadata
- **File path or content**: If the user provides a file path (e.g., `README.md`, `specs/api.md`), use it directly. If the user provides raw text or wants to share content from the conversation, write it to a temporary markdown file or pipe it via stdin.
- **Folder / Category** *(optional)*: E.g., `Architecture`, `Docs`, `Notes`, `Guides`, `Reports`.
- **Tags** *(optional)*: E.g., `rfc`, `api`, `backend`, `guide`.
- **TTL / Expiration** *(optional)*:
  - Presets: `1h` (1 hour), `24h` (1 day), `7d` (1 week), `30d` (1 month), `never` (persistent).
  - Or custom duration (`15m`, `2w`) or ISO 8601 date.

### 2. Execute the Upload Script
Use the bundled CLI helper script located at [scripts/upload.sh](./scripts/upload.sh):

```bash
# Upload a single file
~/.gemini/config/skills/shareable-upload/scripts/upload.sh -f "path/to/document.md" -F "Documentation" -T "guide,api" --ttl "7d"

# Upload with custom title override
~/.gemini/config/skills/shareable-upload/scripts/upload.sh -f "notes.txt" -t "Q3 Roadmap Discussion" -F "Meetings"

# Pipe text directly from shell or cat
cat << 'EOF' | ~/.gemini/config/skills/shareable-upload/scripts/upload.sh -t "Incident Postmortem" -F "Incidents" --ttl "30d"
# Incident Postmortem - 2026-10-02
Summary of incident findings...
EOF
```

### 3. Alternative: Direct `curl` Upload
If invoking without the helper script, make a direct HTTP request to the API:

```bash
curl -s -X POST \
  -F "file=@path/to/document.md" \
  -F "folder=Documentation" \
  -F "tags=api,guide" \
  -F "ttl=7d" \
  https://main.d1yv1vn3p51ec7.amplifyapp.com/api/upload
```
*(For complete endpoint schemas, JSON payloads, and header options, consult [references/api.md](./references/api.md).)*

---

## 4. Report Results to User
Always format the response with the clickable links:

- **Share Link (Visitor)**: `https://main.d1yv1vn3p51ec7.amplifyapp.com/s/<shareToken>`
- **Document Link (Editor)**: `https://main.d1yv1vn3p51ec7.amplifyapp.com/doc/<id>`
- **Folder & Tags**: Display assigned category and tags.
- **Expiration / TTL**: State whether the document expires and when (e.g. `Expires in 7 days`).
