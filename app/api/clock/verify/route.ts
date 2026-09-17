/* GET /api/clock/verify[?personId=] — ¿la cadena de asientos de esta persona sigue intacta?

   El navegador NO rehace ningún hash: pregunta. El cálculo vive en `clock_verify_chain`, dentro de
   Postgres, porque un hash que calcula el cliente no prueba nada — quien lo calcula es quien lo
   puede falsificar. Ver docs/features/clock-r-plan.md, H4.

   Cero filas significa cadena intacta. Una fila es el PRIMER asiento que no cuadra, y a partir de
   ahí lo de después no dice nada: por eso se devuelve uno y no una lista. */

import { NextResponse } from 'next/server';
import { requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { currentPerson } from '@/lib/auth/role';
import { isUuid } from '@/lib/clock/server';
import type { ChainBreak } from '@/lib/clock/types';
import { rpcFail } from '../rpcError';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();

  let personId = new URL(req.url).searchParams.get('personId');
  if (personId && !isUuid(personId)) {
    return NextResponse.json({ error: 'La persona pedida no es válida.' }, { status: 400 });
  }
  if (!personId) {
    const me = await currentPerson(sb);
    if (!me) return NextResponse.json({ error: 'No se pudo resolver la ficha de la sesión.' }, { status: 500 });
    personId = me.id;
  }

  /* El permiso lo comprueba la propia función: lanza 42501 si no eres esa persona ni administración.
     Aquí no se repite esa decisión, para no tener dos sitios donde se define quién puede mirar. */
  const { data, error } = await sb.rpc('clock_verify_chain', { p_person_id: personId });
  if (error) return rpcFail('clock/verify', error);

  const roto = ((data ?? []) as ChainBreak[])[0] ?? null;

  return NextResponse.json(
    { intact: roto === null, break: roto },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
