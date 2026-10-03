import { notFound } from 'next/navigation';
import { getDocumentById } from '@/lib/storage';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';
import { canUserViewDocument } from '@/lib/permissions';
import DocEditorClient from './DocEditorClient';

interface DocPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DocPageProps) {
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) {
    return { title: 'Document Not Found - Shareable' };
  }
  const caller = await getAuthenticatedUser();
  const canView = canUserViewDocument(doc, caller?.email, caller?.userId);

  return {
    title: canView ? `${doc.title} - Shareable` : 'Private Document - Shareable',
    description: canView ? doc.content.slice(0, 160) : 'This document is private.',
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { id } = await params;
  const doc = await getDocumentById(id);

  if (!doc) {
    notFound();
  }

  const caller = await getAuthenticatedUser();
  const canView = canUserViewDocument(doc, caller?.email, caller?.userId);

  if (!canView) {
    // Redact content completely so private data is never sent over the wire
    const redactedDoc = {
      ...doc,
      content: '',
    };
    return <DocEditorClient initialDocument={redactedDoc} accessDenied={true} />;
  }

  return <DocEditorClient initialDocument={doc} accessDenied={false} />;
}
