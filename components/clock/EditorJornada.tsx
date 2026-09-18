'use client';
/* Editar la jornada teórica de una persona.

   AÑADE UN TRAMO, NO PISA EL VIGENTE. `schedules` es la única fila de toda la herramienta que se
   reescribe, y de ahí sale la consecuencia incómoda: cambiar un tramo ya vencido altera el saldo de
   meses cerrados sin dejar rastro, en la única tabla que no tiene un histórico detrás que lo
   explique. Así que la forma normal de cambiar una jornada es declarar desde cuándo rige la nueva,
   y los meses anteriores siguen calculándose con la que estaba vigente entonces.

   Se manda el ARRAY ENTERO al servidor, no un parche. Es lo que valida `buildSchedulesPatch`, y es
   lo que le permite rechazar dos tramos con la misma fecha de inicio — una comprobación imposible
   si los tramos llegaran de uno en uno. */

import { useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors, field, input, label } from '@/components/deck/studio/ui';
import { hhmmFromMinutes, minutesFromHHMM, WEEKDAYS, type ScheduleTramo } from '@/lib/clock/calendar';
import { todayIn } from '@/lib/clock/dates';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERTA = 'var(--c-bordeaux, #99335F)';

/* En el orden en que se lee una semana, no en el de `getUTCDay()`, que empieza en domingo. */
const SEMANA: { clave: (typeof WEEKDAYS)[number]; etiqueta: string }[] = [
  { clave: 'mon', etiqueta: 'Lunes' },
  { clave: 'tue', etiqueta: 'Martes' },
  { clave: 'wed', etiqueta: 'Miércoles' },
  { clave: 'thu', etiqueta: 'Jueves' },
  { clave: 'fri', etiqueta: 'Viernes' },
  { clave: 'sat', etiqueta: 'Sábado' },
  { clave: 'sun', etiqueta: 'Domingo' },
];

export function EditorJornada({
  nombre,
  tramos,
  onClose,
  onSubmit,
}: {
  nombre: string;
  /** Los que ya tiene. Se muestran para que se vea qué se está heredando. */
  tramos: ScheduleTramo[];
  onClose: () => void;
  onSubmit: (schedules: ScheduleTramo[]) => Promise<void>;
}) {
  const vigente = [...tramos].sort((a, b) => a.validFrom.localeCompare(b.validFrom)).at(-1) ?? null;

  const [validFrom, setValidFrom] = useState(todayIn());
  const [horas, setHoras] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      SEMANA.map(({ clave }) => [clave, hhmmFromMinutes(vigente?.weekly[clave] ?? 0)]),
    ),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Se valida aquí lo mismo que valida el servidor, y no para fiarse de esto: para poder decir
     cuál de los siete días está mal antes de mandar nada. */
  const invalidos = SEMANA.filter(({ clave }) => minutesFromHHMM(horas[clave] ?? '') === null);
  const fechaOk = /^\d{4}-\d{2}-\d{2}$/.test(validFrom);
  const chocaConOtro = tramos.some((t) => t.validFrom === validFrom);
  const puedeGuardar = invalidos.length === 0 && fechaOk && !chocaConOtro && !guardando;

  const total = SEMANA.reduce((suma, { clave }) => suma + (minutesFromHHMM(horas[clave] ?? '') ?? 0), 0);

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      const weekly = Object.fromEntries(
        SEMANA.map(({ clave }) => [clave, minutesFromHHMM(horas[clave] ?? '') ?? 0]),
      ) as ScheduleTramo['weekly'];

      await onSubmit([...tramos, { validFrom, weekly }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la jornada.');
      setGuardando(false);
    }
  };

  return (
    <Modal title={`Jornada de ${nombre}`} onClose={onClose} width={520}>
      <div style={{ font: `400 12px/1.6 ${MONO}`, color: colors.ash, marginBottom: 20 }}>
        Se añade un tramo nuevo con su fecha de efecto. Los meses anteriores siguen calculándose con
        la jornada que estaba vigente entonces.
      </div>

      {vigente && (
        <div style={{ font: `400 11px/1.6 ${MONO}`, color: colors.ash, marginBottom: 16 }}>
          Vigente desde {vigente.validFrom} ·{' '}
          {SEMANA.map(({ clave, etiqueta }) => `${etiqueta.slice(0, 1)} ${hhmmFromMinutes(vigente.weekly[clave] ?? 0)}`).join(' · ')}
        </div>
      )}

      <div style={field}>
        <label style={label} htmlFor="ixc-desde">
          En vigor desde
        </label>
        <input
          id="ixc-desde"
          type="date"
          value={validFrom}
          onChange={(e) => setValidFrom(e.target.value)}
          style={{ ...input, width: 180 }}
        />
        {chocaConOtro && (
          <div style={{ font: `400 11px/1.5 ${MONO}`, color: ALERTA, marginTop: 6 }}>
            Ya hay un tramo que empieza ese día. Con dos vigentes a la vez, el saldo de ese día
            dejaría de ser reproducible.
          </div>
        )}
      </div>

      <div style={field}>
        <div style={label}>Horas por día</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
          {SEMANA.map(({ clave, etiqueta }) => (
            <label key={clave} style={{ font: `400 11px/1.4 ${MONO}`, color: colors.ash }}>
              {etiqueta}
              <input
                type="time"
                value={horas[clave] ?? ''}
                onChange={(e) => setHoras((prev) => ({ ...prev, [clave]: e.target.value }))}
                style={{ ...input, width: '100%', marginTop: 4 }}
              />
            </label>
          ))}
        </div>
        <div style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginTop: 8 }}>
          Semana completa: {Math.floor(total / 60)} h {total % 60 > 0 ? `${total % 60} min` : ''}
        </div>
      </div>

      {error && (
        <div style={{ font: `400 12px/1.5 ${MONO}`, color: ALERTA, marginBottom: 16 }} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnGhost} onClick={onClose} disabled={guardando}>
          Cancelar
        </button>
        <button
          type="button"
          style={{ ...btn, opacity: puedeGuardar ? 1 : 0.45 }}
          onClick={guardar}
          disabled={!puedeGuardar}
        >
          {guardando ? 'Guardando' : 'Añadir tramo'}
        </button>
      </div>
    </Modal>
  );
}
