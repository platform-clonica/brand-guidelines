import type { Metadata } from 'next';
import { SocialStudio } from '@/components/social/SocialStudio';

export const metadata: Metadata = {
  title: 'Social Maker · Interactius',
  robots: { index: false, follow: false },
};

/* El editor de imágenes para redes. Vive junto al resto de herramientas del
   workspace y comparte con el Deck Maker el motor de markdown y el cromo,
   pero no los layouts: ver la cabecera de lib/social/types.ts. */
export default function SocialPage() {
  return <SocialStudio />;
}
