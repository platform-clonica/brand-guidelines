'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createForm, deleteForm, getForm, listForms } from '@/lib/forms/api';
import { newFormMd, newPublicId } from '@/lib/forms/templates';
import { duplicateMd } from '@/lib/forms/edit';
import type { FormListItem } from '@/lib/forms/types';
import { FormLogo } from '@/components/studio/Wordmark';
import { ConfirmModal } from '@/components/deck/studio/ConfirmModal';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { colors } from '@/components/deck/studio/ui';
import { FormMetaModal, type FormMetaValues } from './FormMetaModal';
import { FormCard } from './FormCard';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const SEARCH_MIN = 3; // filtro predictivo, desde el 3.er carácter (igual que la galería del deck)

type Pending = { mode: 'new' } | { mode: 'duplicate'; source: FormListItem; md: string };

/* Dispatcher de FormMaker: buscador predictivo + filtros por etiqueta + rejilla de formularios.
   La primera celda es "Crear nuevo formulario". Las tarjetas llevan a /workspace/formmak_r/[id]. */
export function FormGallery() {
  const router = useRouter();
  const [items, setItems] = useState<FormListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [toDelete, setToDelete] = useState<FormListItem | null>(null);

  const reload = () =>
    listForms()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'));

  useEffect(() => {
    reload();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (items ?? []).forEach((it) => (it.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [items]);

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  /* Busca en título Y cliente. La galería del deck solo mira su `commercial_id` aunque tenga el
     nombre del cliente cargado; aquí no repetimos esa carencia. */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const applyQuery = q.length >= SEARCH_MIN;
    return (items ?? []).filter((it) => {
      if (applyQuery) {
        const haystack = `${it.title} ${it.client ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (selectedTags.length && !selectedTags.every((t) => (it.tags ?? []).includes(t))) return false;
      return true;
    });
  }, [items, search, selectedTags]);

  const onCreate = async (values: FormMetaValues) => {
    const md = newFormMd({ title: values.title, client: values.client || undefined, accent: values.accent });
    const rec = await createForm({ md, tags: values.tags });
    router.push(`/workspace/formmak_r/${rec.id}`);
  };

  const onDuplicateSubmit = (source: string) => async (values: FormMetaValues) => {
    const md = duplicateMd(source, {
      publicId: newPublicId(),
      title: values.title,
      client: values.client || undefined,
      accent: values.accent,
    });
    const rec = await createForm({ md, tags: values.tags });
    router.push(`/workspace/formmak_r/${rec.id}`);
  };

  const startDuplicate = async (item: FormListItem) => {
    const full = await getForm(item.id);
    setPending({ mode: 'duplicate', source: item, md: full.md });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      await deleteForm(target.id);
      setItems((prev) => (prev ?? []).filter((f) => f.id !== target.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.warmLight, color: colors.dark }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight,
        }}
      >
        {/* Imagotipo → landing de apps; el wordmark de la herramienta es identidad, no enlace. */}
        <BrandMark height={20} href="/workspace" label="Ir a la landing de aplicaciones" />
        <MarkDivider />
        <FormLogo height={22} />
        <span style={{ marginLeft: 'auto' }} />
        <LogoutButton />
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 64px' }}>
        {/* Buscador */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: 'min(520px, 100%)',
              padding: '14px 18px', border: `1px solid ${colors.dark}`, background: colors.white,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={colors.ash} strokeWidth="1.4" aria-hidden style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="4.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar"
              aria-label="Buscar formularios por título o cliente"
              style={{
                flex: 1, minWidth: 0, appearance: 'none', border: 'none', outline: 'none',
                background: 'transparent', font: `400 14px/1.2 ${MONO}`, color: colors.dark,
              }}
            />
          </div>
        </div>

        {/* Filtros por etiqueta */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
            {allTags.map((t) => {
              const on = selectedTags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  aria-pressed={on}
                  style={{
                    appearance: 'none', cursor: 'pointer', padding: '8px 16px',
                    border: `1px solid ${on ? colors.dark : colors.warmDark}`,
                    background: on ? colors.dark : colors.white, color: on ? colors.warmLight : colors.ash,
                    font: `500 11px/1 ${MONO}`, letterSpacing: '.04em',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}

        {error && <div style={{ font: `400 12px/1.4 ${MONO}`, color: '#99335F', marginBottom: 20 }}>{error}</div>}

        {/* Rejilla */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
            gap: 28,
            alignItems: 'start',
          }}
        >
          <button
            onClick={() => setPending({ mode: 'new' })}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.white)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            style={{
              appearance: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent',
              border: `2px solid ${colors.dark}`, aspectRatio: '16 / 9', transition: 'background .15s',
            }}
          >
            <span aria-hidden style={{ font: `300 40px/1 ${MONO}`, color: colors.dark }}>+</span>
            <span style={{ font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', color: colors.dark }}>
              Crear nuevo formulario
            </span>
          </button>

          {items === null && (
            <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash, alignSelf: 'center' }}>Cargando…</div>
          )}
          {items &&
            filtered.map((it) => (
              <FormCard
                key={it.id}
                item={it}
                onOpen={(id) => router.push(`/workspace/formmak_r/${id}`)}
                onDuplicate={startDuplicate}
                onDelete={setToDelete}
              />
            ))}
        </div>

        {/* Estados vacíos, ambos explícitos. */}
        {items && items.length === 0 && (
          <div style={{ font: `400 12px/1.6 ${MONO}`, color: colors.ash, marginTop: 24 }}>
            Aún no hay formularios. Crea el primero con el botón de arriba.
          </div>
        )}
        {items && items.length > 0 && filtered.length === 0 && (
          <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash, marginTop: 24 }}>
            No hay formularios que coincidan con el filtro.
          </div>
        )}
      </div>

      {pending?.mode === 'new' && (
        <FormMetaModal
          mode="new"
          allTags={allTags}
          onClose={() => setPending(null)}
          onSubmit={onCreate}
        />
      )}
      {pending?.mode === 'duplicate' && (
        <FormMetaModal
          mode="duplicate"
          allTags={allTags}
          hint="La copia nace como borrador y con un id nuevo, así que no hereda las respuestas del original."
          initial={{
            title: `${pending.source.title} (copia)`,
            client: pending.source.client ?? '',
            tags: pending.source.tags,
          }}
          onClose={() => setPending(null)}
          onSubmit={onDuplicateSubmit(pending.md)}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title="Eliminar formulario"
          message={
            toDelete.responses > 0
              ? `Se borrará "${toDelete.title}". Sus ${toDelete.responses} ${toDelete.responses === 1 ? 'respuesta se conserva' : 'respuestas se conservan'} en la base de datos, pero ya no se podrán exportar desde aquí. Descarga el CSV antes si lo necesitas.`
              : `Se borrará "${toDelete.title}". No tiene respuestas.`
          }
          confirmLabel="Eliminar"
          danger
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
