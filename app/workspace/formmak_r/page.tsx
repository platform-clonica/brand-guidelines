import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/sessionUser';
import { FormGallery } from '@/components/forms/maker/FormGallery';

export const metadata: Metadata = {
  title: 'FormMakr',
  robots: { index: false, follow: false },
};

export default async function FormMakerPage() {
  const user = await getSessionUser();
  return <FormGallery user={user} />;
}
