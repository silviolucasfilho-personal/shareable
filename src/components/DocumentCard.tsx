'use client';

import React from 'react';
import Link from 'next/link';
import { DocumentSummary } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  FileText,
  Share2,
  Folder,
  Eye,
  Clock,
  Globe,
  Lock,
  Download,
  Trash2,
  Edit3,
} from 'lucide-react';

interface DocumentCardProps {
  document: DocumentSummary;
  onShare: (doc: DocumentSummary) => void;
  onDelete: (id: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectFolder?: (folder: string) => void;
}

export default function DocumentCard({
  document: doc,
  onShare,
  onDelete,
  onSelectTag,
  onSelectFolder,
}: DocumentCardProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`/api/documents/${doc.id}`, '_blank');
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/90 dark:border-neutral-800/90 bg-white dark:bg-neutral-900 p-5 shadow-xs hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-150">
      <div>
        {/* Top bar: Folder, Status badge & Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 truncate">
            {doc.folder ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFolder?.(doc.folder);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors truncate cursor-pointer"
              >
                <Folder className="w-3 h-3 text-neutral-500 shrink-0" />
                <span className="truncate">{doc.folder}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                <FileText className="w-3.5 h-3.5" />
                <span>Markdown</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {doc.isPublic ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                title="Public in repository"
              >
                <Globe className="w-2.5 h-2.5" />
                <span>Public</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                title="Unlisted link only"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Unlisted</span>
              </span>
            )}

            <button
              onClick={() => onShare(doc)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Share document link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <Link href={`/doc/${doc.id}`} className="block group/link">
          <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-100 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors line-clamp-1">
            {doc.title}
          </h3>
          {/* Excerpt */}
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
            {doc.excerpt || 'No content preview available.'}
          </p>
        </Link>

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {doc.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTag?.(tag)}
                className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-[11px] transition-colors cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & Quick Actions */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px] text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Reading time">
            <Clock className="w-3 h-3 text-neutral-400" />
            <span>{doc.readingTimeMinutes} min</span>
          </span>
          {doc.viewCount > 0 && (
            <span className="flex items-center gap-1" title="Views">
              <Eye className="w-3 h-3 text-neutral-400" />
              <span>{doc.viewCount}</span>
            </span>
          )}
          <span>{formatRelativeTime(doc.updatedAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/doc/${doc.id}`}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Edit Document"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onDelete(doc.id)}
            className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title="Delete Document"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
