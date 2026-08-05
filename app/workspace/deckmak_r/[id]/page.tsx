import type { Metadata } from 'next';
import { DeckStudio } from '@/components/deck/DeckStudio';

export const metadata: Metadata = {
  title: 'Deck Maker · Interactius',
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

// Editor for a saved deck — loaded by id from the gallery. Outside the brand-guide chrome.
export default async function DeckEditPage({ params }: Props) {
  const { id } = await params;
  return <DeckStudio deckId={id} />;
}
