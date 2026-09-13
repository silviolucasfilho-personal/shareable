'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import MarkdownEditor from '@/components/MarkdownEditor';
import ShareModal from '@/components/ShareModal';
import { Document } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { Eye, ShieldAlert } from 'lucide-react';

interface DocEditorClientProps {
  initialDocument: Document;
}

export default function DocEditorClient({ initialDocument }: DocEditorClientProps) {
  const [doc, setDoc] = useState<Document>(initialDocument);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { user } = useAuth();

  const userEmail = user?.email?.toLowerCase();
  const isOwner =
    !doc.ownerEmail ||
    !userEmail ||
    doc.ownerEmail.toLowerCase() === userEmail ||
    (doc.ownerId && doc.ownerId === user?.userId);

  const collaboratorInfo = userEmail
    ? doc.collaborators?.find((c) => c.email.toLowerCase() === userEmail)
    : undefined;

  // Read-only if user is explicitly a viewer or not the owner/editor
  const isReadOnlyViewer = !isOwner && collaboratorInfo?.role === 'viewer';

  const handleSave = async (data: {
    title: string;
    content: string;
    tags: string[];
    folder: string;
    isPublic: boolean;
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
