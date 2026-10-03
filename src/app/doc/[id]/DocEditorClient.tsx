'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MarkdownEditor from '@/components/MarkdownEditor';
import ShareModal from '@/components/ShareModal';
import { Document } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { isDocumentOwner, isDocumentCollaborator, canUserViewDocument } from '@/lib/permissions';
import { Eye, Lock, ArrowLeft, LogIn } from 'lucide-react';

interface DocEditorClientProps {
  initialDocument: Document;
  accessDenied?: boolean;
}

export default function DocEditorClient({ initialDocument, accessDenied = false }: DocEditorClientProps) {
  const [doc, setDoc] = useState<Document>(initialDocument);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { user, signInWithGoogle } = useAuth();

  const userEmail = user?.email?.toLowerCase();
  const userId = user?.userId;

  // Authorization checks
  const isOwner = Boolean(userEmail) && isDocumentOwner(doc, userEmail, userId);
  const collaboratorInfo = isDocumentCollaborator(doc, userEmail);
  const isCollaborator = collaboratorInfo.isCollaborator;
  const canEdit = isOwner || (isCollaborator && collaboratorInfo.role === 'editor');
  const isReadOnlyViewer = !canEdit;

  const hasAccess = doc.isPublic || canUserViewDocument(doc, userEmail, userId);

  // If access is denied (private document with unauthorized caller)
  if (accessDenied || !hasAccess) {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full px-4">
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xl space-y-6 w-full text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Private Document</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                This document is private. Access is restricted to the owner and invited collaborators only.
                {doc.ownerEmail && (
                  <span className="block mt-2 font-mono text-[11px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 py-1 px-2 rounded-lg">
                    Owner: {doc.ownerEmail}
                  </span>
                )}
              </p>
            </div>

            {!user ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Please sign in with your authorized Google account to view this document.
                </p>
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-md cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Signed in as <strong className="text-neutral-700 dark:text-neutral-200">{user.email}</strong>. This account does not have permission to access this document.
                </p>
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-medium text-sm transition-colors shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Dashboard</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async (data: {
    title: string;
    content: string;
    tags: string[];
    folder: string;
    isPublic: boolean;
    ttl?: string | null;
    expiresAt?: string | null;
  }): Promise<Document | null> => {
    if (isReadOnlyViewer) {
      alert('You have read-only permissions for this document.');
      return null;
    }

    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (json.success && json.document) {
        setDoc(json.document);
        return json.document;
      }
      return null;
    } catch (err) {
      console.error('Failed to update document:', err);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col">
      <Navbar />

      {/* View-only banner for invited viewers */}
      {isReadOnlyViewer && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>View-Only Mode:</strong> You have been granted read-only access to this document by{' '}
            {doc.ownerEmail || 'the owner'}.
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <MarkdownEditor
          initialDocument={doc}
          onSave={handleSave}
          onOpenShare={() => setShareModalOpen(true)}
          readOnly={isReadOnlyViewer}
        />
      </div>

      <ShareModal
        document={doc}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onUpdateDocument={(updated) => setDoc(updated)}
      />
    </div>
  );
}
