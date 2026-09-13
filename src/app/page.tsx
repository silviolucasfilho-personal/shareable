'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import DocumentCard from '@/components/DocumentCard';
import ShareModal from '@/components/ShareModal';
import UploadModal from '@/components/UploadModal';
import { Document, DocumentSummary } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import {
  Search,
  Folder,
  Tag,
  LayoutGrid,
  List,
  FileText,
  Share2,
  Globe,
  Lock,
  Plus,
  Upload,
  Clock,
  Eye,
  SlidersHorizontal,
  X,
  BookOpen,
  UserCheck,
  Users,
} from 'lucide-react';

export default function RepositoryDashboard() {
  const { user, signInWithGoogle } = useAuth();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [stats, setStats] = useState<{
    totalDocuments: number;
    sharedDocuments: number;
    totalViews: number;
    storage?: {
      type: string;
      bucket: string;
      region: string;
      isConfigured: boolean;
    };
  }>({ totalDocuments: 0, sharedDocuments: 0, totalViews: 0 });
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [folders, setFolders] = useState<{ folder: string; count: number }[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<'all' | 'mine' | 'shared'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [filterPublic, setFilterPublic] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<'updated_desc' | 'created_desc' | 'title_asc' | 'views_desc'>('updated_desc');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Modals
  const [sharingDoc, setSharingDoc] = useState<Document | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedScope !== 'all') params.set('scope', selectedScope);
      if (selectedTag) params.set('tag', selectedTag);
      if (selectedFolder) params.set('folder', selectedFolder);
      if (filterPublic !== null) params.set('isPublic', String(filterPublic));
      if (sortBy) params.set('sortBy', sortBy);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
        if (data.stats) setStats(data.stats);
        if (data.tags) setTags(data.tags);
        if (data.folders) setFolders(data.folders);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedScope, selectedTag, selectedFolder, filterPublic, sortBy]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        const input = document.getElementById('search-input') as HTMLInputElement;
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenShare = async (summary: DocumentSummary) => {
    try {
      const res = await fetch(`/api/documents/${summary.id}`);
      const data = await res.json();
      if (data.success && data.document) {
        setSharingDoc(data.document);
        setIsShareModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load doc for share:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDocuments();
      }
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedScope('all');
    setSelectedTag(null);
    setSelectedFolder(null);
    setFilterPublic(null);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedScope !== 'all' ||
    selectedTag ||
    selectedFolder ||
    filterPublic !== null
  );

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <Navbar
        onOpenUpload={() => setIsUploadModalOpen(true)}
        documentCount={stats.totalDocuments}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* S3 Storage Status Banner */}
        {stats.storage && (
          <div className="mb-6 px-4 py-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                <span>Storage Engine:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {stats.storage.type}
                </span>
                <span className="text-neutral-400 font-mono text-[11px]">
                  (bucket: {stats.storage.bucket})
                </span>
              </div>
            </div>
            <div className="text-neutral-500 dark:text-neutral-400">
              {stats.storage.isConfigured ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Connected to AWS S3 ({stats.storage.region})
                </span>
              ) : (
                <span>
                  Using S3-compatible storage. To connect to AWS S3, set <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">AWS_ACCESS_KEY_ID</code> in <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">.env.local</code>.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Repository Stats Header */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Total Documents</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-neutral-900 dark:text-white">
              {stats.totalDocuments}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Globe className="w-4 h-4 text-emerald-500" />
              <span>Publicly Shared</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-neutral-900 dark:text-white">
              {stats.sharedDocuments}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Eye className="w-4 h-4 text-indigo-500" />
              <span>Total Reader Views</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-neutral-900 dark:text-white">
              {stats.totalViews}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Folder className="w-4 h-4 text-amber-500" />
              <span>Folders & Tags</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-neutral-900 dark:text-white">
              {folders.length + tags.length}
            </div>
          </div>
        </div>

        {/* Content Layout with Sidebar & Main Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Quick Navigation filters */}
            <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl space-y-1">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-2">
                Views
              </div>

              {/* All Documents */}
              <button
                type="button"
                onClick={() => {
                  setSelectedScope('all');
                  setSelectedFolder(null);
                  setSelectedTag(null);
                  setFilterPublic(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  selectedScope === 'all' && !selectedFolder && !selectedTag && filterPublic === null
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  All Documents
                </span>
                <span>{stats.totalDocuments}</span>
              </button>

              {/* My Documents (for signed-in users) */}
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    signInWithGoogle();
                    return;
                  }
                  setSelectedScope('mine');
                  setSelectedFolder(null);
                  setSelectedTag(null);
                  setFilterPublic(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  selectedScope === 'mine'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  My Documents
                </span>
                {!user && <span className="text-[10px] text-neutral-400">Sign In</span>}
              </button>

              {/* Shared with Me */}
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    signInWithGoogle();
                    return;
                  }
                  setSelectedScope('shared');
                  setSelectedFolder(null);
                  setSelectedTag(null);
                  setFilterPublic(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  selectedScope === 'shared'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Shared with Me
                </span>
                {!user && <span className="text-[10px] text-neutral-400">Sign In</span>}
              </button>

              <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

              {/* Public in Repo */}
              <button
                type="button"
                onClick={() => {
                  setFilterPublic(true);
                  setSelectedScope('all');
                  setSelectedFolder(null);
                  setSelectedTag(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  filterPublic === true
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  Public Documents
                </span>
                <span>{stats.sharedDocuments}</span>
              </button>

              {/* Unlisted Links */}
              <button
                type="button"
                onClick={() => {
                  setFilterPublic(false);
                  setSelectedScope('all');
                  setSelectedFolder(null);
                  setSelectedTag(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  filterPublic === false
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  Unlisted Links
                </span>
                <span>{stats.totalDocuments - stats.sharedDocuments}</span>
              </button>
            </div>

            {/* Folders List */}
            {folders.length > 0 && (
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl space-y-2">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-2">
                  Folders
                </div>
                {folders.map(({ folder, count }) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => setSelectedFolder(selectedFolder === folder ? null : folder)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      selectedFolder === folder
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Folder className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{folder}</span>
                    </span>
                    <span className="text-[11px] opacity-70">{count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Tags Cloud */}
            {tags.length > 0 && (
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl space-y-3">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-2">
                  Tags
                </div>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {tags.map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        selectedTag === tag
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      <span>#{tag}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80">
              {/* Search input with shortcut badge */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search titles, full markdown body, or tags... (Press '/' to focus)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/80 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Controls: Sort and Layout View Switcher */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  <option value="updated_desc">Recently Updated</option>
                  <option value="created_desc">Recently Created</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="views_desc">Most Views</option>
                </select>

                <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                  <button
                    onClick={() => setViewLayout('grid')}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      viewLayout === 'grid'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewLayout('list')}
                    className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      viewLayout === 'list'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Pill Bar */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-neutral-400 font-medium">Filtering by:</span>
                {selectedScope !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                    {selectedScope === 'mine' ? 'My Documents' : 'Shared with Me'}
                    <button onClick={() => setSelectedScope('all')} className="hover:text-blue-900 ml-1">
                      ×
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                    &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => setSearchQuery('')} className="hover:text-blue-900 ml-1">
                      ×
                    </button>
                  </span>
                )}
                {selectedFolder && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                    Folder: {selectedFolder}
                    <button onClick={() => setSelectedFolder(null)} className="hover:text-amber-900 ml-1">
                      ×
                    </button>
                  </span>
                )}
                {selectedTag && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                    #{selectedTag}
                    <button onClick={() => setSelectedTag(null)} className="hover:text-indigo-900 ml-1">
                      ×
                    </button>
                  </span>
                )}
                {filterPublic !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                    {filterPublic ? 'Public only' : 'Unlisted only'}
                    <button onClick={() => setFilterPublic(null)} className="hover:text-neutral-900 ml-1">
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium ml-1 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Documents Content */}
            {loading ? (
              <div className="py-20 text-center text-neutral-400">
                <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">Loading documents...</p>
              </div>
            ) : documents.length > 0 ? (
              <div
                className={
                  viewLayout === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                    : 'flex flex-col gap-3'
                }
              >
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onShare={handleOpenShare}
                    onDelete={handleDelete}
                    onSelectTag={(t) => setSelectedTag(t)}
                    onSelectFolder={(f) => setSelectedFolder(f)}
                  />
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="py-16 px-4 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    No documents found
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                    {hasActiveFilters
                      ? 'No documents matched your filter criteria. Try adjusting or clearing your filters.'
                      : 'Get started by creating your first markdown document or importing existing files.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  {hasActiveFilters ? (
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-xs font-medium rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Import .md</span>
                      </button>
                      <Link
                        href="/doc/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Document</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Share Modal */}
      <ShareModal
        document={sharingDoc}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onUpdateDocument={() => {
          fetchDocuments();
        }}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          fetchDocuments();
        }}
      />
    </div>
  );
}
