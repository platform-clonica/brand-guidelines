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
import { ChainBusyError, listAbsences, listCalendar, listEntries, recordEntry } from '@/lib/clock/api';
import { availableActions, type ClockAction } from '@/lib/clock/actions';
import { compileRange, type CompileResult } from '@/lib/clock/compile';
import type { ScheduleTramo } from '@/lib/clock/calendar';
import { monthRange, todayIn, weekRange } from '@/lib/clock/dates';
import type { ClockMode, ClockPersonRow } from '@/lib/clock/types';
import { FicharButton } from './FicharButton';
import './clock.css';

/* Minutos a «7 h 45 min». Se queda aquí y no en lib/clock porque es presentación pura: no decide
   nada del registro, solo cómo se lee. */
function formatMinutes(total: number): string {
  const signo = total < 0 ? '−' : '';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${signo}${m} min`;
  return m === 0 ? `${signo}${h} h` : `${signo}${h} h ${m} min`;
}

const DIA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function etiquetaDia(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  return `${DIA_SEMANA[d.getUTCDay()]} ${fecha.slice(8)}`;
}

const horaDe = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

export function MiJornada({ persona }: { persona: ClockPersonRow | null }) {
  const [entries, setEntries] = useState<unknown[]>([]);
  const [absences, setAbsences] = useState<{ fromDate: string; toDate: string }[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<ClockMode>('onsite');

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

              <div className="ixc-semana">
                {cargando && <p className="ixc-vacio">Cargando</p>}
                {!cargando &&
                  diasSemana.map((d) => (
                    <div
                      key={d.day.workDate}
                      className={`ixc-dia ${d.day.workDate === hoy ? 'ixc-dia--hoy' : ''}`}
                    >
                      <span className="ixc-dia__fecha">{etiquetaDia(d.day.workDate)}</span>
                      <span className="ixc-dia__tramos">
                        {d.day.segments.length === 0
                          ? '—'
                          : d.day.segments
                              .map((s) => `${horaDe(s.from)}–${s.to ? horaDe(s.to) : ''}`)
                              .join('  ')}
                      </span>
                      <span className="ixc-dia__horas">{formatMinutes(d.day.workedMinutes)}</span>
                      <span
                        className={`ixc-dia__saldo ixc-saldo ${d.day.balanceMinutes < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso'}`}
                      >
                        {formatMinutes(d.day.balanceMinutes)}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
