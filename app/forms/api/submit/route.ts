/* POST /forms/api/submit — persist one form response into the dedicated Forms Supabase project.
   Server-side revalidation is authoritative (PRD §8.4, §11.1): never trust the client. */

import { NextResponse } from 'next/server';
import { getPublishedForm } from '@/lib/forms/registry';
import { validateAnswers, normalizeAnswers } from '@/lib/forms/schema';
import { supabaseServer } from '@/lib/supabase/server';
import { FORM_SUBMIT_LIMIT, allowRequest, tooManyRequests } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

type SubmitBody = { id?: string; answers?: Record<string, unknown>; hp?: string };

const MAX_PAYLOAD = 200_000; // ~200 KB — text answers only; reject oversized bodies (open endpoint).

export async function POST(req: Request) {
  /* Público a propósito y sin límite de frecuencia hasta ahora: el honeypot para a los bots
     triviales, y cualquier script que no rellene el campo oculto lo ignora. */
  if (!(await allowRequest(req, FORM_SUBMIT_LIMIT))) return tooManyRequests(FORM_SUBMIT_LIMIT);

  // Atajo barato para el cliente honrado que sí declara la longitud.
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_PAYLOAD) {
    return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 });
  }

  /* Y el tope de verdad, midiendo el cuerpo. Comprobar solo `content-length` era saltable con
     `Transfer-Encoding: chunked`: sin esa cabecera el valor por defecto es 0, la comparación es
     falsa y el cuerpo se leía entero. Medido en la auditoría: 400 KB, 1 MB, 4 MB y 8 MB aceptados
     donde el tope declarado son 200 KB. Ahora el límite es el mismo por los dos caminos. */
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: 'No se pudo leer la petición' }, { status: 400 });
  }
  if (raw.length > MAX_PAYLOAD) {
    return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 });
  }

  let body: SubmitBody;
  try {
    body = JSON.parse(raw) as SubmitBody;
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
