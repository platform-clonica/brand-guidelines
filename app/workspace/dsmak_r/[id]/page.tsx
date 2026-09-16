import type { Metadata } from 'next';
import { DsStudio } from '@/components/ds/DsStudio';

export const metadata: Metadata = {
  title: 'DSMakr · Editor',
  robots: { index: false, follow: false },
};

export default async function DsEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DsStudio systemId={id} />;
}
