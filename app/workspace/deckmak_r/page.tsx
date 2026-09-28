import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/sessionUser';
import { DeckGallery } from '@/components/deck/gallery/DeckGallery';

export const metadata: Metadata = {
  title: 'Deck Maker · Interactius',
  robots: { index: false, follow: false },
};

// Landing: the deck gallery (search + tag filters + grid). The editor lives at /deck/[id].
export default async function DeckPage() {
  const user = await getSessionUser();
  return <DeckGallery user={user} />;
}
