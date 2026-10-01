import type { Metadata } from 'next';
import { ImageBank } from '@/components/images/ImageBank';

export const metadata: Metadata = {
  title: 'IMGr · Imagen',
  robots: { index: false, follow: false },
};

// La galería con el detalle de una imagen abierto: el enlace que se pasa al equipo.
export default async function ImageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ImageBank initialId={id} />;
}
