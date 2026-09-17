/* GET    /api/clock/calendar?year= — los festivos del año. Los ve todo el equipo.
   POST   /api/clock/calendar — añadir uno. Solo administración.
   DELETE /api/clock/calendar?id= — quitarlo. Solo administración.

   Se cargan a mano una vez al año. El ámbito va en ASCII y minúscula (`nacional`, `cataluna`,
   `barcelona`), que es lo que declara el `check` de la tabla; la etiqueta con eñe es de la interfaz. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { isClockAdmin } from '@/lib/auth/role';
import { buildCalendarDay, isUuid } from '@/lib/clock/server';

export const dynamic = 'force-dynamic';

const soloAdmin = () =>
  NextResponse.json({ error: 'Solo administración puede tocar el calendario.' }, { status: 403 });

export async function GET(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const year = new URL(req.url).searchParams.get('year');
  if (!year || !/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: 'Hace falta el año, en cuatro cifras.' }, { status: 400 });
  }

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('clock_calendar_days')
    .select('*')
    .gte('day', `${year}-01-01`)
    .lte('day', `${year}-12-31`)
    .order('day');
  if (error) return dbFail('clock/calendar', error);

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

  const day = buildCalendarDay(body);
  if (!day.ok) return NextResponse.json({ error: day.error }, { status: day.status });

  const sb = await supabaseAuthServer();
  if (!(await isClockAdmin(sb))) return soloAdmin();

  const { data, error } = await sb.from('clock_calendar_days').insert(day.row).select().single();
  if (error) {
    // `unique (day, scope)`: ese festivo ya estaba puesto para ese ámbito.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ese día ya está declarado como festivo en ese ámbito.' }, { status: 409 });
    }
    return dbFail('clock/calendar', error);
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const id = new URL(req.url).searchParams.get('id');
  if (!id || !isUuid(id)) return NextResponse.json({ error: 'No existe ese festivo.' }, { status: 404 });

  const sb = await supabaseAuthServer();
  if (!(await isClockAdmin(sb))) return soloAdmin();

  const { error } = await sb.from('clock_calendar_days').delete().eq('id', id);
  if (error) return dbFail('clock/calendar', error);

  return NextResponse.json({ ok: true });
}
