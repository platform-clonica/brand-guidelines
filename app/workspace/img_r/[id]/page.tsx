import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/sessionUser';
import { ImageBank } from '@/components/images/ImageBank';

export const metadata: Metadata = {
  title: 'IMGr · Imagen',
  robots: { index: false, follow: false },
};

// La galería con el detalle de una imagen abierto: el enlace que se pasa al equipo.
export default async function ImageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getSessionUser()]);
  return <ImageBank user={user} initialId={id} />;
}
