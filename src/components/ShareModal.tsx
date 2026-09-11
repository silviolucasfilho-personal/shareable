'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, RefreshCw, Globe, Lock, Download, ShieldCheck } from 'lucide-react';
import { Document } from '@/lib/types';

interface ShareModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDocument?: (doc: Document) => void;
}

export default function ShareModal({ document: doc, isOpen, onClose, onUpdateDocument }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(doc?.isPublic ?? true);
  const [shareToken, setShareToken] = useState(doc?.shareToken || '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (doc) {
      setIsPublic(doc.isPublic);
      setShareToken(doc.shareToken);
      if (typeof window !== 'undefined') {
        setShareUrl(`${window.location.origin}/s/${doc.shareToken}`);
      }
    }
  }, [doc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleVisibility = async (newPublic: boolean) => {
    setIsPublic(newPublic);
    try {
      const res = await fetch(`/api/documents/${doc.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: newPublic }),
      });
      const data = await res.json();
      if (data.success && data.document && onUpdateDocument) {
        onUpdateDocument(data.document);
      }
    } catch (err) {
      console.error('Failed to update visibility:', err);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerating will revoke previous shared links to this document. Continue?')) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      });
      const data = await res.json();
      if (data.success && data.shareToken) {
        setShareToken(data.shareToken);
        const newUrl = `${window.location.origin}/s/${data.shareToken}`;
        setShareUrl(newUrl);
        if (onUpdateDocument) {
          onUpdateDocument({ ...doc, shareToken: data.shareToken });
        }
      }
    } catch (err) {
      console.error('Failed to regenerate token:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${doc.slug || 'document'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Share Document
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-sm">
              {doc.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share Link Field */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            Shareable Read-Only Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-800 dark:text-neutral-200 select-all outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick link action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </a>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>

          <button
            onClick={handleRegenerateToken}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 ml-auto"
            title="Revoke and generate a new token"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Link</span>
          </button>
        </div>

        {/* Visibility Setting */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
            Access & Discoverability
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleToggleVisibility(true)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                isPublic
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold">Public in Repo</div>
                <div className="text-[11px] opacity-75 mt-0.5">Listed in dashboard & searchable by anyone</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleToggleVisibility(false)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                !isPublic
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold">Unlisted Link</div>
                <div className="text-[11px] opacity-75 mt-0.5">Hidden from index, only accessible via direct link</div>
              </div>
            </button>
          </div>
        </div>

        {/* Security badge note */}
        <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl text-neutral-600 dark:text-neutral-400 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Shared visitors only have read-only access. Only you can edit or delete this document.</span>
        </div>
      </div>
    </div>
  );
}
