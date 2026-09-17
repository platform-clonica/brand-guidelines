/* Clock_r — qué puede pulsar quien mira la pantalla.

   La única lógica pura de «Mi jornada», y no es cosmética: de esto depende que el botón de un clic
   ofrezca «salir» cuando estás dentro y «volver de la pausa» cuando estás en pausa. Si se equivoca,
   la gente ficha lo que no era, y deshacerlo cuesta un asiento nuevo con su motivo — aquí nada se
   reescribe.

   Se deriva del día YA COMPILADO y no de los asientos crudos: así las correcciones y las
   anulaciones ya están aplicadas, y lo que se mira son los tramos que quedan abiertos de verdad. */

import type { ClockDay } from './compile.ts';
import type { ClockKind } from './types.ts';

/** La primera es la PRINCIPAL: la que la tarjeta de la home pone como botón grande. */
export type ClockAction = ClockKind;

const hayAbierto = (intervals: { to: string | null }[]) => intervals.some((i) => i.to === null);

export function availableActions(day: ClockDay): ClockAction[] {
  /* Con una pausa abierta, volver es lo ÚNICO que se ofrece. Ni salir ni empezar otra pausa: las
     dos dejarían una pausa sin cerrar dentro del registro, que es justo lo que produce incidencia. */
  if (hayAbierto(day.breaks)) return ['break_end'];

  /* Dentro de la jornada. Salir va primero porque es lo que más se pulsa y lo que más cuesta si se
     olvida: una jornada sin cerrar queda como incidencia y corregirla exige motivo. */
  if (hayAbierto(day.segments)) return ['out', 'break_start'];

  /* Fuera: entrar. Vale tanto para el primer fichaje del día como para volver por la tarde después
     de haber salido a mediodía — tantos tramos por día como haga falta.

     Nótese que aquí no se mira si el día tiene incidencias, y es deliberado: si para fichar hoy
     hubiera que corregir antes el error de ayer, alguien se quedaría sin registrar su jornada por un
     fallo pasado. El registro que más falla es el que no se puede rellenar. */
  return ['in'];
}
