'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Globe,
  Lock,
  Download,
  ShieldCheck,
  UserPlus,
  Trash2,
  Users,
  Shield,
  Edit3,
  Eye,
} from 'lucide-react';
import { Document, CollaboratorRole, Collaborator } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

interface ShareModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDocument?: (doc: Document) => void;
}

export default function ShareModal({ document: doc, isOpen, onClose, onUpdateDocument }: ShareModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(doc?.isPublic ?? true);
  const [shareToken, setShareToken] = useState(doc?.shareToken || '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Collaborator State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>(doc?.collaborators || []);

  useEffect(() => {
    if (doc) {
      setIsPublic(doc.isPublic);
      setShareToken(doc.shareToken);
      setCollaborators(doc.collaborators || []);
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

  const handleAddCollaborator = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInviteError('');

    const email = inviteEmail.toLowerCase().trim();
    if (!email || !email.includes('@')) {
      setInviteError('Please enter a valid email address.');
      return;
    }

    if (doc.ownerEmail && doc.ownerEmail.toLowerCase() === email) {
      setInviteError('This user is already the owner of this document.');
      return;
    }

    if (collaborators.some((c) => c.email.toLowerCase() === email)) {
      setInviteError('This person has already been invited.');
      return;
    }

    setIsInviting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addCollaborator',
          email,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (data.success && data.document) {
        setCollaborators(data.document.collaborators || []);
        setInviteEmail('');
        if (onUpdateDocument) {
          onUpdateDocument(data.document);
        }
      } else {
        setInviteError(data.error || 'Failed to invite collaborator.');
      }
    } catch (err) {
      console.error('Failed to add collaborator:', err);
      setInviteError('Network error while inviting collaborator.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (targetEmail: string) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeCollaborator',
          email: targetEmail,
        }),
      });

      const data = await res.json();
      if (data.success && data.document) {
        setCollaborators(data.document.collaborators || []);
        if (onUpdateDocument) {
          onUpdateDocument(data.document);
        }
      }
    } catch (err) {
      console.error('Failed to remove collaborator:', err);
    }
  };

  const isOwner =
    !doc.ownerEmail ||
    !user ||
    doc.ownerEmail.toLowerCase() === user.email.toLowerCase() ||
    (doc.ownerId && doc.ownerId === user.userId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[90vh] overflow-y-auto">
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
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Share with Specific People (Collaborator ACL) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Share with Specific People</span>
            </label>
            <span className="text-[11px] text-neutral-400">Google accounts</span>
          </div>

          {/* Add collaborator form */}
          {isOwner && (
            <form onSubmit={handleAddCollaborator} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="colleague@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteError) setInviteError('');
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as CollaboratorRole)}
                  className="px-2.5 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  <option value="viewer">Can view</option>
                  <option value="editor">Can edit</option>
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isInviting ? 'Adding...' : 'Invite'}</span>
                </button>
              </div>

              {inviteError && (
                <p className="text-[11px] text-red-500 dark:text-red-400">{inviteError}</p>
              )}
            </form>
          )}

          {/* People with access list */}
          <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 divide-y divide-neutral-100 dark:divide-neutral-800 max-h-44 overflow-y-auto">
            {/* Owner Entry */}
            <div className="flex items-center justify-between p-2.5 text-xs">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                  {(doc.ownerEmail || user?.email || 'O').charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate block">
                    {doc.ownerEmail || (user?.email ? `${user.email} (You)` : 'Document Owner')}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300">
                Owner
              </span>
            </div>

            {/* Collaborators */}
            {collaborators.length > 0 ? (
              collaborators.map((c) => (
                <div key={c.email} className="flex items-center justify-between p-2.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-semibold text-[10px]">
                      {c.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {c.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      c.role === 'editor'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}>
                      {c.role === 'editor' ? <Edit3 className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      <span>{c.role}</span>
                    </span>

                    {isOwner && (
                      <button
                        onClick={() => handleRemoveCollaborator(c.email)}
                        className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
                        title="Remove collaborator"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-neutral-400">
                No specific collaborators invited yet.
              </div>
            )}
          </div>
        </div>

        {/* 2. Public / Shareable Read-Only Link */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
            Public or Unlisted Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono text-neutral-800 dark:text-neutral-200 select-all outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
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

          {isOwner && (
            <button
              onClick={handleRegenerateToken}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 ml-auto"
              title="Revoke and generate a new token"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate Link</span>
            </button>
          )}
        </div>

        {/* 3. Visibility Setting */}
        {isOwner && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
              Repository Discoverability
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
                  <div className="text-xs font-semibold">Unlisted / Restricted</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Only accessible via direct link or invited accounts</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Security badge note */}
        <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl text-neutral-600 dark:text-neutral-400 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Invited editors can edit document content. Viewers and visitor link holders have read-only access.</span>
        </div>
      </div>
    </div>
  );
}
