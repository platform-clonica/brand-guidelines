/* La cuota de «Editar con IA» (docs/features/img-r.md, Decisiones): 25 ediciones por persona y mes
   natural. Cuenta cada intento pedido; un fallo del proveedor no cuenta.

   El contador es `check_rate_limit` (migración 20260817130000) con una clave que lleva el MES: el día 1
   la clave cambia y el contador empieza de cero sin tocar la función. La ventana de 31 días solo
   evita que el contador se reinicie a mitad de mes.

   El mes es el de Madrid, no el UTC. En UTC, la medianoche del día 1 llega una o dos horas tarde, y
   quien edita a las 00:30 seguiría gastando el cupo del mes anterior. */

export const EDIT_LIMIT = 25;
export const EDIT_WINDOW_SECONDS = 2678400;

const TIME_ZONE = 'Europe/Madrid';
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function monthIn(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const get = (type: 'year' | 'month') => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `imgr-edit:<user_id>:<AAAA-MM>`. */
export function quotaKey(userId: string, now = new Date()): string {
  const { year, month } = monthIn(now);
  return `imgr-edit:${userId}:${year}-${pad(month)}`;
}

/** El día en que se reinicia el contador, `AAAA-MM-01`: el 1 del mes siguiente. */
export function resetDay(now = new Date()): string {
  const { year, month } = monthIn(now);
  return month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
}

/** «el 1 de noviembre», para «El contador se reinicia el 1 de noviembre.» (F5). */
export function resetLabel(day: string): string {
  return `el 1 de ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
}

export function remainingEdits(used: number): number {
  return Math.max(0, EDIT_LIMIT - used);
}
