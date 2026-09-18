'use client';
/* El aviso de protección de datos, al primer acceso y antes de poder fichar.

   NO BLOQUEA LA PANTALLA. Deshabilita el botón de fichar y deja mirar: la definición dice «antes de
   poder fichar», no «antes de poder mirar». Un modal del que no se puede salir para ver tu propio
   registro sería desproporcionado, y la gente aprende a cerrar de un clic lo que le estorba — que
   es justo lo contrario de lo que un aviso pretende.

   El texto viene de lib/clock/policy.ts y HOY ES UN MARCADOR declarado. Ver allí. */

import { useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors } from '@/components/deck/studio/ui';
import { POLICY_TEXTO, POLICY_TITULO } from '@/lib/clock/policy';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERTA = 'var(--c-bordeaux, #99335F)';

export function AvisoProteccionDatos({
  onClose,
  onAceptar,
}: {
  onClose: () => void;
  onAceptar: () => Promise<void>;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aceptar = async () => {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await onAceptar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la aceptación.');
      setGuardando(false);
    }
  };

  return (
    <Modal title={POLICY_TITULO} onClose={onClose} width={620}>
      {POLICY_TEXTO.map((parrafo, n) => (
        <p
          key={n}
          style={{
            font: `400 12px/1.65 ${MONO}`,
            color: n === 0 ? ALERTA : colors.dark,
            margin: '0 0 14px',
          }}
        >
          {parrafo}
        </p>
      ))}

      {error && (
        <p style={{ font: `400 12px/1.5 ${MONO}`, color: ALERTA }} role="alert">
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" style={btnGhost} onClick={onClose} disabled={guardando}>
          Ahora no
        </button>
        <button type="button" style={btn} onClick={aceptar} disabled={guardando}>
          {guardando ? 'Guardando' : 'He leído y acepto'}
        </button>
      </div>
    </Modal>
  );
}
