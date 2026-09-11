export interface Document {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  isPublic: boolean;
  shareToken: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  folder: string;
  isPublic: boolean;
  shareToken: string;
  viewCount: number;
  wordCount: number;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  tags?: string[];
  folder?: string;
  isPublic?: boolean;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  tags?: string[];
  folder?: string;
  isPublic?: boolean;
  slug?: string;
}

export interface DocumentFilter {
  query?: string;
  tag?: string;
  folder?: string;
  isPublic?: boolean;
  sortBy?: 'updated_desc' | 'created_desc' | 'title_asc' | 'views_desc';
}

export interface TOCItem {
  id: string;
  text: string;
  level: number;
}
