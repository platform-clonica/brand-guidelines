/* POST /api/clock/entries — fichar, o corregir un fichaje.
   GET  /api/clock/entries?from=&to=[&personId=] — los asientos de un periodo.

   Sesión de equipo: el 401 lo impone el middleware (EDITOR_API) y `requireUser` es el cinturón.
   Lo que se puede equivocar vive en lib/clock/server.ts, testeado en node.

   ESTA RUTA NO ESCRIBE EN LA TABLA. Escribe llamando a `clock_record`, que es la única puerta del
   libro de asientos: `authenticated` no tiene privilegio de insert sobre `clock_entries` ni hay
   política que lo permita. Y nunca usa la clave de servicio, que se saltaría la RLS y con ella la
   única garantía de que nadie reescribe un asiento. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { currentPerson } from '@/lib/auth/role';
import { buildRecordCall, isUuid, parseRange } from '@/lib/clock/server';
import { rpcFail } from '../rpcError';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const call = buildRecordCall(body);
  if (!call.ok) return NextResponse.json({ error: call.error }, { status: call.status });

  const sb = await supabaseAuthServer();

  // El alta es automática: quien ficha por primera vez no tiene que pedir que le den de alta.
  if (!(await currentPerson(sb))) {
    return dbFail('clock/entries', { message: 'no se pudo resolver la ficha de la sesión' });
  }

  /* `p_occurred_at` se OMITE cuando no hay hora, no se manda nulo.
     La función la declara `default now()`, y en una RPC pasar null explícito NO aplica el valor por
     defecto: insertaría NULL en una columna `not null`. Los otros tres sí pueden ir nulos, porque su
     valor por defecto es precisamente null. */
  const { p_occurred_at, ...sinHora } = call.params;
  const params = p_occurred_at === null ? sinHora : call.params;

  const { data, error } = await sb.rpc('clock_record', params);
  if (error) return rpcFail('clock/entries', error);

  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const url = new URL(req.url);
  const range = parseRange({ from: url.searchParams.get('from'), to: url.searchParams.get('to') });
  if (!range.ok) return NextResponse.json({ error: range.error }, { status: range.status });

  const sb = await supabaseAuthServer();

  /* `scope=team` no filtra por persona: lo alimenta el panel de administración, que necesita a todo
     el equipo en una sola petición en vez de una por cabeza.

     NO lleva comprobación de rol, y es deliberado: la política de lectura ya deja ver lo propio, o
     todo si es administración, así que un miembro que pida `scope=team` recibe exactamente sus
     filas. Devolver un 403 aquí significaría definir en dos sitios quién puede mirar, y el día que
     discreparan ganaría el más flojo. La comprobación vive donde protege los datos. */
  if (url.searchParams.get('scope') === 'team') {
    const { data, error } = await sb
      .from('clock_entries')
      .select('*')
      .gte('work_date', range.from)
      .lte('work_date', range.to)
      .order('person_id')
      .order('seq', { ascending: true });
    if (error) return dbFail('clock/entries', error);

    return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
  }

  /* Sin `personId` se leen los propios. Con él, quien decide si se puede es la RLS: la política de
     lectura deja ver lo propio o todo si es administración, así que una persona ajena no devuelve
     403 sino cero filas. Es deliberado: la comprobación vive donde protege los datos. */
  let personId = url.searchParams.get('personId');
  if (personId && !isUuid(personId)) {
    return NextResponse.json({ error: 'La persona pedida no es válida.' }, { status: 400 });
  }
  if (!personId) {
    const me = await currentPerson(sb);
    if (!me) return dbFail('clock/entries', { message: 'no se pudo resolver la ficha de la sesión' });
    personId = me.id;
  }

  const { data, error } = await sb
    .from('clock_entries')
    .select('*')
    .eq('person_id', personId)
    .gte('work_date', range.from)
    .lte('work_date', range.to)
    .order('seq', { ascending: true });
  if (error) return dbFail('clock/entries', error);

  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}
