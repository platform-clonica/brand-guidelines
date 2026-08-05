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
import { FilterBar, SearchField } from '@/components/studio/GalleryFilters';
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
  const [clientFilter, setClientFilter] = useState<string | null>(null);
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

  /* Los clientes salen de los formularios que hay, no de una tabla: aquí el cliente es texto
     libre del frontmatter, así que la lista es la de valores realmente en uso. */
  const clientNames = useMemo(() => {
    const set = new Set<string>();
    (items ?? []).forEach((it) => it.client && set.add(it.client));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
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
      if (clientFilter && it.client !== clientFilter) return false;
      if (selectedTags.length && !selectedTags.every((t) => (it.tags ?? []).includes(t))) return false;
      return true;
    });
  }, [items, search, selectedTags, clientFilter]);

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
          position: 'relative',
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

        {/* Centrado respecto a la cabecera, no al hueco que queda. Igual que en DeckMaker. */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(380px, 42%)',
          }}
        >
          <SearchField value={search} onChange={setSearch} label="Buscar formularios por título o cliente" width={380} />
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 64px' }}>
        {/* Cliente + etiquetas. El buscador ya vive arriba, en la cabecera. */}
        <FilterBar
          clients={clientNames}
          client={clientFilter}
          onClient={setClientFilter}
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
        />

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
