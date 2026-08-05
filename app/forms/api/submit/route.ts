/* POST /forms/api/submit — persist one form response into the dedicated Forms Supabase project.
   Server-side revalidation is authoritative (PRD §8.4, §11.1): never trust the client. */

import { NextResponse } from 'next/server';
import { getPublishedForm } from '@/lib/forms/registry';
import { validateAnswers, normalizeAnswers } from '@/lib/forms/schema';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SubmitBody = { id?: string; answers?: Record<string, unknown>; hp?: string };

const MAX_PAYLOAD = 200_000; // ~200 KB — text answers only; reject oversized bodies (open endpoint).

export async function POST(req: Request) {
  // Reject oversized payloads early when the client declares a length.
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_PAYLOAD) {
    return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 });
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  // Honeypot: a bot filling the hidden field. Answer 200 so it can't tell it was rejected.
  if (body.hp) return NextResponse.json({ ok: true }, { status: 200 });

  const id = body.id?.trim();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const def = await getPublishedForm(id);
  if (!def) return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });

  const normalized = normalizeAnswers(def, body.answers ?? {});
  const result = validateAnswers(def, normalized);
  if (!result.ok) {
    return NextResponse.json({ error: 'Validación fallida', errors: result.errors }, { status: 400 });
  }

  const meta = {
    user_agent: req.headers.get('user-agent') ?? null,
    referer: req.headers.get('referer') ?? null,
    locale: req.headers.get('accept-language')?.split(',')[0] ?? null,
  };

  // Reuses the deck's Supabase project (anon key). RLS on `responses` allows anon INSERT only.
  const sb = supabaseServer();
  const { error } = await sb.from('responses').insert({
    form_id: def.id,
    form_slug: def.slug ?? null,
    form_version: def.version,
    answers: result.data,
    // (result.data holds the normalized, validated answers)
    meta,
  });
  if (error) return NextResponse.json({ error: 'No se pudo guardar la respuesta' }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
