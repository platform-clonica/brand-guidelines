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
