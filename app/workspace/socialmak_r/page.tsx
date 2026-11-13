import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/sessionUser';
import { SocialGallery } from '@/components/social/gallery/SocialGallery';

export const metadata: Metadata = {
  title: 'Social Maker · Interactius',
  robots: { index: false, follow: false },
};

/* La lanzadera: la rejilla de piezas guardadas. El editor vive en
   /workspace/socialmak_r/[id], igual que el Deck Maker. */
export default async function SocialPage() {
  const user = await getSessionUser();
  return <SocialGallery user={user} />;
}
