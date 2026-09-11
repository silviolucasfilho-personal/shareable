import { notFound } from 'next/navigation';
import { getDocumentById } from '@/lib/storage';
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
  return {
    title: `${doc.title} - Shareable`,
    description: doc.content.slice(0, 160),
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { id } = await params;
  const doc = await getDocumentById(id);

  if (!doc) {
    notFound();
  }

  return <DocEditorClient initialDocument={doc} />;
}
