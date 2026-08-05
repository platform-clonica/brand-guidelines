import type { Metadata } from 'next';
import { DeckGallery } from '@/components/deck/gallery/DeckGallery';

export const metadata: Metadata = {
  title: 'Deck Maker · Interactius',
  robots: { index: false, follow: false },
};

// Landing: the deck gallery (search + tag filters + grid). The editor lives at /deck/[id].
export default function DeckPage() {
  return <DeckGallery />;
}
