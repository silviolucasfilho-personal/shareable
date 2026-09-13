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

