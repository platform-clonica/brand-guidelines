/* Clock_r — cómo se leen las horas en pantalla.

   Presentación pura: no decide nada del registro, solo cómo se muestra. Por eso vive en
   components/ y no en lib/clock, donde está lo que sí decide y lleva tests.

   Está aquí, y no dentro de un componente, porque lo usan dos: la pantalla y la fila de día. Una
   copia en cada uno sería el clásico mismo rol con dos valores — y aquí dos valores significan que
   la misma hora se lee distinta en la semana y en el mes. */

/** Minutos a «7 h 45 min». El signo menos es el tipográfico, no el guión del teclado. */
export function formatMinutes(total: number): string {
  const signo = total < 0 ? '−' : '';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${signo}${m} min`;
  return m === 0 ? `${signo}${h} h` : `${signo}${h} h ${m} min`;
}

const DIA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/* En UTC, como toda la aritmética de días de este proyecto: una fecha sin hora es un día de
   calendario, no un instante, y leerla en la zona local haría que el nombre del día dependiera de
   dónde está quien mira. */
export function etiquetaDia(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  return `${DIA_SEMANA[d.getUTCDay()]} ${fecha.slice(8)}`;
}

/* Un asiento SÍ es un instante, así que aquí la zona importa y se pone explícita: la misma que
   usa el servidor para derivar el día de jornada. */
export const horaDe = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });

export const ASIENTO: Record<string, string> = {
  in: 'Entrada',
  out: 'Salida',
  break_start: 'Inicio de pausa',
  break_end: 'Fin de pausa',
};
