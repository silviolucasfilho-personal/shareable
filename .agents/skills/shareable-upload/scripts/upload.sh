#!/usr/bin/env bash
# Shareable CLI Upload Helper
set -euo pipefail

BASE_URL="${SHAREABLE_URL:-https://main.d1yv1vn3p51ec7.amplifyapp.com}"
FILES=()
TITLE=""
FOLDER=""
TAGS=""
TTL=""
EXPIRES_AT=""
IS_PUBLIC="true"
OUTPUT_JSON=false

usage() {
  cat << 'EOF'
Shareable Upload CLI - Upload documents to Shareable

Usage:
  upload.sh [options] [file...]

Options:
  -f, --file <file>        File to upload (.md, .markdown, .html, .htm, .txt)
  -t, --title <title>      Override document title
  -F, --folder <folder>    Folder or category name
  -T, --tags <tags>        Comma-separated tags (e.g. "api,guide,rfc")
  -l, --ttl <duration>     Time-To-Live expiration (e.g. 1h, 24h, 7d, 30d, never)
  -e, --expires-at <iso>   Explicit ISO expiration date (e.g. 2026-10-15T00:00:00Z)
      --public             Make document public (default)
      --private            Make document restricted/unlisted
  -u, --url <url>          Shareable instance base URL (default: https://main.d1yv1vn3p51ec7.amplifyapp.com)
  -j, --json               Output raw JSON response
  -h, --help               Show this help message

Examples:
  upload.sh -f README.md -F "Documentation" -T "guide,overview"
  upload.sh -f spec.md -t "API Spec v2" --ttl 7d
  cat notes.md | upload.sh -t "Meeting Notes" -F "Meetings"
EOF
  exit 0
}

# Parse options
while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--file)
      FILES+=("$2")
      shift 2
      ;;
    -t|--title)
      TITLE="$2"
      shift 2
      ;;
    -F|--folder)
      FOLDER="$2"
      shift 2
      ;;
    -T|--tags)
      TAGS="$2"
      shift 2
      ;;
    -l|--ttl)
      TTL="$2"
      shift 2
      ;;
    -e|--expires-at)
      EXPIRES_AT="$2"
      shift 2
      ;;
    -p|--public)
      IS_PUBLIC="true"
      shift
      ;;
    --private)
      IS_PUBLIC="false"
      shift
      ;;
    -u|--url)
      BASE_URL="${2%/}"
      shift 2
      ;;
    -j|--json)
      OUTPUT_JSON=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      if [[ -f "$1" ]]; then
        FILES+=("$1")
        shift
      else
        echo "Unknown option or file not found: $1" >&2
        exit 1
      fi
      ;;
  esac
done

# If no files specified, check if stdin has data
TEMP_STDIN_FILE=""
if [[ ${#FILES[@]} -eq 0 ]]; then
  if [[ ! -t 0 ]]; then
    TEMP_STDIN_FILE="$(mktemp -t shareable-upload-XXXXXX.md)"
    cat > "$TEMP_STDIN_FILE"
    if [[ ! -s "$TEMP_STDIN_FILE" ]]; then
      echo "Error: Empty input received on stdin." >&2
      rm -f "$TEMP_STDIN_FILE"
      exit 1
    fi
    FILES+=("$TEMP_STDIN_FILE")
  else
    echo "Error: No files specified. Pass -f <file> or pipe content via stdin." >&2
    usage
  fi
fi

# Cleanup temp file on exit
trap '[[ -n "$TEMP_STDIN_FILE" && -f "$TEMP_STDIN_FILE" ]] && rm -f "$TEMP_STDIN_FILE"' EXIT

# Build curl form arguments
CURL_ARGS=()
for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "Error: File not found: $f" >&2
    exit 1
  fi
  CURL_ARGS+=(-F "files=@$f")
done

[[ -n "$TITLE" ]] && CURL_ARGS+=(-F "title=$TITLE")
[[ -n "$FOLDER" ]] && CURL_ARGS+=(-F "folder=$FOLDER")
[[ -n "$TAGS" ]] && CURL_ARGS+=(-F "tags=$TAGS")
[[ -n "$TTL" ]] && CURL_ARGS+=(-F "ttl=$TTL")
[[ -n "$EXPIRES_AT" ]] && CURL_ARGS+=(-F "expiresAt=$EXPIRES_AT")
[[ -n "$IS_PUBLIC" ]] && CURL_ARGS+=(-F "isPublic=$IS_PUBLIC")

API_URL="${BASE_URL%/}/api/upload"

# Perform request
HTTP_RESP=$(curl -s -w "\n%{http_code}" -X POST "${CURL_ARGS[@]}" "$API_URL")
HTTP_BODY=$(echo "$HTTP_RESP" | sed '$d')
HTTP_CODE=$(echo "$HTTP_RESP" | tail -n1)

if [[ "$OUTPUT_JSON" = true ]]; then
  echo "$HTTP_BODY"
  if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
    exit 1
  fi
  exit 0
fi

# Pretty format with Python
python3 - "$HTTP_BODY" "$HTTP_CODE" "$BASE_URL" << 'PYEOF'
import sys, json

body_str = sys.argv[1]
code_str = sys.argv[2]
base_url = sys.argv[3].rstrip('/')

try:
    data = json.loads(body_str)
except Exception:
    print(f"❌ Error (HTTP {code_str}):\n{body_str}")
    sys.exit(1)

if code_str not in ("200", "201") or not data.get("success"):
    err = data.get("error", "Unknown error")
    print(f"❌ Upload failed (HTTP {code_str}): {err}")
    if "currentCount" in data:
        print(f"   Quota: {data.get('currentCount')}/{data.get('maxDocuments')} documents")
    sys.exit(1)

count = data.get("count", 1)
docs = data.get("documents", [])
if not docs and data.get("document"):
    docs = [data["document"]]

print(f"✅ Successfully uploaded {count} document{'s' if count != 1 else ''} to Shareable!\n")

for i, doc in enumerate(docs, 1):
    title = doc.get("title", "Untitled")
    folder = doc.get("folder") or "None"
    tags = ", ".join(f"#{t}" for t in doc.get("tags", [])) if doc.get("tags") else "None"
    share_token = doc.get("shareToken", "")
    doc_id = doc.get("id", "")
    expires_at = doc.get("expiresAt")
    
    share_url = f"{base_url}/s/{share_token}" if share_token else "N/A"
    doc_url = f"{base_url}/doc/{doc_id}" if doc_id else "N/A"
    
    if len(docs) > 1:
        print(f"--- Document {i} ---")
    print(f"📄 Title:      {title}")
    print(f"📁 Folder:     {folder}")
    print(f"🏷️  Tags:       {tags}")
    if expires_at:
        print(f"⏳ Expires:    {expires_at}")
    else:
        print(f"⏳ TTL:        Persistent (Never)")
    print(f"🔗 Share URL:  {share_url}")
    print(f"📝 View/Edit:  {doc_url}")
    print()
PYEOF
