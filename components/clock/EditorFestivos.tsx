'use client';
/* Los festivos del año. Se cargan a mano una vez al año y los ve todo el equipo.

   Sin ellos, un festivo cuenta como día laborable y le resta ocho horas de saldo a toda la
   plantilla el mismo día. Es la carga de datos que más silenciosamente falsea el registro, y por
   eso la pantalla dice cuántos hay: cero festivos en un año es una señal, no un estado normal.

   El ámbito va en ASCII y minúscula, como lo declara la tabla; la etiqueta con eñe es de aquí. */

import { useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors, input, label } from '@/components/deck/studio/ui';
import type { ClockCalendarDayRow } from '@/lib/clock/types';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERTA = 'var(--c-bordeaux, #99335F)';

const AMBITOS = [
  { valor: 'nacional', etiqueta: 'Nacional' },
  { valor: 'cataluna', etiqueta: 'Cataluña' },
  { valor: 'barcelona', etiqueta: 'Barcelona' },
];

export function EditorFestivos({
  year,
  festivos,
  onClose,
  onCrear,
  onBorrar,
}: {
  year: number;
  festivos: ClockCalendarDayRow[];
  onClose: () => void;
  onCrear: (input: { day: string; name: string; scope: string }) => Promise<void>;
  onBorrar: (id: string) => Promise<void>;
}) {
  const [day, setDay] = useState(`${year}-01-01`);
  const [name, setName] = useState('');
  const [scope, setScope] = useState('nacional');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeGuardar = !!name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(day) && !guardando;

  const crear = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      await onCrear({ day, name: name.trim(), scope });
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo añadir el festivo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title={`Festivos de ${year}`} onClose={onClose} width={560}>
      {festivos.length === 0 && (
        <div style={{ font: `400 12px/1.6 ${MONO}`, color: ALERTA, marginBottom: 18 }}>
          No hay ningún festivo cargado en {year}. Hasta que los haya, cada festivo cuenta como día
          laborable y resta jornada a todo el equipo.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={label} htmlFor="ixc-dia-f">Día</label>
          <input id="ixc-dia-f" type="date" value={day} onChange={(e) => setDay(e.target.value)} style={{ ...input, width: 150 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={label} htmlFor="ixc-nombre-f">Nombre</label>
          <input id="ixc-nombre-f" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fiesta Nacional" style={{ ...input, width: '100%' }} />
        </div>
        <div>
          <label style={label} htmlFor="ixc-ambito-f">Ámbito</label>
          <select id="ixc-ambito-f" value={scope} onChange={(e) => setScope(e.target.value)} style={{ ...input, width: 150 }}>
            {AMBITOS.map((a) => (
              <option key={a.valor} value={a.valor}>{a.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ font: `400 12px/1.5 ${MONO}`, color: ALERTA, margin: '12px 0' }} role="alert">{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', margin: '16px 0 24px' }}>
        <button type="button" style={{ ...btn, opacity: puedeGuardar ? 1 : 0.45 }} onClick={crear} disabled={!puedeGuardar}>
          {guardando ? 'Guardando' : 'Añadir festivo'}
        </button>
      </div>

      <div style={label}>Cargados ({festivos.length})</div>
      <div style={{ border: `1px solid ${colors.warmDark}`, marginTop: 8, maxHeight: 280, overflowY: 'auto' }}>
        {festivos.map((f) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 14px', borderTop: `1px solid ${colors.warmDark}`, font: `400 12px/1.5 ${MONO}` }}>
            <span>{f.day}</span>
            <span>{f.name}</span>
            <span style={{ color: colors.ash }}>{AMBITOS.find((a) => a.valor === f.scope)?.etiqueta ?? f.scope}</span>
            <button type="button" style={{ ...btnGhost, marginLeft: 'auto', padding: '5px 9px' }} onClick={() => void onBorrar(f.id)}>
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
