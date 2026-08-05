/* Public form page (RSC). Resolves the opaque `id` → published form (draft/unknown → 404).
   noindex,nofollow via metadata (X-Robots-Tag header is also set in middleware). PRD §9, §10, §12. */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedForm } from '@/lib/forms/registry';
import { HeroPanel } from '@/components/forms/HeroPanel';
import { FormRenderer } from '@/components/forms/FormRenderer';
import '@/components/forms/forms.css';

export const dynamic = 'force-dynamic';

const NOINDEX = { index: false, follow: false } as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const def = await getPublishedForm(id);
  return {
    title: def ? def.title : 'Formulario',
    robots: NOINDEX,
  };
}

export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const def = await getPublishedForm(id);
  if (!def) notFound();

  return (
    <main className="ix-forms">
      <HeroPanel def={def} />
      <FormRenderer def={def} />
    </main>
  );
}
