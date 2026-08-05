import type { Metadata } from 'next';
import { FormStudio } from '@/components/forms/maker/FormStudio';

export const metadata: Metadata = {
  title: 'FormMakr · Editor',
  robots: { index: false, follow: false },
};

export default async function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormStudio formId={id} />;
}
