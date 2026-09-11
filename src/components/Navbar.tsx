'use client';

import React from 'react';
import Link from 'next/link';
import { Share2, Plus, Upload, BookOpen } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  onOpenUpload?: () => void;
  documentCount?: number;
}

export default function Navbar({ onOpenUpload, documentCount }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white">
                Shareable
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md">
                Repo
              </span>
            </div>
            {typeof documentCount === 'number' && (
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block -mt-0.5">
                {documentCount} {documentCount === 1 ? 'document' : 'documents'}
              </span>
            )}
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
              title="Import markdown documents"
            >
              <Upload className="w-4 h-4 text-neutral-500" />
              <span className="hidden sm:inline">Import .md</span>
            </button>
          )}

          <Link
            href="/doc/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Document</span>
          </Link>

          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
