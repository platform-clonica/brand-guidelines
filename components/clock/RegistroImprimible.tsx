'use client';
/* Clock_r — el registro de una persona, para imprimir.

   ESTO ES EL PDF. No hay generación en servidor: la fase con Puppeteer del visor de presentaciones
   nunca se construyó y `@sparticuz/chromium` no es dependencia del proyecto. El patrón del repo es
   imprimir desde una página limpia, y sale mejor: vectorial, con las fuentes reales incrustadas y
   sin 50 MB de Chromium en el despliegue.

   Lleva los asientos, no el resultado, y las correcciones a la vista con su motivo. Es el documento
   que se entrega, así que en la cabecera van las tres cosas que hacen falta para saber qué se está
   mirando: de quién, de qué periodo y cuándo se generó. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAbsences, listCalendar, listEntries, listPeople, verifyChain } from '@/lib/clock/api';
import { compileRange } from '@/lib/clock/compile';
import type { ScheduleTramo } from '@/lib/clock/calendar';
import { entryRowSchema, type EntryRow } from '@/lib/clock/schema';
import type { ClockPersonRow } from '@/lib/clock/types';
import { ASIENTO, etiquetaDia, formatMinutes, horaDe } from './formato';
import './imprimible.css';

export function RegistroImprimible({
  personId,
  from,
  to,
  autoPrint,
}: {
  personId: string;
  from: string;
  to: string;
  autoPrint: boolean;
}) {
  const [persona, setPersona] = useState<ClockPersonRow | null>(null);
  const [rows, setRows] = useState<unknown[]>([]);
  const [absences, setAbsences] = useState<{ fromDate: string; toDate: string }[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [cadena, setCadena] = useState<{ intact: boolean } | 'sin dato' | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generado = useMemo(() => new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }), []);

  const cargar = useCallback(async () => {
    try {
      const [p, e, a, c] = await Promise.all([
        listPeople(),
        listEntries(from, to, { personId }),
        listAbsences(from, to, { personId }),
        listCalendar(Number(from.slice(0, 4))),
      ]);
      setPersona(p.find((x) => x.id === personId) ?? null);
      setRows(e);
      setAbsences(a.map((x) => ({ fromDate: x.from_date, toDate: x.to_date })));
      setHolidays(c.map((x) => x.day));
      void verifyChain(personId).then(setCadena).catch(() => setCadena('sin dato'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el registro.');
    } finally {
      setListo(true);
    }
  }, [personId, from, to]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* La impresión se dispara CUANDO HAY DATOS, no al montar. Imprimir una página vacía y que el PDF
     salga en blanco es el fallo clásico de esta técnica. */
  useEffect(() => {
    if (!autoPrint || !listo || error) return;
    const id = setTimeout(() => window.print(), 400);
    return () => clearTimeout(id);
  }, [autoPrint, listo, error]);

  const schedules = useMemo(
    () => (Array.isArray(persona?.schedules) ? (persona.schedules as ScheduleTramo[]) : []),
    [persona],
  );

  const rango = useMemo(
    () => compileRange(rows, { from, to, schedules, absences, holidays }),
    [rows, from, to, schedules, absences, holidays],
  );

  const asientosPorDia = useMemo(() => {
    const mapa = new Map<string, EntryRow[]>();
    for (const fila of rows) {
      const parsed = entryRowSchema.safeParse(fila);
      if (!parsed.success) continue;
      const fecha = parsed.data.work_date;
      mapa.set(fecha, [...(mapa.get(fecha) ?? []), parsed.data]);
    }
    return mapa;
  }, [rows]);

  const conAlgo = rango.days.filter((d) => (asientosPorDia.get(d.day.workDate)?.length ?? 0) > 0);

  return (
    <div className="ix-print">
      <header className="ixp-cabecera">
        <h1>Registro de jornada</h1>
        <dl>
          <div><dt>Persona</dt><dd>{persona?.display_name ?? '—'}</dd></div>
          <div><dt>Correo</dt><dd>{persona?.email ?? '—'}</dd></div>
          <div><dt>Periodo</dt><dd>{from} a {to}</dd></div>
          <div><dt>Generado</dt><dd>{generado}</dd></div>
        </dl>
      </header>

      {error && <p className="ixp-alerta">{error}</p>}

      <table className="ixp-totales">
        <tbody>
          <tr><th>Trabajado</th><td>{formatMinutes(rango.workedMinutes)}</td></tr>
          <tr><th>Jornada teórica</th><td>{formatMinutes(rango.theoreticalMinutes)}</td></tr>
          <tr><th>Saldo</th><td>{formatMinutes(rango.balanceMinutes)}</td></tr>
          <tr>
            <th>Integridad</th>
            <td>
              {cadena === null && 'comprobando'}
              {cadena === 'sin dato' && 'no se ha podido comprobar'}
              {cadena !== null && cadena !== 'sin dato' &&
                (cadena.intact ? 'cadena verificada' : 'CADENA ROTA')}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="ixp-asientos">
        <thead>
          <tr>
            <th>Día</th><th>Tipo</th><th>Hora</th><th>Modalidad</th>
            <th>Operación</th><th>Motivo</th><th>Vigente</th>
          </tr>
        </thead>
        <tbody>
          {conAlgo.map((d) => {
            const sustituidos = new Set(d.day.supersededIds);
            return (asientosPorDia.get(d.day.workDate) ?? []).map((a) => (
              <tr key={a.id} className={sustituidos.has(a.id) ? 'ixp-fuera' : undefined}>
                <td>{etiquetaDia(a.work_date)}</td>
                <td>{ASIENTO[a.kind] ?? a.kind}</td>
                <td>{horaDe(a.occurred_at)}</td>
                <td>{a.mode === 'remote' ? 'A distancia' : 'Presencial'}</td>
                <td>{a.op === 'record' ? '—' : a.op === 'annul' ? 'Anulación' : 'Corrección'}</td>
                <td>{a.reason ?? ''}</td>
                <td>{sustituidos.has(a.id) ? 'No' : 'Sí'}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>

      {listo && conAlgo.length === 0 && <p>No hay ningún asiento en este periodo.</p>}

      <footer className="ixp-pie">
        Registro de jornada conforme al artículo 34.9 del Estatuto de los Trabajadores. Los asientos
        no se modifican: una corrección es un asiento nuevo que apunta al anterior, y el anterior se
        conserva. Las filas marcadas como no vigentes son asientos corregidos o anulados.
      </footer>
    </div>
  );
}
