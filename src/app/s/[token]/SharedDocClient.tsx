'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Document } from '@/lib/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import TableOfContents from '@/components/TableOfContents';
import ThemeToggle from '@/components/ThemeToggle';
import { formatDate, calculateReadingTime, countWords } from '@/lib/utils';
import {
  Share2,
  Copy,
  Check,
  Download,
  Printer,
  Calendar,
  Clock,
  Eye,
  Folder,
  Globe,
  ArrowLeft,
  FileText,
} from 'lucide-react';

interface SharedDocClientProps {
  document: Document;
}

export default function SharedDocClient({ document: doc }: SharedDocClientProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(doc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${doc.slug || 'document'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const readTime = calculateReadingTime(doc.content);
  const wordCount = countWords(doc.content);

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Visitor Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <Share2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
              Shareable
            </span>
            <span className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-md">
              Shared Document
            </span>
          </Link>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
              title="Copy markdown text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
              title="Download raw .md file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Print or Export to PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Main Document Body */}
          <article className="lg:col-span-3 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-3xl p-6 sm:p-10 shadow-xs">
            {/* Header Metadata */}
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-6 mb-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {doc.folder && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
                    <Folder className="w-3 h-3" />
                    <span>{doc.folder}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                  <Globe className="w-3 h-3" />
                  <span>Public View</span>
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {doc.title}
              </h1>

              {/* Tags */}
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta stats bar */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Updated {formatDate(doc.updatedAt)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{readTime} min read ({wordCount} words)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{doc.viewCount + 1} views</span>
                </span>
              </div>
            </div>

            {/* Markdown Content */}
            <MarkdownRenderer content={doc.content} />
          </article>

          {/* Sticky Table of Contents on Desktop */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="sticky top-24">
              <TableOfContents content={doc.content} />

              <div className="mt-6 p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 space-y-2">
                <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                  About Shareable
                </div>
                <p>
                  This document is published via <strong>Shareable</strong>, a modern markdown repository for organizing and sharing documents.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium hover:underline pt-1"
                >
                  Visit Repository
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800/80 py-8 text-center text-xs text-neutral-400">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <span>Published with Shareable Document Repository</span>
          <Link href="/" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}
