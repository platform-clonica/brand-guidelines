import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { SIGN_LIMIT, allowRequest, tooManyRequests } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

type SignBody = { deck_id?: string; signer_name?: string; signer_email?: string; signature_png?: string };

// POST /api/sign — a client signs the Acceptance page of a saved deck.
export async function POST(req: Request) {
  /* Público a propósito y sin ningún límite hasta ahora: cada POST aceptado era una fila en
     `signatures` con hasta 2 MB de PNG y un correo saliente por Resend. */
  if (!(await allowRequest(req, SIGN_LIMIT))) return tooManyRequests(SIGN_LIMIT);

  let body: SignBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const deck_id = body.deck_id?.trim();
  const signer_name = body.signer_name?.trim();
  const signer_email = body.signer_email?.trim();
  const signature_png = body.signature_png;
  if (!deck_id || !signer_name || !signer_email || !signature_png?.startsWith('data:image/')) {
    return NextResponse.json({ error: 'deck_id, signer_name, signer_email and signature_png are required' }, { status: 400 });
  }
  // The signature is a small PNG data URL; reject oversized payloads (open endpoint).
  if (signature_png.length > 2_000_000) {
    return NextResponse.json({ error: 'signature_png too large' }, { status: 413 });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const user_agent = req.headers.get('user-agent');

  const sb = supabaseServer();
  /* Confirm the deck exists. Por RPC porque `decks` dejó de ser legible con la clave anónima, y
     este endpoint es público a propósito. `deck_sign_target` devuelve solo `commercial_id`: antes
     se pedía además `contact_emails`, que no se usaba para nada. */
  const { data: deck, error: deckErr } = await sb
    .rpc('deck_sign_target', { p_id: deck_id }).maybeSingle<{ commercial_id: string }>();
  if (deckErr || !deck) return NextResponse.json({ error: 'Deck not found' }, { status: 404 });

  const { data, error } = await sb
    .from('signatures')
    .insert({ deck_id, signer_name, signer_email, signature_png, ip, user_agent })
    .select()
    .single();
  if (error) {
    console.error('[sign] insert failed', error.code, error.message);
    return NextResponse.json({ error: 'No se pudo registrar la firma' }, { status: 500 });
  }

  /* Aviso a Interactius. `void` y no `await`: el comentario anterior prometía que esto "never
     blocks", y el `await` lo desmentía — la respuesta al cliente que acaba de firmar no salía
     hasta que contestaba Resend, sin timeout. El `.catch` sigue garantizando que un fallo de
     correo no tumbe la firma, pero ahora deja rastro en vez de tragárselo en silencio. */
  void notify({ deckTitle: deck.commercial_id, signer_name, signer_email, signature_png, signed_at: data.signed_at })
    .catch((e) => console.error('[sign] notify failed', e));

  return NextResponse.json(data, { status: 201 });
}

async function notify(p: { deckTitle: string; signer_name: string; signer_email: string; signature_png: string; signed_at: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.INTERACTIUS_NOTIFY_EMAIL;
  if (!key || !to) {
    // Antes era un `return` mudo: se desplegaba sin avisos y nadie se enteraba.
    console.warn('[sign] Resend sin configurar — la firma se guarda pero no se notifica');
    return;
  }
  const from = process.env.RESEND_FROM ?? 'Interactius <onboarding@resend.dev>';
  const base64 = p.signature_png.split(',')[1] ?? '';
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

  /* Con timeout: sin él, un Resend colgado retenía la función de Netlify —y su facturación por
     milisegundo— indefinidamente. Y se comprueba la respuesta: `fetch` no lanza con un 422 por
     remitente sin verificar ni con un 401 por clave revocada, así que sin este `if` el código se
     comportaba exactamente igual cuando el correo salía y cuando no. */
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()).filter(Boolean),
      subject: `Firma recibida · ${p.deckTitle}`,
      html: `<div style="font-family:monospace;line-height:1.6">
        <p><strong>${esc(p.signer_name)}</strong> (${esc(p.signer_email)}) ha firmado la propuesta <strong>${esc(p.deckTitle)}</strong>.</p>
        <p>Fecha: ${esc(p.signed_at)}</p>
        <p>Firma adjunta.</p>
      </div>`,
      attachments: base64 ? [{ filename: 'firma.png', content: base64 }] : undefined,
    }),
  });
  if (!res.ok) {
    console.error('[sign] resend rechazó el aviso', res.status, await res.text().catch(() => ''));
  }
}
