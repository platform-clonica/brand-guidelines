import type { Metadata } from 'next';
import { ImageBank } from '@/components/images/ImageBank';

export const metadata: Metadata = {
  title: 'IMGr',
  robots: { index: false, follow: false },
};

// IMG_r: el banco de imágenes del equipo. El detalle de una imagen vive en /workspace/img_r/[id].
export default function ImageBankPage() {
  return <ImageBank />;
}
