'use client';
/* Clock_r — el panel de equipo.

   Quién ha fichado hoy, el saldo de cada cual y las incidencias abiertas ordenadas por antigüedad.
   El cálculo no vive aquí: lo hace `teamSummary`, que tiene sus tests. Esto carga, pinta y manda
   cambios.

   MIRA LA SEMANA, NO EL MES. «Quién ha fichado hoy» y «qué incidencias hay abiertas» son preguntas
   de la semana en curso; traerse un mes entero de ocho personas para responder eso es mucho viaje
   para poco. El historial de cada persona es otra pantalla.

   CADA ACCIÓN RECARGA DESDE EL SERVIDOR en vez de tocar el estado local. Es más lento y es lo
   correcto: al añadir un tramo de jornada cambian los saldos de todos los días afectados, y
   recalcularlos a mano en el cliente sería duplicar `compileRange` a ojo.

   Es la primera pantalla de la herramienta donde no todo el equipo ve lo mismo. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { ClockLogo } from '@/components/studio/Wordmark';
import { LogoutButton } from '@/components/studio/LogoutButton';
import {
  createAbsence,
  createCalendarDay,
  deleteAbsence,
  deleteCalendarDay,
  listAbsences,
  listCalendar,
  listEntries,
  listPeople,
  patchPerson,
} from '@/lib/clock/api';
import { teamSummary, type PersonaResumen } from '@/lib/clock/equipo';
import type { ScheduleTramo } from '@/lib/clock/calendar';
import { todayIn, weekRange } from '@/lib/clock/dates';
import type { ClockAbsenceRow, ClockCalendarDayRow, ClockPersonRow } from '@/lib/clock/types';
import { EditorAusencias } from './EditorAusencias';
import { EditorFestivos } from './EditorFestivos';
import { EditorJornada } from './EditorJornada';
import { etiquetaDia, formatMinutes } from './formato';
import './clock.css';

/* Qué editor está abierto. `null` es el estado normal: el panel se mira mucho más de lo que se
   toca, así que nada se abre solo. */
type Editando =
  | { tipo: 'jornada'; persona: ClockPersonRow }
  | { tipo: 'ausencias'; persona: ClockPersonRow }
  | { tipo: 'festivos' }
  | null;

export function PanelEquipo() {
  const [personas, setPersonas] = useState<ClockPersonRow[]>([]);
  const [rows, setRows] = useState<unknown[]>([]);
  /* Las filas COMPLETAS, no solo lo que necesita el cálculo: los editores necesitan el `id` para
     poder quitarlas. */
  const [ausencias, setAusencias] = useState<ClockAbsenceRow[]>([]);
  const [festivos, setFestivos] = useState<ClockCalendarDayRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Editando>(null);

  const hoy = todayIn();
  const year = Number(hoy.slice(0, 4));
  const semana = useMemo(() => weekRange(hoy), [hoy]);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [p, e, a, c] = await Promise.all([
        listPeople(),
        listEntries(semana.from, semana.to, { scope: 'team' }),
        listAbsences(semana.from, semana.to, { scope: 'team' }),
        listCalendar(year),
      ]);
      setPersonas(p);
      setRows(e);
      setAusencias(a);
      setFestivos(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo.');
    } finally {
      setCargando(false);
    }
  }, [semana.from, semana.to, year]);

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
        {
          from: semana.from,
          to: semana.to,
          today: hoy,
          absences: ausencias.map((x) => ({ fromDate: x.from_date, toDate: x.to_date })),
          holidays: festivos.map((x) => x.day),
        },
      ),
    [activas, rows, semana.from, semana.to, hoy, ausencias, festivos],
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
  const porId = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);

  const guardarJornada = async (personId: string, schedules: ScheduleTramo[]) => {
    await patchPerson({ personId, schedules });
    setEditando(null);
    await cargar();
  };

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

        <div className="ixc-acciones-panel">
          <button type="button" className="ixc-toggle" onClick={() => setEditando({ tipo: 'festivos' })}>
            Festivos de {year} ({festivos.length})
          </button>
        </div>

        {/* Cero festivos en un año no es un estado normal: es lo que más silenciosamente falsea el
            saldo de todo el equipo, porque cada festivo pasa a contar como día laborable. */}
        {!cargando && festivos.length === 0 && (
          <p className="ixc-alerta">
            No hay ningún festivo cargado en {year}. Hasta que los haya, cada festivo resta jornada a
            todo el equipo.
          </p>
        )}

        <section className="ixc-seccion" aria-label="Hoy">
          <h2 className="ixc-seccion__titulo">Hoy</h2>
          <div className="ixc-semana">
            {cargando && <p className="ixc-vacio">Cargando</p>}
            {!cargando && resumen.length === 0 && <p className="ixc-vacio">No hay nadie de alta.</p>}
            {!cargando &&
              resumen.map((r) => (
                <FilaPersona
                  key={r.personId}
                  resumen={r}
                  onJornada={() => {
                    const p = porId.get(r.personId);
                    if (p) setEditando({ tipo: 'jornada', persona: p });
                  }}
                  onAusencias={() => {
                    const p = porId.get(r.personId);
                    if (p) setEditando({ tipo: 'ausencias', persona: p });
                  }}
                />
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

      {editando?.tipo === 'jornada' && (
        <EditorJornada
          nombre={editando.persona.display_name}
          tramos={
            Array.isArray(editando.persona.schedules)
              ? (editando.persona.schedules as ScheduleTramo[])
              : []
          }
          onClose={() => setEditando(null)}
          onSubmit={(schedules) => guardarJornada(editando.persona.id, schedules)}
        />
      )}

      {editando?.tipo === 'ausencias' && (
        <EditorAusencias
          nombre={editando.persona.display_name}
          ausencias={ausencias.filter((a) => a.person_id === editando.persona.id)}
          onClose={() => setEditando(null)}
          onCrear={async (input) => {
            await createAbsence({ personId: editando.persona.id, ...input });
            await cargar();
          }}
          onBorrar={async (id) => {
            await deleteAbsence(id);
            await cargar();
          }}
        />
      )}

      {editando?.tipo === 'festivos' && (
        <EditorFestivos
          year={year}
          festivos={festivos}
          onClose={() => setEditando(null)}
          onCrear={async (input) => {
            await createCalendarDay(input);
            await cargar();
          }}
          onBorrar={async (id) => {
            await deleteCalendarDay(id);
            await cargar();
          }}
        />
      )}
    </div>
  );
}

function FilaPersona({
  resumen,
  onJornada,
  onAusencias,
}: {
  resumen: PersonaResumen;
  onJornada: () => void;
  onAusencias: () => void;
}) {
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

      <div className="ixc-asientos">
        <button type="button" className="ixc-asiento" onClick={onJornada}>
          Jornada
        </button>
        <button type="button" className="ixc-asiento" onClick={onAusencias}>
          Ausencias
        </button>
      </div>
    </div>
  );
}
