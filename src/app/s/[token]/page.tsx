import { notFound } from 'next/navigation';
import { getDocumentByShareToken, incrementViewCount } from '@/lib/storage';
import SharedDocClient from './SharedDocClient';

interface SharedDocPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: SharedDocPageProps) {
  const { token } = await params;
  const doc = await getDocumentByShareToken(token);
  if (!doc) {
    return { title: 'Shared Document Not Found - Shareable' };
  }
  return {
    title: `${doc.title} - Shareable`,
    description: doc.content.slice(0, 160),
  };
}

export default async function SharedDocPage({ params }: SharedDocPageProps) {
  const { token } = await params;
  const doc = await getDocumentByShareToken(token);

  if (!doc) {
    notFound();
  }

  // Increment view count in S3
  await incrementViewCount(token);

  return <SharedDocClient document={doc} />;
}
