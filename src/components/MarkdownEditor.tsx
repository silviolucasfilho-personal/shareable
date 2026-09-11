'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  Split,
  Eye,
  Edit,
  Save,
  Clock,
  FileText,
  Copy,
  Check,
  Share2,
  Download,
  Folder,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import MarkdownRenderer from './MarkdownRenderer';
import TableOfContents from './TableOfContents';
import { countWords, calculateReadingTime } from '@/lib/utils';
import { Document } from '@/lib/types';

interface MarkdownEditorProps {
  initialDocument?: Document;
  onSave: (data: {
    title: string;
    content: string;
    tags: string[];
    folder: string;
    isPublic: boolean;
  }) => Promise<Document | null>;
  onOpenShare?: (doc: Document) => void;
}

export default function MarkdownEditor({
  initialDocument,
  onSave,
  onOpenShare,
}: MarkdownEditorProps) {
  const [title, setTitle] = useState(initialDocument?.title || '');
  const [content, setContent] = useState(initialDocument?.content || '');
  const [folder, setFolder] = useState(initialDocument?.folder || '');
  const [tags, setTags] = useState<string[]>(initialDocument?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(initialDocument?.isPublic ?? true);

  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedDoc, setSavedDoc] = useState<Document | undefined>(initialDocument);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set default view mode on mobile screens
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('edit');
    }
  }, []);

  // Update dirty state
  useEffect(() => {
    setIsSaved(false);
  }, [title, content, folder, tags, isPublic]);

  // Keyboard shortcut for Cmd/Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const doc = await onSave({
        title: title.trim() || 'Untitled Document',
        content,
        tags,
        folder: folder.trim(),
        isPublic,
      });
      if (doc) {
        setSavedDoc(doc);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const insertFormatting = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;

    const replacement = `${before}${selectedText}${after}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/^#/, '').toLowerCase();
      if (cleanTag && !tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'document'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = countWords(content);
  const readTime = calculateReadingTime(content);

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-neutral-50/50 dark:bg-neutral-950">
      {/* Top action / status bar */}
      <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to repository"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isSaving
                  ? 'bg-amber-500 animate-pulse'
                  : isSaved
                  ? 'bg-emerald-500'
                  : 'bg-neutral-400'
              }`}
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              {isSaving ? 'Saving...' : isSaved ? 'All changes saved' : 'Unsaved changes'}
            </span>
          </div>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <button
            onClick={() => setViewMode('edit')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'edit'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {savedDoc && onOpenShare && (
            <button
              onClick={() => onOpenShare(savedDoc)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Share</span>
            </button>
          )}

          <button
            onClick={handleCopyMarkdown}
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Copy raw markdown"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Download .md file"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Document metadata inputs: Title, Folder, Tags */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-6 pb-2 space-y-4">
        <input
          type="text"
          placeholder="Document Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-700"
        />

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Folder input */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <Folder className="w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Folder (optional)"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="bg-transparent border-none outline-none text-neutral-700 dark:text-neutral-300 w-32 placeholder-neutral-400"
            />
          </div>

          {/* Tags list & input */}
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <Tag className="w-3.5 h-3.5 text-neutral-400" />
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px]"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-red-500 transition-colors ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add tag + Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="bg-transparent border-none outline-none text-neutral-700 dark:text-neutral-300 w-28 placeholder-neutral-400 text-xs"
            />
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4 text-neutral-400 ml-auto text-[11px]">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{wordCount} words</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>~{readTime} min read</span>
            </span>
          </div>
        </div>
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-4 flex flex-col">
        {/* Formatting Toolbar (visible in edit or split mode) */}
        {viewMode !== 'preview' && (
          <div className="flex flex-wrap items-center gap-1 p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-t-2xl text-neutral-600 dark:text-neutral-300">
            <button
              type="button"
              onClick={() => insertLinePrefix('# ')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('## ')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('### ')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting('**', '**', 'bold text')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Bold (Cmd+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*', 'italic text')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Italic (Cmd+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`', '`', 'code')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Inline Code"
            >
              <Code className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <button
              type="button"
              onClick={() => insertLinePrefix('- ')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('1. ')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('- [ ] ')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Task List Checklist"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('> ')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Blockquote"
            >
              <Quote className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting('[', '](https://)', 'link title')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Insert Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('![', '](https://)', 'image description')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Insert Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                insertFormatting(
                  '\n| Column 1 | Column 2 |\n| :--- | :--- |\n| Item 1 | Value 1 |\n'
                )
              }
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Insert Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n---\n')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Horizontal Divider"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Pane */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 rounded-b-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden min-h-[550px]">
          {/* Editor Panel */}
          {viewMode !== 'preview' && (
            <div
              className={`bg-white dark:bg-neutral-900 p-4 flex flex-col ${
                viewMode === 'edit' ? 'md:col-span-2' : ''
              }`}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your markdown content here... # Headers, **bold**, lists, ```code```"
                className="w-full flex-1 p-2 font-mono text-sm leading-relaxed bg-transparent border-none outline-none resize-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 selection:bg-blue-100 dark:selection:bg-blue-900/60"
              />
            </div>
          )}

          {/* Preview Panel */}
          {viewMode !== 'edit' && (
            <div
              className={`bg-white dark:bg-neutral-900 p-6 sm:p-8 overflow-y-auto ${
                viewMode === 'preview' ? 'md:col-span-2' : ''
              }`}
            >
              {content.trim() ? (
                <MarkdownRenderer content={content} />
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-400 text-sm italic">
                  Markdown preview will render here in real time...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
