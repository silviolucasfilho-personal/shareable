'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Copy, Check, Trash2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ApiTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiTokenModal({ isOpen, onClose }: ApiTokenModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTokenStatus();
    } else {
      setGeneratedToken(null);
      setError(null);
    }
  }, [isOpen]);

  const fetchTokenStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tokens');
      const data = await res.json();
      if (data.success) {
        setHasToken(data.hasToken);
        setCreatedAt(data.createdAt);
      }
    } catch {
      setError('Failed to fetch API token status');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tokens', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.token) {
        setGeneratedToken(data.token);
        setHasToken(true);
        setCreatedAt(new Date().toISOString());
      } else {
        setError(data.error || 'Failed to generate token');
      }
    } catch {
      setError('Network error while generating token');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke your API token? Any CLI upload scripts using it will stop working.')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tokens', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setHasToken(false);
        setCreatedAt(null);
        setGeneratedToken(null);
      } else {
        setError(data.error || 'Failed to revoke token');
      }
    } catch {
      setError('Network error while revoking token');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Personal API Token
              </h3>
              <p className="text-[11px] text-neutral-500">
                Authenticate CLI and agent tools (Claude Code, Codex, scripts)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/60">
            {error}
          </div>
        )}

        {/* Generated Token Display (One-time) */}
        {generatedToken ? (
          <div className="space-y-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Copy your new API token now</span>
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
              This token will not be displayed again. Store it securely in your environment.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedToken}
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-mono text-neutral-900 dark:text-neutral-100 select-all outline-none"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        ) : hasToken ? (
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Active Token</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                Active
              </span>
            </div>
            {createdAt && (
              <p className="text-[11px] text-neutral-500">
                Created: {new Date(createdAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            No active API token found. Generate one to upload documents directly from your command line.
          </p>
        )}

        {/* Usage Instructions */}
        <div className="space-y-1.5 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
            How to use
          </span>
          <div className="bg-neutral-900 text-neutral-100 rounded-xl p-3 font-mono text-[11px] overflow-x-auto space-y-1">
            <p className="text-neutral-400"># Set token in your environment (e.g. ~/.zshrc)</p>
            <p className="text-emerald-400">export SHAREABLE_TOKEN=&quot;{generatedToken || 'shr_...'}&quot;</p>
            <p className="text-neutral-400 mt-2"># Upload documents via skill or CLI</p>
            <p>upload.sh -f README.md -F &quot;Docs&quot;</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
          {hasToken ? (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Revoke Token</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{hasToken ? 'Regenerate Token' : 'Generate Token'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
