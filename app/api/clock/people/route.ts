/* GET   /api/clock/people — el equipo. La RLS devuelve la ficha propia, o todas si es administración.
   PATCH /api/clock/people — jornada teórica y rol. Solo administración.

   EL ROL SE COMPRUEBA EN SERVIDOR, no se confía en que la pantalla no se pinte. La RLS ya lo impide
   por su lado —la política de escritura exige `clock_is_admin()`— pero sin esta comprobación la
   respuesta sería «se actualizaron 0 filas», que parece un fallo en vez de una negativa. Las dos
   capas: una protege los datos y la otra lo explica. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { currentPerson, isClockAdmin } from '@/lib/auth/role';
import { buildRolePatch, buildSchedulesPatch, isUuid } from '@/lib/clock/server';

export const dynamic = 'force-dynamic';

const LIST_COLUMNS = 'id, email, display_name, role, status, schedules, started_on, ended_on';

export async function GET() {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  // Al entrar por primera vez, la ficha se crea aquí: el alta es automática y con jornada por defecto.
  if (!(await currentPerson(sb))) {
    return dbFail('clock/people', { message: 'no se pudo resolver la ficha de la sesión' });
  }

  const { data, error } = await sb.from('clock_people').select(LIST_COLUMNS).order('display_name');
  if (error) return dbFail('clock/people', error);

  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body as { personId?: unknown; schedules?: unknown; role?: unknown; status?: unknown };
  if (typeof input.personId !== 'string' || !isUuid(input.personId)) {
    return NextResponse.json({ error: 'Falta la persona a la que cambiar la jornada o el rol.' }, { status: 400 });
  }

  /* La baja de una persona NO entra todavía. Desactivar al último administrador deja el equipo sin
     ninguno igual que degradarlo, y la guarda que tengo probada solo cubre el rol: meter aquí el
     `status` sería escribir lógica de permisos sin un test que la haya visto fallar, justo en la
     ruta que decide quién manda. Va en su propio ciclo. */
  if (input.status !== undefined) {
    return NextResponse.json({ error: 'Dar de baja a una persona todavía no está disponible.' }, { status: 400 });
  }

  const sb = await supabaseAuthServer();
  if (!(await isClockAdmin(sb))) {
    return NextResponse.json({ error: 'Solo administración puede cambiar la jornada o el rol.' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};

  if (input.schedules !== undefined) {
    const schedules = buildSchedulesPatch({ schedules: input.schedules });
    if (!schedules.ok) return NextResponse.json({ error: schedules.error }, { status: schedules.status });
    patch.schedules = schedules.schedules;
  }

  if (input.role !== undefined) {
    /* Cuántos administradores activos hay y si esta persona es uno: se cuenta aquí y se pasa, para
       que la decisión viva en una función pura con su test en vez de enterrada en el handler. */
    const { data: admins, error: countErr } = await sb
      .from('clock_people')
      .select('id')
      .eq('role', 'admin')
      .eq('status', 'active');
    if (countErr) return dbFail('clock/people', countErr);

    const role = buildRolePatch(
      { role: input.role },
      {
        adminsActivos: admins?.length ?? 0,
        eraAdmin: (admins ?? []).some((a) => a.id === input.personId),
      },
    );
    if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status });
    patch.role = role.role;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No hay ningún campo que guardar.' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('clock_people')
    .update(patch)
    .eq('id', input.personId)
    .select(LIST_COLUMNS)
    .maybeSingle();
  if (error) return dbFail('clock/people', error);
  if (!data) return NextResponse.json({ error: 'No existe esa persona.' }, { status: 404 });

  return NextResponse.json(data);
}
