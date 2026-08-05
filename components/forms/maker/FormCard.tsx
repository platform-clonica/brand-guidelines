'use client';
import { useMemo } from 'react';
import { compileForm } from '@/lib/forms/compile';
import { isInputField } from '@/lib/forms/schema';
import { colors } from '@/components/deck/studio/ui';
import type { FormListItem } from '@/lib/forms/types';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const fmt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

/* Una tarjeta de formulario.

   No hay miniatura de portada como en la galería del deck: un formulario no tiene diapositiva 0.
   Lo que sí tiene identidad visual es su imagen de hero (`background` del frontmatter), así que
   se usa esa como fondo; sin ella, el fondo cálido de siempre.

   El markdown se compila aquí igual que la galería del deck compila la portada: es la única
   forma de que la tarjeta cuente campos reales y no un espejo que podría estar desfasado. */
export function FormCard({
  item,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  item: FormListItem;
  onOpen: (id: string) => void;
  onDuplicate: (item: FormListItem) => void;
  onDelete: (item: FormListItem) => void;
}) {
  const compiled = useMemo(() => compileForm(item.md ?? ''), [item.md]);
  const def = compiled.ok ? compiled.def : null;

  const fieldCount = def ? def.fields.filter(isInputField).length : null;
  const background = def?.background ?? null;
  const published = item.status === 'published';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={() => onOpen(item.id)}
        title="Abrir formulario"
        style={{
          appearance: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, border: 'none',
          background: 'transparent', display: 'block', width: '100%',
        }}
      >
        <div
          style={{
            position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden',
            border: `1px solid ${colors.warmDark}`, background: background ? `#2A2724 center/cover no-repeat url(${JSON.stringify(background).slice(1, -1)})` : colors.warmDark,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 14,
          }}
        >
          {/* Velo para que el texto se lea sobre cualquier foto. */}
          {background && (
            <span
              aria-hidden
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,26,23,.78), rgba(28,26,23,.15))' }}
            />
          )}

          <span
            style={{
              position: 'absolute', top: 10, left: 10, padding: '4px 8px',
              font: `500 9px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase',
              background: published ? colors.dark : 'transparent',
              color: published ? colors.warmLight : colors.ash,
              border: `1px solid ${published ? colors.dark : colors.ash}`,
            }}
          >
            {published ? 'Publicado' : 'Borrador'}
          </span>

          <span
            style={{
              position: 'relative',
              font: `500 13px/1.35 ${MONO}`,
              color: background ? colors.warmLight : colors.dark,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {item.title || 'Sin título'}
          </span>
          {item.client && (
            <span
              style={{
                position: 'relative', marginTop: 4,
                font: `400 10px/1.3 ${MONO}`,
                color: background ? 'rgba(245,242,237,.75)' : colors.ash,
              }}
            >
              {item.client}
            </span>
          )}
        </div>
      </button>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingLeft: 2 }}>
        <span style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash, flex: 1, minWidth: 0 }}>
          {fieldCount === null ? (
            <span style={{ color: '#99335F' }}>No compila</span>
          ) : (
            `${fieldCount} ${fieldCount === 1 ? 'campo' : 'campos'} · ${item.responses} ${item.responses === 1 ? 'respuesta' : 'respuestas'}`
          )}
        </span>
        <button
          onClick={() => onDuplicate(item)}
          title="Duplicar"
          aria-label={`Duplicar ${item.title}`}
          style={iconBtn}
        >
          ⧉
        </button>
        <button
          onClick={() => onDelete(item)}
          title="Eliminar"
          aria-label={`Eliminar ${item.title}`}
          style={{ ...iconBtn, color: '#99335F' }}
        >
          ✕
        </button>
      </div>

      <div style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash, paddingLeft: 2, marginTop: -6 }}>
        Editado el {fmt(item.updated_at)}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
  color: colors.ash, font: `500 12px/1 ${MONO}`, padding: 2,
};
