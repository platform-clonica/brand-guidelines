/* GET  /api/clock/consent — ¿ha aceptado ya esta persona el aviso de protección de datos?
   POST /api/clock/consent — registrar la aceptación.

   COMO EL LIBRO DE ASIENTOS, ESTA TABLA SOLO ADMITE INSERCIONES: una aceptación no se reescribe, y
   si cambia el texto informativo sube `policy_version` y se vuelve a pedir. Por eso `authenticated`
   no tiene privilegio de insert y se escribe llamando a `clock_accept_policy`, que saca la persona
   de `auth.uid()` y la fecha de `now()`.

   Conceder el insert directo habría permitido escribir aceptaciones a nombre de otra persona y con
   la fecha que se quisiera, que es exactamente el dato que un aviso de protección de datos existe
   para poder demostrar.

   EL TEXTO LEGAL NO SE INVENTA AQUÍ. Esta ruta solo guarda qué versión se aceptó y cuándo; la
   redacción la aporta quien lleve lo legal. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { currentPerson } from '@/lib/auth/role';
import { rpcFail } from '../rpcError';

export const dynamic = 'force-dynamic';

export async function GET() {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  const me = await currentPerson(sb);
  if (!me) return dbFail('clock/consent', { message: 'no se pudo resolver la ficha de la sesión' });

  const { data, error } = await sb
    .from('clock_consents')
    .select('*')
    .eq('person_id', me.id)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return dbFail('clock/consent', error);

  return NextResponse.json(data ?? null, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body as { policyVersion?: unknown; policyHash?: unknown };
  const version = typeof input.policyVersion === 'string' ? input.policyVersion.trim() : '';
  const hash = typeof input.policyHash === 'string' ? input.policyHash.trim() : '';
  if (!version || !hash) {
    return NextResponse.json({ error: 'Falta la versión o el sello del aviso.' }, { status: 400 });
  }

  const sb = await supabaseAuthServer();

  /* Idempotente por versión: volver a pulsar devuelve la aceptación que ya había en vez de escribir
     otra. Lo resuelve la función, no esta ruta. */
  const { data, error } = await sb.rpc('clock_accept_policy', { p_version: version, p_hash: hash });
  if (error) return rpcFail('clock/consent', error);

  return NextResponse.json(data, { status: 201 });
}
