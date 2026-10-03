import { notFound } from 'next/navigation';
import { getDocumentByShareToken, incrementViewCount } from '@/lib/storage';
import { getAuthenticatedUser } from '@/lib/amplify-server-utils';
import { canUserViewDocument } from '@/lib/permissions';
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
  const caller = await getAuthenticatedUser();
  const canView = canUserViewDocument(doc, caller?.email, caller?.userId);

  return {
    title: canView ? `${doc.title} - Shareable` : 'Private Document - Shareable',
    description: canView ? doc.content.slice(0, 160) : 'This document is private.',
  };
}

export default async function SharedDocPage({ params }: SharedDocPageProps) {
  const { token } = await params;
  const doc = await getDocumentByShareToken(token);

  if (!doc) {
    notFound();
  }

  const caller = await getAuthenticatedUser();
  const canView = canUserViewDocument(doc, caller?.email, caller?.userId);

  if (!canView) {
    return (
      <SharedDocClient
        document={{ ...doc, content: '' }}
        accessDenied={true}
      />
    );
  }

  // Increment view count in S3
  await incrementViewCount(token);

  return <SharedDocClient document={doc} accessDenied={false} />;
}
