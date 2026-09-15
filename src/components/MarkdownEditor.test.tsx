import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import MarkdownEditor from './MarkdownEditor';
import type { Document } from '@/lib/types';

const existingDocument: Document = {
  id: 'document-1',
  slug: 'existing-document',
  title: 'Existing document',
  content: '# Preview content',
  tags: [],
  folder: '',
  isPublic: false,
  shareToken: 'share-token',
  viewCount: 0,
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
};

describe('MarkdownEditor initial view', () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  });

  it('opens an existing writable document in preview mode', () => {
    render(<MarkdownEditor initialDocument={existingDocument} onSave={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Preview content' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Write your markdown or HTML content here... # Headers, **bold**, <table>, ```code```, $$math$$')).not.toBeInTheDocument();
  });

  it('keeps an existing writable document in preview mode on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });

    render(<MarkdownEditor initialDocument={existingDocument} onSave={vi.fn()} />);

    expect(screen.queryByPlaceholderText('Write your markdown or HTML content here... # Headers, **bold**, <table>, ```code```, $$math$$')).not.toBeInTheDocument();
  });

  it('opens a new document in writing mode on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });

    render(<MarkdownEditor onSave={vi.fn()} />);

    expect(screen.getByPlaceholderText('Write your markdown or HTML content here... # Headers, **bold**, <table>, ```code```, $$math$$')).toBeInTheDocument();
  });
});
