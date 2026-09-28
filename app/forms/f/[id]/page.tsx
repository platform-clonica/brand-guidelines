/* Public form page (RSC).

   Resuelve el segmento de la URL —el `id` opaco O la `slug` (lib/forms/slug.ts)— al formulario
   publicado; borrador o desconocido → 404, sin distinguirlos.

   Los metadatos salen de lib/forms/seo.ts, que separa las tres decisiones: compartir (siempre),
   indexar (`indexable`, por defecto no) y GEO (`ai_crawlers`, por defecto bloqueado). El defecto
   `noindex` del segmento lo declara app/forms/layout.tsx; aquí solo se pisa cuando toca.
   PRD §9, §10, §12. */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedForm } from '@/lib/forms/registry';
import { aiCrawlerMeta, formJsonLd, formPath, formUrl, shareDescription } from '@/lib/forms/seo';
import { HeroPanel } from '@/components/forms/HeroPanel';
import { FormRenderer } from '@/components/forms/FormRenderer';
import '@/components/forms/forms.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const def = await getPublishedForm(id);

  // Formulario inexistente o borrador: el 404 hereda el `noindex` del layout del segmento.
  if (!def) return { title: 'Formulario' };

  const title = def.title;
  const description = shareDescription(def);
  const url = formUrl(def);

  return {
    title,
    ...(description ? { description } : {}),
    /* La slug crea un segundo camino a la misma página. La canónica dice cuál es el bueno —
       la slug si la hay, el id si no— y evita que cuenten como dos páginas distintas. */
    alternates: { canonical: formPath(def) },
    robots: { index: def.indexable, follow: def.indexable },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url,
      type: 'website',
      /* La imagen del hero hace de imagen social. Si no hay, se hereda la de marca del layout
         raíz: un enlace sin imagen se despliega como un bloque de texto gris. */
      ...(def.background ? { images: [{ url: def.background }] } : {}),
    },
    twitter: {
      card: def.background ? 'summary_large_image' : 'summary',
      title,
      ...(description ? { description } : {}),
      ...(def.background ? { images: [def.background] } : {}),
    },
    other: aiCrawlerMeta(def),
  };
}

export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const def = await getPublishedForm(id);
  if (!def) notFound();

  const jsonLd = formJsonLd(def);

  return (
    <main className="ix-forms">
      {jsonLd && (
        <script
          type="application/ld+json"
          /* `<` escapado: el título y la descripción los escribe el autor, y un `</script>` en
             cualquiera de los dos cerraría la etiqueta antes de tiempo. */
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <HeroPanel def={def} />
      <FormRenderer def={def} />
    </main>
  );
}
