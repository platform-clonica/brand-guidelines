/* GET /api/clock/export?personId=&from=&to= — el registro de una persona en CSV.

   Descarga directa, no JSON: el navegador la guarda como fichero. Es lo que se le manda a la
   asesoría laboral, y lo que se imprime el día que lo pida la Inspección.

   EL PDF NO SE GENERA AQUÍ, y no es un olvido. La fase de export en servidor con Puppeteer del
   visor de presentaciones nunca se construyó (docs/features/deck-export-visor.md: «sigue
   pendiente») y `@sparticuz/chromium` no es dependencia del proyecto. Añadirla son ~50 MB de
   bundle, arranque en frío y riesgo de timeout en Netlify. El patrón del repo para PDF es imprimir
   desde una página limpia, que sale vectorial y con las fuentes reales: ver
   /workspace/clock_r/equipo/[personId]/imprimir.

   Quién puede leer qué lo sigue decidiendo la RLS, como en el resto de lecturas. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { currentPerson } from '@/lib/auth/role';
import { isUuid, parseRange } from '@/lib/clock/server';
import { compileRange } from '@/lib/clock/compile';
import type { ScheduleTramo } from '@/lib/clock/calendar';
import { toCSV } from '@/lib/clock/export';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const url = new URL(req.url);
  const range = parseRange({ from: url.searchParams.get('from'), to: url.searchParams.get('to') });
  if (!range.ok) return NextResponse.json({ error: range.error }, { status: range.status });

  const sb = await supabaseAuthServer();

  let personId = url.searchParams.get('personId');
  if (personId && !isUuid(personId)) {
    return NextResponse.json({ error: 'La persona pedida no es válida.' }, { status: 400 });
  }
  if (!personId) {
    const me = await currentPerson(sb);
    if (!me) return dbFail('clock/export', { message: 'no se pudo resolver la ficha de la sesión' });
    personId = me.id;
  }

  const [entradas, personas, ausencias, festivos] = await Promise.all([
    sb.from('clock_entries').select('*').eq('person_id', personId)
      .gte('work_date', range.from).lte('work_date', range.to).order('seq'),
    sb.from('clock_people').select('id, display_name, schedules'),
    sb.from('clock_absences').select('from_date, to_date').eq('person_id', personId)
      .lte('from_date', range.to).gte('to_date', range.from),
    sb.from('clock_calendar_days').select('day')
      .gte('day', range.from).lte('day', range.to),
  ]);

  for (const r of [entradas, personas, ausencias, festivos]) {
    if (r.error) return dbFail('clock/export', r.error);
  }

  const rows = entradas.data ?? [];
  const persona = (personas.data ?? []).find((p) => p.id === personId);

  /* `supersededIds` sale de compilar el periodo: es lo que permite marcar qué asientos ya no
     cuentan sin quitarlos del fichero. Un CSV que solo llevara los vigentes no podría explicar por
     qué cambió una hora. */
  const rango = compileRange(rows, {
    from: range.from,
    to: range.to,
    schedules: Array.isArray(persona?.schedules) ? (persona.schedules as ScheduleTramo[]) : [],
    absences: (ausencias.data ?? []).map((a) => ({ fromDate: a.from_date, toDate: a.to_date })),
    holidays: (festivos.data ?? []).map((f) => f.day),
  });

  const superseded = new Set(rango.days.flatMap((d) => d.day.supersededIds));
  const nombres = Object.fromEntries((personas.data ?? []).map((p) => [p.id, p.display_name]));

  const csv = toCSV(rows, { nombres, supersededIds: superseded });
  const nombre = (persona?.display_name ?? 'registro').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clock-${nombre}-${range.from}-${range.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
