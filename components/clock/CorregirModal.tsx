'use client';
/* Corregir o anular un asiento.

   NADA DE ESTO REESCRIBE NADA. Corregir escribe un asiento NUEVO que apunta al viejo con su motivo,
   y el viejo se queda a la vista: es lo que permite a la vez que las cuentas cuadren y que se pueda
   reconstruir quién cambió qué y por qué. Por eso el botón dice «Guardar corrección» y no «Guardar».

   Dos de las tres condiciones no negociables viven aquí:
   - No se escribe nada hasta confirmar el motivo: sin motivo, el botón está deshabilitado.
   - El valor anterior sigue visible junto al nuevo.
   La tercera —que el control de edición no esté activo por defecto— no es de este componente: es el
   interruptor de modo corrección de la pantalla. Aquí dentro ya se ha decidido corregir.

   Estilos en línea de ui.ts y no la hoja de Clock_r: un modal no necesita puntos de ruptura y vive
   en el chrome compartido, igual que ConfirmModal y DsMetaModal. */

import { useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors, field, input, label } from '@/components/deck/studio/ui';
import { instantAt } from '@/lib/clock/dates';
import type { EntryRow } from '@/lib/clock/schema';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERTA = 'var(--c-bordeaux, #99335F)';

const NOMBRE: Record<string, string> = {
  in: 'Entrada',
  out: 'Salida',
  break_start: 'Inicio de pausa',
  break_end: 'Fin de pausa',
};

const horaDe = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });

export type CorreccionInput = {
  op: 'amend' | 'annul';
  occurredAt: string;
  reason: string;
};

export function CorregirModal({
  entry,
  onClose,
  onSubmit,
}: {
  entry: EntryRow;
  onClose: () => void;
  onSubmit: (input: CorreccionInput) => Promise<void>;
}) {
  const anterior = horaDe(entry.occurred_at);

  const [op, setOp] = useState<'amend' | 'annul'>('amend');
  const [hora, setHora] = useState(anterior);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeGuardar = motivo.trim().length > 0 && !guardando;

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({
        op,
        /* Al anular, la hora es la del propio asiento: no se está diciendo otra hora, se está
           diciendo que ese fichaje no debió existir. La hora corregida solo tiene sentido al
           enmendar, y se convierte a instante con la zona del registro, nunca con la del navegador. */
        occurredAt: op === 'annul' ? entry.occurred_at : instantAt(entry.work_date, hora),
        reason: motivo.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la corrección.');
      setGuardando(false);
    }
  };

  return (
    <Modal title={`Corregir ${NOMBRE[entry.kind] ?? entry.kind}`} onClose={onClose} width={480}>
      <div style={{ font: `400 12px/1.6 ${MONO}`, color: colors.ash, marginBottom: 20 }}>
        {entry.work_date} · {NOMBRE[entry.kind] ?? entry.kind} a las {anterior}
      </div>

      <div style={field}>
        <div style={label}>Qué hacer</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={op === 'amend' ? btn : btnGhost} onClick={() => setOp('amend')}>
            Cambiar la hora
          </button>
          <button type="button" style={op === 'annul' ? btn : btnGhost} onClick={() => setOp('annul')}>
            Anular el asiento
          </button>
        </div>
      </div>

      {op === 'amend' && (
        <div style={field}>
          <label style={label} htmlFor="ixc-hora">
            Hora corregida
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              id="ixc-hora"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              style={{ ...input, width: 140 }}
            />
            {/* El valor anterior sigue a la vista: sin esto, corregir es escribir a ciegas. */}
            <span style={{ font: `400 12px/1 ${MONO}`, color: colors.ash }}>Antes: {anterior}</span>
          </div>
        </div>
      )}

      <div style={field}>
        <label style={label} htmlFor="ixc-motivo">
          Motivo
        </label>
        <input
          id="ixc-motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Olvidé fichar la salida"
          style={input}
        />
        <div style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginTop: 6 }}>
          Queda registrado con tu nombre y la hora en que lo escribes. El asiento original no se
          borra: sigue en el registro.
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
          {guardando ? 'Guardando' : 'Guardar corrección'}
        </button>
      </div>
    </Modal>
  );
}
