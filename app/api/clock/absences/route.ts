/* GET    /api/clock/absences?from=&to=[&personId=] — las ausencias de un periodo.
   POST   /api/clock/absences — declarar una. Solo administración.
   DELETE /api/clock/absences?id= — quitarla. Solo administración.

   Una ausencia no lleva tipo médico, y no es un olvido: el motivo de una baja es dato de salud y no
   tiene por qué vivir en una herramienta que administración consulta a diario. Que conste el día no
   trabajado basta para el registro. La lista está en `ABSENCE_KINDS`. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { currentPerson, isClockAdmin } from '@/lib/auth/role';
import { buildAbsence, isUuid, parseRange } from '@/lib/clock/server';

export const dynamic = 'force-dynamic';

const soloAdmin = () =>
  NextResponse.json({ error: 'Solo administración puede tocar las ausencias.' }, { status: 403 });

export async function GET(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const url = new URL(req.url);
  const range = parseRange({ from: url.searchParams.get('from'), to: url.searchParams.get('to') });
  if (!range.ok) return NextResponse.json({ error: range.error }, { status: range.status });

  const sb = await supabaseAuthServer();

  /* `scope=team` para el panel de administración, igual que en los asientos: sin esto, un panel de
     ocho personas haría ocho peticiones. Y sin las ausencias del equipo, quien está de vacaciones
     aparecería con un defecto enorme en vez de con su día justificado.

     Quién ve qué lo sigue decidiendo la RLS, no este handler. */
  if (url.searchParams.get('scope') === 'team') {
    const { data, error } = await sb
      .from('clock_absences')
      .select('*')
      .lte('from_date', range.to)
      .gte('to_date', range.from)
      .order('from_date');
    if (error) return dbFail('clock/absences', error);

    return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
  }

  let personId = url.searchParams.get('personId');
  if (personId && !isUuid(personId)) {
    return NextResponse.json({ error: 'La persona pedida no es válida.' }, { status: 400 });
  }
  if (!personId) {
    const me = await currentPerson(sb);
    if (!me) return dbFail('clock/absences', { message: 'no se pudo resolver la ficha de la sesión' });
    personId = me.id;
  }

  /* Solapa con el periodo, no está contenida en él: unas vacaciones que empiezan en julio y acaban
     en agosto tienen que salir al pedir cualquiera de los dos meses. */
  const { data, error } = await sb
    .from('clock_absences')
    .select('*')
    .eq('person_id', personId)
    .lte('from_date', range.to)
    .gte('to_date', range.from)
    .order('from_date');
  if (error) return dbFail('clock/absences', error);

  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
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

  const absence = buildAbsence(body);
  if (!absence.ok) return NextResponse.json({ error: absence.error }, { status: absence.status });

  const sb = await supabaseAuthServer();
  if (!(await isClockAdmin(sb))) return soloAdmin();

  const { data, error } = await sb.from('clock_absences').insert(absence.row).select().single();
  if (error) return dbFail('clock/absences', error);

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const id = new URL(req.url).searchParams.get('id');
  if (!id || !isUuid(id)) return NextResponse.json({ error: 'No existe esa ausencia.' }, { status: 404 });

  const sb = await supabaseAuthServer();
  if (!(await isClockAdmin(sb))) return soloAdmin();

  /* Aquí SÍ se borra, y es la única tabla de la herramienta donde eso pasa: una ausencia es
     configuración del calendario, no un asiento. El libro de fichajes no tiene DELETE ni lo tendrá. */
  const { error } = await sb.from('clock_absences').delete().eq('id', id);
  if (error) return dbFail('clock/absences', error);

  return NextResponse.json({ ok: true });
}
