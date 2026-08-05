'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';

/* Buscador y filtros de una galería. Compartidos por DeckMaker y FormMaker: el gesto de
   buscar y filtrar es uno solo, aunque lo que se busque sea una presentación o un formulario.

   Lo que cambia entre las dos es solo el texto (qué se busca, cómo se llama el "cliente"),
   y eso viaja por props. */

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* ── Buscador, dentro de la cabecera ──
   Sus medidas son las de `toolbarBtn` (padding 9/12, 11px mono): así la cabecera de la galería
   mide exactamente lo mismo que la barra del editor y las dos chrome se leen como una. */
export function SearchField({
  value,
  onChange,
  label,
  width = 380,
}: {
  value: string;
  onChange: (v: string) => void;
  /** aria-label: di qué se busca ("Buscar formularios por título o cliente"). */
  label: string;
  width?: number;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: `min(${width}px, 100%)`,
        padding: '8px 12px', border: `1px solid ${colors.warmDark}`, background: colors.white,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={colors.ash} strokeWidth="1.4" aria-hidden style={{ flexShrink: 0 }}>
        <circle cx="7" cy="7" r="4.5" />
        <line x1="10.5" y1="10.5" x2="14" y2="14" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar"
        aria-label={label}
        style={{
          flex: 1, minWidth: 0, appearance: 'none', border: 'none', outline: 'none',
          background: 'transparent', font: `400 12px/1.2 ${MONO}`, color: colors.dark,
        }}
      />
    </div>
  );
}

/* ── Fila de filtros: cliente (desplegable) + etiquetas (píldoras) ──
   El desplegable lleva el mismo traje que las píldoras — mismo borde, misma tipografía, misma
   inversión al estar activo — porque hace lo mismo que ellas: acotar la rejilla. */
export function FilterBar({
  clients,
  client,
  onClient,
  allTags,
  selectedTags,
  onToggleTag,
  allClientsLabel = 'Todos los clientes',
}: {
  clients: string[];
  client: string | null;
  onClient: (c: string | null) => void;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (t: string) => void;
  allClientsLabel?: string;
}) {
  if (!clients.length && !allTags.length) return null;
  const on = client !== null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
      {clients.length > 0 && (
        <ClientDropdown
          clients={clients}
          client={client}
          onClient={onClient}
          allLabel={allClientsLabel}
          active={on}
        />
      )}

      {allTags.map((t) => {
        const active = selectedTags.includes(t);
        return (
          <button
            key={t}
            onClick={() => onToggleTag(t)}
            aria-pressed={active}
            style={{
              ...chip,
              cursor: 'pointer',
              borderColor: active ? colors.dark : colors.warmDark,
              background: active ? colors.dark : colors.white,
              color: active ? colors.warmLight : colors.ash,
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/* El desplegable de cliente, con lista propia.
   Un <select> nativo era media solución: el botón se puede vestir, pero la lista que abre la
   pinta el sistema operativo y en macOS ignora casi todo el CSS. Así que la lista es nuestra,
   con el traje del panel de "Abrir ▾" (`menuPanel`/`menuRow` de studio/ui) ajustado a la píldora:
   fondo blanco, filete de tinta, filas separadas por el borde cálido. */
function ClientDropdown({
  clients,
  client,
  onClient,
  allLabel,
  active,
}: {
  clients: string[];
  client: string | null;
  onClient: (c: string | null) => void;
  allLabel: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Escape cierra y devuelve el foco al disparador: quien abrió con el teclado no se queda perdido.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const pick = (value: string | null) => {
    onClient(value);
    setOpen(false);
  };

  const options: { value: string | null; label: string }[] = [
    { value: null, label: allLabel },
    ...clients.map((c) => ({ value: c as string | null, label: c })),
  ];

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Filtrar por cliente: ${client ?? allLabel}`}
        style={{
          ...chip,
          display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          borderColor: active || open ? colors.dark : colors.warmDark,
          background: active ? colors.dark : colors.white,
          color: active ? colors.warmLight : colors.ash,
        }}
      >
        {client ?? allLabel}
        <span aria-hidden style={{ font: `500 8px/1 ${MONO}`, opacity: .8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {/* Fondo transparente para cerrar al pulsar fuera — mismo recurso que en "Abrir ▾". */}
          <span style={{ position: 'fixed', inset: 0, zIndex: 40 }} onMouseDown={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 41,
              minWidth: '100%', maxWidth: 'min(320px, 80vw)', maxHeight: 280, overflowY: 'auto',
              background: colors.white, border: `1px solid ${colors.dark}`, textAlign: 'left',
            }}
          >
            {options.map((o, i) => {
              const selected = o.value === client;
              const over = hovered === (o.value ?? '');
              return (
                <button
                  key={o.value ?? '__all__'}
                  onClick={() => pick(o.value)}
                  onMouseEnter={() => setHovered(o.value ?? '')}
                  onMouseLeave={() => setHovered(null)}
                  aria-current={selected || undefined}
                  style={{
                    appearance: 'none', display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
                    border: 'none',
                    borderBottom: i < options.length - 1 ? `1px solid ${colors.warmDark}` : 'none',
                    font: `500 11px/1.2 ${MONO}`, letterSpacing: '.04em',
                    background: selected ? colors.dark : over ? colors.warmLight : colors.white,
                    color: selected ? colors.warmLight : colors.dark,
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </span>
  );
}

const chip: CSSProperties = {
  appearance: 'none', padding: '8px 16px', border: `1px solid ${colors.warmDark}`,
  font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', borderRadius: 0,
};
