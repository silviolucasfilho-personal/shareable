export interface DocumentAuthor {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
}

export type CollaboratorRole = 'viewer' | 'editor';

export interface Collaborator {
  email: string;
  role: CollaboratorRole;
  addedAt: string;
}

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
  ownerId?: string;
  ownerEmail?: string;
  collaborators?: Collaborator[];
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
  ownerId?: string;
  ownerEmail?: string;
  collaborators?: Collaborator[];
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  tags?: string[];
  folder?: string;
  isPublic?: boolean;
  ownerId?: string;
  ownerEmail?: string;
  collaborators?: Collaborator[];
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  tags?: string[];
  folder?: string;
  isPublic?: boolean;
  slug?: string;
  ownerId?: string;
  ownerEmail?: string;
  collaborators?: Collaborator[];
}

export interface DocumentFilter {
  query?: string;
  tag?: string;
  folder?: string;
  isPublic?: boolean;
  sortBy?: 'updated_desc' | 'created_desc' | 'title_asc' | 'views_desc';
  scope?: 'all' | 'mine' | 'shared';
  userEmail?: string;
  userId?: string;
}

export interface TOCItem {
  id: string;
  text: string;
  level: number;
}
