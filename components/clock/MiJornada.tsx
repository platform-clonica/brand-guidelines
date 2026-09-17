'use client';
/* Clock_r — «Mi jornada»: el día, la semana y el saldo.

   QUIÉN SOY LLEGA COMO PROP, no se adivina. `/api/clock/people` devuelve mi ficha si soy miembro y
   TODAS si soy administración, así que de esa lista no se puede deducir cuál soy. Lo resuelve la
   página, que es un server component y llama a `currentPerson` — el mismo patrón que usa
   app/workspace/page.tsx con la sesión, y de paso el alta automática ocurre al cargar.

   El cálculo no vive aquí: `compileRange` resuelve el mes entero y `availableActions` dice qué se
   puede pulsar. Los dos son funciones puras con sus tests. Esto carga, pinta y manda fichajes.

   LÍMITES DE ESTA VERSIÓN, dichos en vez de disimulados:
   - El panel solo muestra las incidencias de HOY. `compileRange` aplana las de todo el mes sin decir
     de qué día es cada una, y hasta que las lleve consigo no se puede mandar a nadie al día que las
     provoca.
   - Las filas del panel no son pulsables porque todavía no hay adónde saltar: el modo corrección
     llega en el ciclo siguiente. Una fila que parece un enlace y no lleva a ningún sitio es peor que
     una que no lo parece. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { ClockLogo } from '@/components/studio/Wordmark';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { IssuesPanel } from '@/components/studio/IssuesPanel';
import { amendEntry, ChainBusyError, listAbsences, listCalendar, listEntries, recordEntry } from '@/lib/clock/api';
import { availableActions, correctableEntries, type ClockAction } from '@/lib/clock/actions';
import type { EntryRow } from '@/lib/clock/schema';
import { CorregirModal, type CorreccionInput } from './CorregirModal';
import { DiaFila } from './DiaFila';
import { etiquetaDia, formatMinutes } from './formato';
import { compileRange, type CompileResult } from '@/lib/clock/compile';
import type { ScheduleTramo } from '@/lib/clock/calendar';
import { monthRange, todayIn, weekRange } from '@/lib/clock/dates';
import type { ClockMode, ClockPersonRow } from '@/lib/clock/types';
import { FicharButton } from './FicharButton';
import './clock.css';

export function MiJornada({ persona }: { persona: ClockPersonRow | null }) {
  const [entries, setEntries] = useState<unknown[]>([]);
  const [absences, setAbsences] = useState<{ fromDate: string; toDate: string }[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<ClockMode>('onsite');
  /* Apagado por defecto: con la edición siempre activa, la comodidad se paga en asientos tocados
     sin querer dentro de un registro legal. */
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [aCorregir, setACorregir] = useState<EntryRow | null>(null);
  /* Plegado por defecto: lo que se mira a diario es hoy y la semana. El mes es para cuadrar a fin
     de mes, y desplegado de serie empujaría la semana fuera de la pantalla en un móvil. */
  const [mesAbierto, setMesAbierto] = useState(false);

  const hoy = todayIn();
  const mes = useMemo(() => monthRange(hoy), [hoy]);
  const semana = useMemo(() => weekRange(hoy), [hoy]);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [e, a, c] = await Promise.all([
        listEntries(mes.from, mes.to),
        listAbsences(mes.from, mes.to),
        listCalendar(Number(hoy.slice(0, 4))),
      ]);
      setEntries(e);
      setAbsences(a.map((x) => ({ fromDate: x.from_date, toDate: x.to_date })));
      setHolidays(c.map((x) => x.day));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el registro.');
    } finally {
      setCargando(false);
    }
  }, [mes.from, mes.to, hoy]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* `schedules` viene de un JSONB y no está validado: si no es una lista, se trata como vacía y el
     propio compilador lo dice con «no hay jornada teórica vigente». No se inventa una por defecto. */
  const schedules = useMemo(
    () => (Array.isArray(persona?.schedules) ? (persona.schedules as ScheduleTramo[]) : []),
    [persona],
  );

  const rango = useMemo(
    () => compileRange(entries, { from: mes.from, to: mes.to, schedules, absences, holidays }),
    [entries, mes.from, mes.to, schedules, absences, holidays],
  );

  const porFecha = useMemo(() => {
    const mapa = new Map<string, CompileResult>();
    for (const d of rango.days) mapa.set(d.day.workDate, d);
    return mapa;
  }, [rango]);

  const dia = porFecha.get(hoy) ?? null;
  const acciones: ClockAction[] = dia ? availableActions(dia.day) : ['in'];

  const diasSemana = useMemo(
    () => rango.days.filter((d) => d.day.workDate >= semana.from && d.day.workDate <= semana.to),
    [rango, semana.from, semana.to],
  );

  /* Los asientos crudos de cada día, para el modo corrección. Se corrige cualquier día de la
     semana y no solo hoy: el caso típico es «ayer olvidé fichar la salida», y restringirlo a hoy
     dejaría eso sin arreglo desde la interfaz. */
  const asientosPorDia = useMemo(() => {
    const mapa = new Map<string, unknown[]>();
    for (const fila of entries) {
      const fecha = (fila as { work_date?: unknown } | null)?.work_date;
      if (typeof fecha !== 'string') continue;
      mapa.set(fecha, [...(mapa.get(fecha) ?? []), fila]);
    }
    return mapa;
  }, [entries]);

  /* Se calcula una vez y no dentro del JSX: llamarlo al pintar recorrería y validaría con Zod los
     asientos de cada día en cada repintado, y haría falta llamarlo dos veces por fila —una para
     pintar y otra para saber si está vacía—. */
  const corregiblesPorDia = useMemo(() => {
    const mapa = new Map<string, EntryRow[]>();
    /* Todo el mes y no solo la semana: el mes desplegado también ofrece corregir, y el caso que lo
       justifica es cuadrar a fin de mes encontrando un día mal fichado de hace tres semanas. */
    for (const d of rango.days) {
      mapa.set(d.day.workDate, correctableEntries(asientosPorDia.get(d.day.workDate) ?? [], d.day));
    }
    return mapa;
  }, [rango, asientosPorDia]);

  const corregir = async (input: CorreccionInput) => {
    if (!aCorregir) return;

    /* La corrección hereda la modalidad del asiento que corrige: si aquel fue a distancia, el
       asiento nuevo también lo es. Solo se cae al selector de la pantalla si la fila no la trae,
       que es el caso de una fila antigua o tocada a mano. */
    const modalidad = aCorregir.mode ?? mode;

    await amendEntry({
      kind: aCorregir.kind,
      mode: modalidad,
      source: 'app',
      op: input.op,
      corrects: aCorregir.id,
      reason: input.reason,
      occurredAt: input.occurredAt,
    });
    setACorregir(null);
    await cargar();
  };

  const saldoSemana = diasSemana.reduce((t, d) => t + d.day.balanceMinutes, 0);

  const fichar = async (kind: ClockAction) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await recordEntry({ kind, mode, source: 'app' });
      await cargar();
    } catch (err) {
      /* Una colisión de cadena no es culpa de nadie: dos escrituras compitieron por el mismo
         eslabón. Se reintenta una vez antes de molestar a quien ficha. */
      if (err instanceof ChainBusyError) {
        try {
          await recordEntry({ kind, mode, source: 'app' });
          await cargar();
          return;
        } catch {
          setError('No se pudo guardar el fichaje. Vuelve a intentarlo.');
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'No se pudo guardar el fichaje.');
    } finally {
      setBusy(false);
    }
  };

  const cadenaRota = rango.issues.some((i) => i.path === 'rango');

  return (
    <div className="ix-clock">
      <header className="ixc-header">
        <BrandMark height={20} href="/workspace" label="Ir a la landing de aplicaciones" />
        <MarkDivider />
        <ClockLogo height={22} />
        <LogoutButton className="ixc-header__logout" />
      </header>

      <main className="ixc-main">
        {!persona && (
          <p className="ixc-alerta" role="alert">
            No hay ninguna ficha de persona para esta cuenta, así que no se puede fichar. Avisa a
            administración.
          </p>
        )}

        {persona && (
          <>
            <section className="ixc-hoy" aria-label="Hoy">
              <p className="ixc-eyebrow">{etiquetaDia(hoy)}</p>

              <p className="ixc-total">
                {formatMinutes(dia?.day.workedMinutes ?? 0)}
                <small>de {formatMinutes(dia?.day.theoreticalMinutes ?? 0)}</small>
              </p>

              <div className="ixc-meta">
                <span>Pausas: {formatMinutes(dia?.day.breakMinutes ?? 0)}</span>
                <span
                  className={`ixc-saldo ${(dia?.day.balanceMinutes ?? 0) < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso'}`}
                >
                  Saldo del día: {formatMinutes(dia?.day.balanceMinutes ?? 0)}
                </span>
                {dia?.day.open && <span>Jornada abierta</span>}
              </div>

              <FicharButton
                actions={acciones}
                mode={mode}
                onMode={setMode}
                onFichar={fichar}
                busy={busy || cargando}
              />

              {error && (
                <p className="ixc-alerta" role="alert">
                  {error}
                </p>
              )}
              {cadenaRota && (
                <p className="ixc-alerta" role="alert">
                  El registro de este periodo ha dejado de ser fiable. Avisa a administración.
                </p>
              )}
            </section>

            {dia && dia.issues.length > 0 && (
              <IssuesPanel
                issues={dia.issues}
                locate={() => null}
                onJump={() => {}}
                stale={false}
                staleMessage=""
              />
            )}

            <section className="ixc-seccion" aria-label="Esta semana">
              <h2 className="ixc-seccion__titulo">
                Esta semana{' '}
                <span className={`ixc-saldo ${saldoSemana < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso'}`}>
                  {formatMinutes(saldoSemana)}
                </span>
              </h2>

              {/* El interruptor va aquí y no en la cabecera: es donde están los asientos que
                  enciende. Un interruptor lejos de lo que activa se pulsa sin saber qué hace. */}
              <div className="ixc-modo-correccion">
                <button
                  type="button"
                  className="ixc-toggle"
                  aria-pressed={corrigiendo}
                  onClick={() => setCorrigiendo((v) => !v)}
                >
                  Modo corrección
                </button>
                {corrigiendo && (
                  <span className="ixc-aviso-correccion">
                    Corregir escribe un asiento nuevo. El original no se borra.
                  </span>
                )}
              </div>

              <div className="ixc-semana">
                {cargando && <p className="ixc-vacio">Cargando</p>}
                {!cargando &&
                  diasSemana.map((d) => (
                    <DiaFila
                      key={d.day.workDate}
                      resultado={d}
                      esHoy={d.day.workDate === hoy}
                      corrigiendo={corrigiendo}
                      corregibles={corregiblesPorDia.get(d.day.workDate) ?? []}
                      onCorregir={setACorregir}
                    />
                  ))}
              </div>
            </section>

            <section className="ixc-seccion" aria-label="Este mes">
              <h2 className="ixc-seccion__titulo">Este mes</h2>

              <div className="ixc-mes-resumen">
                <span>Trabajado: {formatMinutes(rango.workedMinutes)}</span>
                <span>Jornada: {formatMinutes(rango.theoreticalMinutes)}</span>
                <span
                  className={`ixc-saldo ${rango.balanceMinutes < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso'}`}
                >
                  Saldo: {formatMinutes(rango.balanceMinutes)}
                </span>
                <button
                  type="button"
                  className="ixc-toggle"
                  aria-expanded={mesAbierto}
                  onClick={() => setMesAbierto((v) => !v)}
                >
                  {mesAbierto ? 'Plegar el mes' : 'Ver el mes'}
                </button>
              </div>

              {mesAbierto && (
                <div className="ixc-semana">
                  {rango.days.map((d) => (
                    <DiaFila
                      key={d.day.workDate}
                      resultado={d}
                      esHoy={d.day.workDate === hoy}
                      corrigiendo={corrigiendo}
                      corregibles={corregiblesPorDia.get(d.day.workDate) ?? []}
                      onCorregir={setACorregir}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {aCorregir && (
        <CorregirModal entry={aCorregir} onClose={() => setACorregir(null)} onSubmit={corregir} />
      )}
    </div>
  );
}
