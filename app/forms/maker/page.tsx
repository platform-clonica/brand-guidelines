import type { Metadata } from 'next';
import { FormGallery } from '@/components/forms/maker/FormGallery';

export const metadata: Metadata = {
  title: 'FormMakr',
  robots: { index: false, follow: false },
};

export default function FormMakerPage() {
  return <FormGallery />;
}
