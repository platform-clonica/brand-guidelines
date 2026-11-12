import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/sessionUser';
import { SocialStudio } from '@/components/social/SocialStudio';

export const metadata: Metadata = {
  title: 'Social Maker · Interactius',
  robots: { index: false, follow: false },
};

/* El editor de imágenes para redes. Vive junto al resto de herramientas del
   workspace y comparte con el Deck Maker el motor de markdown y el cromo,
   pero no los layouts: ver la cabecera de lib/social/types.ts.

   Lee la sesión para que la barra lleve el menú de usuario, igual que las
   demás herramientas. */
export default async function SocialPage() {
  const user = await getSessionUser();
  return <SocialStudio user={user} />;
}
