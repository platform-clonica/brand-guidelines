'use client';
/* La fila de un día: sus tramos, sus horas y su saldo.

   Se extrae porque la usan la semana y el mes, y son la misma fila. Duplicarla habría hecho que el
   día siguiente alguien arreglara una de las dos y el mismo día se leyera distinto según dónde se
   mirase — que es exactamente el tipo de incoherencia que este proyecto se dedica a evitar.

   En modo corrección despliega sus asientos. Los corregibles llegan YA CALCULADOS: decidir cuáles
   son es de `correctableEntries`, que tiene sus tests, y no de una fila de la interfaz. */

import type { CompileResult } from '@/lib/clock/compile';
import type { EntryRow } from '@/lib/clock/schema';
import { ASIENTO, etiquetaDia, formatMinutes, horaDe } from './formato';

export function DiaFila({
  resultado,
  esHoy,
  corrigiendo,
  corregibles,
  onCorregir,
}: {
  resultado: CompileResult;
  esHoy: boolean;
  corrigiendo: boolean;
  corregibles: EntryRow[];
  onCorregir: (entry: EntryRow) => void;
}) {
  const { day } = resultado;
  const saldo = day.balanceMinutes < 0 ? 'ixc-saldo--defecto' : 'ixc-saldo--exceso';

  /* El asiento que dejó el día sin cerrar, para el atajo «Arreglar este día».

     SE IDENTIFICA POR SU HORA, NO POR SU POSICIÓN EN LA LISTA. El tramo abierto es el que no tiene
     cierre, y su `from` es el `occurred_at` exacto de la entrada que lo abrió. Coger el último de
     `corregibles` funcionaría hoy —la ruta ordena por `seq`— pero `seq` es orden de inserción, no de
     hora: una corrección escrita después puede llevar una hora anterior, y entonces el último de la
     lista no es el que abrió nada.

     Si no se encuentra, no se ofrece el botón. Preseleccionar el asiento equivocado en un registro
     legal es peor que no dar el atajo, y el modo corrección sigue estando para ese caso. */
  const tramoAbierto = day.segments.find((s) => s.to === null);
  const asientoAbierto = tramoAbierto
    ? (corregibles.find((e) => e.occurred_at === tramoAbierto.from) ?? null)
    : null;

  return (
    /* El `id` es el ancla del salto desde el panel de incidencias. Va con prefijo porque un
       `id` que fuera solo la fecha chocaría con cualquier otro elemento del mismo día. */
    <div id={`ixc-dia-${day.workDate}`} className={`ixc-dia ${esHoy ? 'ixc-dia--hoy' : ''}`}>
      <span className="ixc-dia__fecha">{etiquetaDia(day.workDate)}</span>

      <span className="ixc-dia__tramos">
        {day.segments.length === 0
          ? '—'
          : day.segments.map((s) => `${horaDe(s.from)}–${s.to ? horaDe(s.to) : ''}`).join('  ')}
      </span>

      <span className="ixc-dia__horas">{formatMinutes(day.workedMinutes)}</span>
      <span className={`ixc-dia__saldo ixc-saldo ${saldo}`}>{formatMinutes(day.balanceMinutes)}</span>

      {/* El caso frecuente de verdad: ayer se quedó sin cerrar. Hasta ahora la única vía era
          encender el modo corrección, que revela los asientos de TODOS los días para arreglar uno.
          Aquí está el atajo, y solo aquí: nunca en hoy, porque el día de hoy está abierto todas las
          horas que llevas dentro y ofrecer «arreglar» mientras trabajas sería alarmar por lo
          normal. Abre el mismo modal y escribe un asiento nuevo con su motivo: no se salta ninguna
          regla, solo se adelanta el acceso. */}
      {!corrigiendo && !esHoy && asientoAbierto && (
        <button
          type="button"
          className="ixc-btn ixc-btn--ghost ixc-arreglar"
          onClick={() => onCorregir(asientoAbierto)}
        >
          Arreglar este día
        </button>
      )}

      {corrigiendo && (
        <div className="ixc-asientos">
          {corregibles.map((e) => (
            <button key={e.id} type="button" className="ixc-asiento" onClick={() => onCorregir(e)}>
              {ASIENTO[e.kind] ?? e.kind} {horaDe(e.occurred_at)}
            </button>
          ))}
          {corregibles.length === 0 && (
            <span className="ixc-aviso-correccion">Sin asientos que corregir</span>
          )}
        </div>
      )}
    </div>
  );
}
