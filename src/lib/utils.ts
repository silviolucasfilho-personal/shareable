import { TOCItem } from './types';

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return base ? `${base}-${randomSuffix}` : `doc-${randomSuffix}`;
}

export function generateShareToken(): string {
  // Unguessable alphanumeric 12-char token
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function countWords(text: string): number {
  return text
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function extractExcerpt(content: string, maxLength: number = 160): string {
  // Strip code blocks, headers, HTML tags, images, links syntax for a clean plain text excerpt
  const clean = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength).trim() + '...';
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoString);
  } catch {
    return isoString;
  }
}

export function extractHeadings(content: string): TOCItem[] {
  const items: TOCItem[] = [];

  // 1. Match Markdown headings (e.g. ## Heading)
  const mdHeadingRegex = /^(#{1,4})\s+(.+)$/gm;
  let match;

  while ((match = mdHeadingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-');
    items.push({ id, text, level });
  }

  // 2. Match HTML headings (e.g. <h1>Heading</h1>)
  const htmlHeadingRegex = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((match = htmlHeadingRegex.exec(content)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-');
    // Avoid duplicates if text already recorded
    if (!items.some((item) => item.text === text)) {
      items.push({ id, text, level });
    }
  }

  return items;
}

/**
 * Calculates an ISO expiration timestamp given a TTL string or ISO date string.
 * Supports presets ('1h', '24h', '1d', '7d', '30d', 'never'), duration units (s, m, h, d, w, mo, y),
 * numeric seconds, unix epoch timestamps, or valid future ISO dates.
 */
export function calculateExpiresAt(ttl?: string | null): string | null {
  if (!ttl) return null;
  const trimmed = ttl.trim().toLowerCase();
  if (['never', 'none', 'infinite', 'forever', '0', ''].includes(trimmed)) {
    return null;
  }

  // 1. Check relative duration string (e.g. "1h", "24h", "7d", "30d", "15m", "60s")
  const durationMatch = trimmed.match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|mo|month|months|y|year|years)$/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();

    let ms = 0;
    if (unit.startsWith('s') && !unit.startsWith('sec')) ms = value * 1000;
    else if (unit.startsWith('sec')) ms = value * 1000;
    else if (unit.startsWith('m') && !unit.startsWith('mo')) ms = value * 60 * 1000;
    else if (unit.startsWith('h')) ms = value * 60 * 60 * 1000;
    else if (unit.startsWith('d')) ms = value * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('w')) ms = value * 7 * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('mo')) ms = value * 30 * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('y')) ms = value * 365 * 24 * 60 * 60 * 1000;

    if (ms > 0) {
      return new Date(Date.now() + ms).toISOString();
    }
  }

  // 2. Check pure numeric input
  const num = Number(trimmed);
  if (!isNaN(num) && num > 0) {
    // If epoch timestamp in milliseconds (> 1000000000000)
    if (num > 1_000_000_000_000) {
      return new Date(num).toISOString();
    }
    // If epoch timestamp in seconds (> 1000000000)
    if (num > 1_000_000_000) {
      return new Date(num * 1000).toISOString();
    }
    // Otherwise treat as TTL duration in seconds
    return new Date(Date.now() + num * 1000).toISOString();
  }

  // 3. Check ISO 8601 or date string
  const parsedDate = new Date(ttl);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString();
  }

  return null;
}

/**
 * Checks if a document has passed its expiration date.
 */
export function isDocumentExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt).getTime();
  if (isNaN(exp)) return false;
  return exp <= Date.now();
}

/**
 * Formats the remaining time until expiration into a human-friendly string.
 * e.g. "45m", "18h", "6d", "Expired", or null if no expiration.
 */
export function formatExpiresIn(expiresAt?: string | null): string | null {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt).getTime();
  if (isNaN(exp)) return null;

  const diffMs = exp - Date.now();
  if (diffMs <= 0) return 'Expired';

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '< 1m';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}d`;
  return formatDate(expiresAt);
}


