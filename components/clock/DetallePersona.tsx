'use client';
/* Clock_r — el historial de una persona. La pantalla que se abre el día de una revisión.

   AQUÍ SÍ SE VEN LOS ASIENTOS SUSTITUIDOS, y es la diferencia de fondo con el resto de la
   herramienta. En «Mi jornada» y en el panel se calcula con los vigentes y los corregidos
   desaparecen del cálculo; aquí se enseñan todos, marcados, con su motivo y su autor.

   Ese es el sentido de que la tabla solo admita inserciones: si al corregir se reescribiera la
   hora, esta pantalla no existiría, porque no habría nada que enseñar. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { ClockLogo } from '@/components/studio/Wordmark';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { listAbsences, listCalendar, listEntries, listPeople, verifyChain } from '@/lib/clock/api';
import { compileRange, type CompileResult } from '@/lib/clock/compile';
import type { ScheduleTramo } from '@/lib/clock/calendar';
import { entryRowSchema, type EntryRow } from '@/lib/clock/schema';
import { monthRange, todayIn } from '@/lib/clock/dates';
import type { ClockPersonRow } from '@/lib/clock/types';
import { ASIENTO, etiquetaDia, formatMinutes, horaDe } from './formato';
import './clock.css';

export function DetallePersona({ personId }: { personId: string }) {
  const [persona, setPersona] = useState<ClockPersonRow | null>(null);
  const [rows, setRows] = useState<unknown[]>([]);
  const [absences, setAbsences] = useState<{ fromDate: string; toDate: string }[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  /* Tres estados, no dos: `null` mientras se pide, `'sin dato'` si la comprobación no responde, y
     el veredicto si responde. Que falte el veredicto NO puede leerse como «verificada»: en un
     registro que existe para poder demostrarse, ausencia de prueba y prueba buena no son lo mismo. */
  const [cadena, setCadena] = useState<{ intact: boolean } | 'sin dato' | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hoy = todayIn();
  const mes = useMemo(() => monthRange(hoy), [hoy]);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [p, e, a, c] = await Promise.all([
        listPeople(),
        listEntries(mes.from, mes.to, { personId }),
        listAbsences(mes.from, mes.to, { personId }),
        listCalendar(Number(hoy.slice(0, 4))),
      ]);
      setPersona(p.find((x) => x.id === personId) ?? null);
      setRows(e);
      setAbsences(a.map((x) => ({ fromDate: x.from_date, toDate: x.to_date })));
      setHolidays(c.map((x) => x.day));

      /* APARTE del bloque anterior, a propósito. Si la comprobación de cadena entrara en el
         `Promise.all`, un fallo suyo tumbaría la carga entera y la pantalla diría «no se pudo
         cargar el historial» en vez de enseñarlo. El historial es lo importante; el veredicto es
         un añadido encima, y si no se puede dar, se dice. */
      void verifyChain(personId)
        .then(setCadena)
        .catch(() => setCadena('sin dato'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
    } finally {
      setCargando(false);
    }
  }, [personId, mes.from, mes.to, hoy]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const schedules = useMemo(
    () => (Array.isArray(persona?.schedules) ? (persona.schedules as ScheduleTramo[]) : []),
    [persona],
  );

  const rango = useMemo(
    () => compileRange(rows, { from: mes.from, to: mes.to, schedules, absences, holidays }),
    [rows, mes.from, mes.to, schedules, absences, holidays],
  );

  /* TODOS los asientos de cada día, vigentes y sustituidos. No se filtra nada: eso es lo que hace
     que el historial pueda explicarse. */
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

  /* Solo los días con algo que enseñar: un historial no necesita la lista de todos los días vacíos
     del mes, a diferencia del saldo, que sí los cuenta. */
  const conAlgo = rango.days.filter((d) => (asientosPorDia.get(d.day.workDate)?.length ?? 0) > 0);

  return (
    <div className="ix-clock">
      <header className="ixc-header">
        <BrandMark height={20} href="/workspace" label="Ir a la landing de aplicaciones" />
        <MarkDivider />
        <ClockLogo height={22} />
        <LogoutButton className="ixc-header__logout" />
      </header>

      <main className="ixc-main">
        <p className="ixc-eyebrow">Historial · {mes.from.slice(0, 7)}</p>
        <h1 className="ixc-nombre">{persona?.display_name ?? 'Persona'}</h1>

        {error && (
          <p className="ixc-alerta" role="alert">
            {error}
          </p>
        )}

        {/* Lo único de toda la herramienta que va en Burdeos por derecho propio: si la cadena está
            rota, el registro de este periodo ha dejado de ser fiable y no es un aviso más. */}
        {cadena !== null && cadena !== 'sin dato' && !cadena.intact && (
          <p className="ixc-alerta" role="alert">
            La cadena de este registro está rota. El periodo ha dejado de ser fiable.
          </p>
        )}

        {/* Las dos salidas del registro. El CSV es para la asesoría y el imprimible es el PDF:
            se abre en otra pestaña y se imprime solo. El periodo viaja en la URL para que el
            enlace se pueda guardar y repetir con otras fechas. */}
        <div className="ixc-acciones-panel">
          <a
            className="ixc-toggle"
            href={`/api/clock/export?personId=${personId}&from=${mes.from}&to=${mes.to}`}
          >
            Descargar CSV
          </a>
          <a
            className="ixc-toggle"
            href={`/workspace/clock_r/equipo/${personId}/imprimir?from=${mes.from}&to=${mes.to}&print=1`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Imprimir o guardar en PDF
          </a>
        </div>

        <div className="ixc-mes-resumen">
          <span>Trabajado: {formatMinutes(rango.workedMinutes)}</span>
          <span>Jornada: {formatMinutes(rango.theoreticalMinutes)}</span>
          <span
            className={`ixc-saldo ${rango.balanceMinutes < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso'}`}
          >
            Saldo: {formatMinutes(rango.balanceMinutes)}
          </span>
          {cadena !== null && cadena !== 'sin dato' && cadena.intact && (
            <span className="ixc-aviso-correccion">Cadena verificada</span>
          )}
          {cadena === 'sin dato' && (
            <span className="ixc-aviso-correccion">La cadena no se ha podido comprobar</span>
          )}
        </div>

        <section className="ixc-seccion" aria-label="Asientos">
          <div className="ixc-semana">
            {cargando && <p className="ixc-vacio">Cargando</p>}
            {!cargando && conAlgo.length === 0 && (
              <p className="ixc-vacio">No hay ningún asiento este mes.</p>
            )}
            {conAlgo.map((d) => (
              <HistorialDia
                key={d.day.workDate}
                resultado={d}
                asientos={asientosPorDia.get(d.day.workDate) ?? []}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function HistorialDia({ resultado, asientos }: { resultado: CompileResult; asientos: EntryRow[] }) {
  const { day } = resultado;
  const sustituidos = new Set(day.supersededIds);
  const saldo = day.balanceMinutes < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso';

  return (
    <div className="ixc-dia">
      <span className="ixc-dia__fecha">{etiquetaDia(day.workDate)}</span>
      <span className="ixc-dia__tramos">{formatMinutes(day.workedMinutes)} efectivos</span>
      <span className="ixc-dia__horas" />
      <span className={`ixc-dia__saldo ixc-saldo ${saldo}`}>{formatMinutes(day.balanceMinutes)}</span>

      <div className="ixc-asientos">
        {asientos.map((a) => {
          const fuera = sustituidos.has(a.id);
          return (
            <span
              key={a.id}
              className="ixc-asiento"
              style={fuera ? { textDecoration: 'line-through', opacity: 0.55 } : undefined}
            >
              {ASIENTO[a.kind] ?? a.kind} {horaDe(a.occurred_at)}
              {a.op !== 'record' && ` · ${a.op === 'annul' ? 'anula' : 'corrige'}`}
              {a.reason && ` · ${a.reason}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}
