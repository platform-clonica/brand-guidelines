/* Quién es administración, y quién soy yo.

   `lib/auth/team.ts` sabe distinguir una cuenta del equipo de una que no lo es. Clock_r necesita un
   segundo nivel, y es la primera herramienta del workspace donde no todo el equipo lo ve todo.

   LA DECISIÓN NO SE TOMA AQUÍ. `clock_is_admin()` vive en Postgres y es lo que consultan también
   las políticas de RLS. Esto es solo la misma pregunta hecha desde el servidor de la aplicación,
   para poder responder un 403 legible en vez de dejar que la RLS devuelva una lista vacía y la
   pantalla parezca rota. Si algún día discreparan, mandaría la de Postgres — que es lo correcto,
   porque es la que protege los datos.

   [supuesto] Si el rol acaba siendo transversal al workspace y no propio de Clock_r, la tabla de
   roles debería salir de `clock_people` a una tabla de equipo. Hoy no hay materia para decidirlo,
   así que vive donde se usa. La semilla ya estaba puesta en 20260818100000_created_by_seam.sql. */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClockPersonRow } from '@/lib/clock/types';

/* Falla CERRADO: si la consulta no responde, la respuesta es «no es administrador». Al revés
   —dar por bueno el rol cuando algo va mal— convertiría una incidencia de base de datos en una
   escalada de permisos. */
export async function isClockAdmin(sb: SupabaseClient): Promise<boolean> {
  const { data, error } = await sb.rpc('clock_is_admin');
  if (error) {
    console.error('[clock:role] no se pudo comprobar el rol', error.code ?? '-', error.message);
    return false;
  }
  return data === true;
}

/* La ficha de quien tiene la sesión, creándola si es su primer acceso. El alta es automática y con
   jornada por defecto: la herramienta existe para quitar fricción, así que nadie tiene que pedir
   que le den de alta antes de poder fichar. */
export async function currentPerson(sb: SupabaseClient): Promise<ClockPersonRow | null> {
  const { data, error } = await sb.rpc('clock_ensure_person');
  if (error) {
    console.error('[clock:role] no se pudo resolver la persona', error.code ?? '-', error.message);
    return null;
  }
  return (data as ClockPersonRow) ?? null;
}
