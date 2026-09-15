import type { Metadata } from 'next';
import { DsGallery } from '@/components/ds/DsGallery';

export const metadata: Metadata = {
  title: 'DSMakr',
  robots: { index: false, follow: false },
};

export default function DsMakerPage() {
  return <DsGallery />;
}
