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
import {
  acceptPolicy,
  amendEntry,
  ChainBusyError,
  getConsent,
  listAbsences,
  listCalendar,
  listEntries,
  recordEntry,
} from '@/lib/clock/api';
import { POLICY_HASH, POLICY_VERSION } from '@/lib/clock/policy';
import { AvisoProteccionDatos } from './AvisoProteccionDatos';
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

/* `weekRange` empieza en lunes, así que el índice 0 es lunes. */
const LETRA_DIA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/* El estado en una palabra, derivado de `availableActions` y no de una lectura propia de los
   tramos: si aquí se dedujera otra vez, el día que las dos lecturas discreparan la barra diría
   «Fuera» con el botón ofreciendo «Salir». */
const ESTADO: Record<ClockAction, string> = {
  in: 'Fuera',
  out: 'Dentro',
  break_start: 'Dentro',
  break_end: 'En pausa',
};

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
  /* Se compara la VERSIÓN aceptada con la vigente, no si existe alguna aceptación: mirar solo si
     hay alguna haría que subir POLICY_VERSION no volviera a preguntar a nadie, y ese es justo el
     mecanismo por el que un cambio del texto no pasa desapercibido.
     `null` mientras se comprueba: hasta saberlo no se afirma ni que falta ni que está. */
  const [aceptada, setAceptada] = useState<boolean | null>(null);
  const [avisoAbierto, setAvisoAbierto] = useState(false);

  const hoy = todayIn();
  const mes = useMemo(() => monthRange(hoy), [hoy]);
  const semana = useMemo(() => weekRange(hoy), [hoy]);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      /* Sin alcance: los de la sesión. El panel de equipo es quien pide `scope: 'team'`. */
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

  /* Aparte de `cargar`, a propósito: si la comprobación del consentimiento fallara dentro del
     Promise.all, tumbaría la carga entera y la pantalla no enseñaría la jornada. Es la misma
     lección que la verificación de cadena en el historial. */
  useEffect(() => {
    void getConsent()
      .then((c) => setAceptada(c?.policy_version === POLICY_VERSION))
      .catch(() => setAceptada(false));
  }, []);

  const aceptarAviso = async () => {
    await acceptPolicy(POLICY_VERSION, POLICY_HASH);
    setAceptada(true);
    setAvisoAbierto(false);
  };

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

  /* El vistazo de la semana: siete barras, de lunes a domingo.

     SE CONSTRUYE DESDE `weekRange` Y NO DESDE `diasSemana`. `compileRange` solo cubre el mes, así
     que una semana a caballo de dos meses —la de fin de mes, todos los meses— dejaría fuera los días
     del otro y el gráfico saldría con cinco columnas sin decir por qué. Los días que faltan salen
     vacíos, que es la verdad: no hay dato, no que se trabajara cero.

     Las barras se miden contra el día más largo de la semana y no contra la teórica de cada uno: un
     sábado trabajado tiene teórica cero, y dividir entre ella lo pintaría al 100% o lo escondería
     del todo. Contra un máximo común, cada barra se lee en minutos comparables. */
  const vistaSemana = useMemo(() => {
    const inicio = new Date(`${semana.from}T00:00:00Z`);
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setUTCDate(d.getUTCDate() + i);
      const fecha = d.toISOString().slice(0, 10);
      const r = porFecha.get(fecha);
      return {
        fecha,
        trabajados: r?.day.workedMinutes ?? 0,
        teoricos: r?.day.theoreticalMinutes ?? 0,
      };
    });
    /* El 1 no es una jornada inventada: es el suelo que evita dividir entre cero en una semana sin
       un solo minuto, donde todas las barras valen cero de todas formas. */
    const referencia = Math.max(1, ...dias.map((d) => Math.max(d.trabajados, d.teoricos)));
    return dias.map((d) => ({
      ...d,
      pct: Math.round((d.trabajados / referencia) * 100),
      esHoy: d.fecha === hoy,
      laborable: d.teoricos > 0,
    }));
  }, [semana.from, porFecha, hoy]);

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

  /* El salto de verdad, no a medias: si el día cae fuera de la semana hay que desplegar el mes
     primero, y la fila solo existe en el DOM DESPUÉS de ese repintado — de ahí el
     `requestAnimationFrame`. Sin esto, el panel prometía «Ir a» y solo desplegaba una sección.

     El resalte se quita solo a los dos segundos: es para encontrar la fila con la vista, no un
     estado que haya que cerrar. */
  const saltarA = (fecha: string) => {
    if (fecha < semana.from || fecha > semana.to) setMesAbierto(true);

    requestAnimationFrame(() => {
      const fila = document.getElementById(`ixc-dia-${fecha}`);
      if (!fila) return;
      fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fila.classList.add('ixc-dia--saltado');
      setTimeout(() => fila.classList.remove('ixc-dia--saltado'), 2000);
    });
  };

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
              <div className="ixc-hoy__resumen">
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
              </div>

              {/* Solo en escritorio, por CSS. Las barras van `aria-hidden` porque son la misma
                  semana que la tabla de abajo, que sí se lee entera: anunciar siete barras sin
                  texto sería ruido por un dato que ya está dicho. */}
              <div className="ixc-hoy__semana-vista">
                <div className="ixc-vista__cab">
                  <span className="ixc-eyebrow">Esta semana</span>
                  <span
                    className={`ixc-saldo ${saldoSemana < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso'}`}
                  >
                    {formatMinutes(saldoSemana)}
                  </span>
                </div>

                <div className="ixc-vista__barras" aria-hidden="true">
                  {vistaSemana.map((d, i) => (
                    <div
                      key={d.fecha}
                      className={`ixc-vista__col ${d.esHoy ? 'ixc-vista__col--hoy' : ''} ${
                        d.laborable ? '' : 'ixc-vista__col--libre'
                      }`}
                    >
                      <span className="ixc-vista__pista">
                        <span className="ixc-vista__relleno" style={{ height: `${d.pct}%` }} />
                      </span>
                      <span className={`ixc-vista__dia ${d.esHoy ? 'ixc-vista__dia--hoy' : ''}`}>
                        {LETRA_DIA[i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* La barra de fichar, FUERA de la tarjeta a propósito: pegada arriba en escritorio
                mientras se baja a la semana y al mes, para no tener que volver al principio para
                fichar. `position: sticky` se pega dentro de su padre, así que dentro de `.ixc-hoy`
                se despegaría justo cuando hace falta. El botón sigue siendo uno solo. */}
            <div className="ixc-hoy__acciones">
              <span
                className={`ixc-hoy__estado ${acciones[0] === 'in' ? '' : 'ixc-hoy__estado--dentro'}`}
              >
                <span className="ixc-hoy__punto" aria-hidden="true" />
                {ESTADO[acciones[0]]}
                <small>{formatMinutes(dia?.day.workedMinutes ?? 0)}</small>
              </span>

              {/* No bloquea la pantalla: deshabilita el fichaje y deja mirar. La definición dice
                  «antes de poder fichar», no «antes de poder mirar», y un modal del que no se puede
                  salir enseña a cerrar de un clic lo que estorba — lo contrario de lo que un aviso
                  pretende. Va dentro de la barra porque explica por qué el botón está apagado: si
                  se quedara fuera, al bajar la página el botón parecería roto sin motivo. */}
              {aceptada === false && (
                <p className="ixc-alerta">
                  Antes de fichar tienes que leer y aceptar el aviso de protección de datos.{' '}
                  <button
                    type="button"
                    className="ixc-toggle"
                    style={{ marginLeft: 8 }}
                    onClick={() => setAvisoAbierto(true)}
                  >
                    Leer el aviso
                  </button>
                </p>
              )}

              <FicharButton
                actions={acciones}
                mode={mode}
                onMode={setMode}
                onFichar={fichar}
                busy={busy || cargando || aceptada !== true}
              />
            </div>

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

            {/* Todas las del mes, no solo las de hoy: cada una sabe ya de qué día es. Y las filas
                llevan a su día, que es lo que el bloque 4 no podía hacer. `locate` devuelve null
                para las del propio periodo, así que esas no son pulsables — no hay día al que ir. */}
            {rango.issues.length > 0 && (
              <IssuesPanel
                issues={rango.issues}
                locate={(i) =>
                  i.workDate === null
                    ? null
                    : { label: i.workDate.slice(8), title: `Ir a ${etiquetaDia(i.workDate)}` }
                }
                onJump={(i) => i.workDate && saltarA(i.workDate)}
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

      {avisoAbierto && (
        <AvisoProteccionDatos onClose={() => setAvisoAbierto(false)} onAceptar={aceptarAviso} />
      )}
    </div>
  );
}
