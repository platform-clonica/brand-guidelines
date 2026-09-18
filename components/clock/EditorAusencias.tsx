'use client';
/* Ausencias de una persona: declararlas y quitarlas.

   Una ausencia no lleva tipo médico, y no es un olvido: el motivo de una baja es dato de salud y no
   tiene por qué vivir en una herramienta que administración consulta a diario. Que conste el día no
   trabajado basta para el registro.

   Aquí SÍ se borra, y es la única tabla de la herramienta donde eso pasa: una ausencia es
   configuración del calendario, no un asiento. El libro de fichajes no tiene borrado ni lo tendrá. */

import { useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors, field, input, label } from '@/components/deck/studio/ui';
import { todayIn } from '@/lib/clock/dates';
import type { ClockAbsenceRow } from '@/lib/clock/types';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERTA = 'var(--c-bordeaux, #99335F)';

const TIPOS = [
  { valor: 'vacaciones', etiqueta: 'Vacaciones' },
  { valor: 'ausencia_justificada', etiqueta: 'Ausencia justificada' },
  { valor: 'ausencia', etiqueta: 'Ausencia' },
];

export function EditorAusencias({
  nombre,
  ausencias,
  onClose,
  onCrear,
  onBorrar,
}: {
  nombre: string;
  ausencias: ClockAbsenceRow[];
  onClose: () => void;
  onCrear: (input: { fromDate: string; toDate: string; kind: string; note?: string }) => Promise<void>;
  onBorrar: (id: string) => Promise<void>;
}) {
  const [fromDate, setFromDate] = useState(todayIn());
  const [toDate, setToDate] = useState(todayIn());
  const [kind, setKind] = useState('vacaciones');
  const [note, setNote] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alReves = fromDate > toDate;
  const puedeGuardar = !alReves && !!fromDate && !!toDate && !guardando;

  const crear = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      await onCrear({ fromDate, toDate, kind, note: note.trim() || undefined });
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo declarar la ausencia.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title={`Ausencias de ${nombre}`} onClose={onClose} width={560}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 6 }}>
        <div>
          <label style={label} htmlFor="ixc-desde-a">Desde</label>
          <input id="ixc-desde-a" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ ...input, width: 150 }} />
        </div>
        <div>
          <label style={label} htmlFor="ixc-hasta-a">Hasta</label>
          <input id="ixc-hasta-a" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ ...input, width: 150 }} />
        </div>
        <div>
          <label style={label} htmlFor="ixc-tipo-a">Tipo</label>
          <select id="ixc-tipo-a" value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...input, width: 190 }}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Los dos extremos entran dentro: un día suelto es la misma fecha en los dos campos. */}
      <div style={{ font: `400 11px/1.5 ${MONO}`, color: alReves ? ALERTA : colors.ash, marginBottom: 14 }}>
        {alReves ? 'La ausencia acaba antes de empezar.' : 'Los dos días entran dentro. Para un día suelto, la misma fecha en los dos campos.'}
      </div>

      <div style={field}>
        <label style={label} htmlFor="ixc-nota-a">Nota (opcional)</label>
        <input id="ixc-nota-a" value={note} onChange={(e) => setNote(e.target.value)} style={input} />
      </div>

      {error && (
        <div style={{ font: `400 12px/1.5 ${MONO}`, color: ALERTA, marginBottom: 12 }} role="alert">{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 24 }}>
        <button type="button" style={{ ...btn, opacity: puedeGuardar ? 1 : 0.45 }} onClick={crear} disabled={!puedeGuardar}>
          {guardando ? 'Guardando' : 'Declarar ausencia'}
        </button>
      </div>

      <div style={label}>Declaradas</div>
      <div style={{ border: `1px solid ${colors.warmDark}`, marginTop: 8 }}>
        {ausencias.length === 0 && (
          <div style={{ font: `400 12px/1.5 ${MONO}`, color: colors.ash, padding: 14 }}>Ninguna en este periodo.</div>
        )}
        {ausencias.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 14px', borderTop: `1px solid ${colors.warmDark}`, font: `400 12px/1.5 ${MONO}` }}>
            <span>{a.from_date} → {a.to_date}</span>
            <span style={{ color: colors.ash }}>{TIPOS.find((t) => t.valor === a.kind)?.etiqueta ?? a.kind}</span>
            {a.note && <span style={{ color: colors.ash }}>{a.note}</span>}
            <button type="button" style={{ ...btnGhost, marginLeft: 'auto', padding: '5px 9px' }} onClick={() => void onBorrar(a.id)}>
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" style={btnGhost} onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}
