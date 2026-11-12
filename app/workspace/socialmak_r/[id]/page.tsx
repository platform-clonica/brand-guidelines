import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/sessionUser';
import { supabaseAuthServer } from '@/lib/supabase/server';
import { isUuid, type SocialPostRow } from '@/lib/social/server';
import { SocialStudio } from '@/components/social/SocialStudio';

export const metadata: Metadata = {
  title: 'Social Maker · Interactius',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/* El editor de una pieza. La fila se lee en el servidor y llega ya pintada:
   así no hay un parpadeo con la plantilla por defecto antes de que
   aparezca lo guardado. */
export default async function SocialEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const user = await getSessionUser();
  const sb = await supabaseAuthServer();
  const { data } = await sb
    .from('social_posts')
    .select('id, public_id, name, canvas, md, tags, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();

  const pieza = data as unknown as SocialPostRow;
  return (
    <SocialStudio
      user={user}
      postId={pieza.id}
      initialName={pieza.name}
      initialMd={pieza.md}
      initialCanvas={pieza.canvas}
    />
  );
}
