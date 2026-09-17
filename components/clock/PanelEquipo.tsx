'use client';
/* Clock_r — el panel de equipo.

   Quién ha fichado hoy, el saldo de cada cual y las incidencias abiertas ordenadas por antigüedad.
   El cálculo no vive aquí: lo hace `teamSummary`, que tiene sus tests. Esto carga y pinta.

   MIRA LA SEMANA, NO EL MES. «Quién ha fichado hoy» y «qué incidencias hay abiertas» son preguntas
   de la semana en curso; traerse un mes entero de ocho personas para responder eso es mucho viaje
   para poco. El detalle de cada persona, con su historial, es otra pantalla.

   Es la primera pantalla de la herramienta donde no todo el equipo ve lo mismo. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { ClockLogo } from '@/components/studio/Wordmark';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { listAbsences, listCalendar, listEntries, listPeople } from '@/lib/clock/api';
import { teamSummary, type PersonaResumen } from '@/lib/clock/equipo';
import { todayIn, weekRange } from '@/lib/clock/dates';
import type { ClockPersonRow } from '@/lib/clock/types';
import { etiquetaDia, formatMinutes } from './formato';
import './clock.css';

export function PanelEquipo() {
  const [personas, setPersonas] = useState<ClockPersonRow[]>([]);
  const [rows, setRows] = useState<unknown[]>([]);
  const [absences, setAbsences] = useState<{ fromDate: string; toDate: string }[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hoy = todayIn();
  const semana = useMemo(() => weekRange(hoy), [hoy]);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [p, e, a, c] = await Promise.all([
        listPeople(),
        listEntries(semana.from, semana.to, { scope: 'team' }),
        listAbsences(semana.from, semana.to, { scope: 'team' }),
        listCalendar(Number(hoy.slice(0, 4))),
      ]);
      setPersonas(p);
      setRows(e);
      setAbsences(a.map((x) => ({ fromDate: x.from_date, toDate: x.to_date })));
      setHolidays(c.map((x) => x.day));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo.');
    } finally {
      setCargando(false);
    }
  }, [semana.from, semana.to, hoy]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* Solo quien está de alta. Una persona dada de baja conserva su registro y se consulta en su
     detalle, pero no tiene sentido en el panel de «quién ha fichado hoy». */
  const activas = useMemo(() => personas.filter((p) => p.status === 'active'), [personas]);

  const resumen = useMemo(
    () =>
      teamSummary(
        activas.map((p) => ({ id: p.id, display_name: p.display_name, schedules: p.schedules })),
        rows,
        { from: semana.from, to: semana.to, today: hoy, absences, holidays },
      ),
    [activas, rows, semana.from, semana.to, hoy, absences, holidays],
  );

  /* Todas las incidencias del equipo, de la más vieja a la más nueva. Cada persona las trae ya
     cronológicas; al mezclarlas hay que volver a ordenar, y para eso era necesario que cada
     incidencia supiera de qué día es. */
  const incidencias = useMemo(
    () =>
      resumen
        .flatMap((r) => r.incidencias.map((i) => ({ ...i, persona: r.nombre })))
        .sort((a, b) => (a.workDate ?? '').localeCompare(b.workDate ?? '')),
    [resumen],
  );

  const sinFichar = resumen.filter((r) => !r.fichadoHoy);

  return (
    <div className="ix-clock">
      <header className="ixc-header">
        <BrandMark height={20} href="/workspace" label="Ir a la landing de aplicaciones" />
        <MarkDivider />
        <ClockLogo height={22} />
        <LogoutButton className="ixc-header__logout" />
      </header>

      <main className="ixc-main">
        <p className="ixc-eyebrow">Equipo · semana del {etiquetaDia(semana.from)}</p>

        {error && (
          <p className="ixc-alerta" role="alert">
            {error}
          </p>
        )}

        <section className="ixc-seccion" aria-label="Hoy">
          <h2 className="ixc-seccion__titulo">Hoy</h2>
          <div className="ixc-semana">
            {cargando && <p className="ixc-vacio">Cargando</p>}
            {!cargando && resumen.length === 0 && <p className="ixc-vacio">No hay nadie de alta.</p>}
            {!cargando &&
              resumen.map((r) => (
                <FilaPersona key={r.personId} resumen={r} />
              ))}
          </div>

          {!cargando && sinFichar.length > 0 && (
            <p className="ixc-aviso-correccion" style={{ marginTop: 12 }}>
              Sin fichar hoy: {sinFichar.map((r) => r.nombre).join(', ')}
            </p>
          )}
        </section>

        <section className="ixc-seccion" aria-label="Incidencias abiertas">
          <h2 className="ixc-seccion__titulo">Incidencias abiertas</h2>
          <div className="ixc-semana">
            {!cargando && incidencias.length === 0 && (
              <p className="ixc-vacio">Ninguna incidencia esta semana.</p>
            )}
            {incidencias.map((i, n) => (
              <div className="ixc-dia" key={`${i.persona}-${i.path}-${n}`}>
                <span className="ixc-dia__fecha">{i.workDate ? etiquetaDia(i.workDate) : '—'}</span>
                <span className="ixc-dia__tramos">
                  {i.persona} · {i.message}
                </span>
                <span className="ixc-dia__horas">{i.level === 'error' ? 'Error' : 'Aviso'}</span>
                <span />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function FilaPersona({ resumen }: { resumen: PersonaResumen }) {
  const saldo = resumen.balanceMinutes < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso';

  return (
    <div className="ixc-dia">
      <span className="ixc-dia__fecha">
        <Link href={`/workspace/clock_r/equipo/${resumen.personId}`}>{resumen.nombre}</Link>
      </span>
      <span className="ixc-dia__tramos">
        {resumen.fichadoHoy ? (resumen.abiertaHoy ? 'Dentro' : 'Fichado') : 'Sin fichar'}
      </span>
      <span className="ixc-dia__horas">{formatMinutes(resumen.workedTodayMinutes)}</span>
      <span className={`ixc-dia__saldo ixc-saldo ${saldo}`}>{formatMinutes(resumen.balanceMinutes)}</span>
    </div>
  );
}
