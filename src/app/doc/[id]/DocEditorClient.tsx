'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import MarkdownEditor from '@/components/MarkdownEditor';
import ShareModal from '@/components/ShareModal';
import { Document } from '@/lib/types';

interface DocEditorClientProps {
  initialDocument: Document;
}

export default function DocEditorClient({ initialDocument }: DocEditorClientProps) {
  const [doc, setDoc] = useState<Document>(initialDocument);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleSave = async (data: {
    title: string;
    content: string;
    tags: string[];
    folder: string;
    isPublic: boolean;
  }): Promise<Document | null> => {
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
      <div className="flex-1 flex flex-col">
        <MarkdownEditor
          initialDocument={doc}
          onSave={handleSave}
          onOpenShare={() => setShareModalOpen(true)}
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
