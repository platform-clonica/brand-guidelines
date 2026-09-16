'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConflictError, createDesignSystem, deleteDesignSystem, duplicateDesignSystem, listDesignSystems, updateDesignSystem } from '@/lib/ds/api';
import { defaultBrand } from '@/lib/ds/engine/presets';
import { filterSystems, galleryFacets } from '@/lib/ds/gallery';
import { interactiusTemplate } from '@/lib/ds/template';
import type { DesignSystemListItem, DsStatus } from '@/lib/ds/types';
import { DsLogo } from '@/components/studio/Wordmark';
import { ConfirmModal } from '@/components/deck/studio/ConfirmModal';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { FilterBar, SearchField } from '@/components/studio/GalleryFilters';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { colors } from '@/components/deck/studio/ui';
import { DsCard } from './DsCard';
import { DsExportModal } from './DsExportModal';
import { DsMetaModal, type DsMetaValues } from './DsMetaModal';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const STATUSES: { value: DsStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
];

type Pending =
  | { mode: 'new' }
  | { mode: 'duplicate'; item: DesignSystemListItem }
  | { mode: 'edit'; item: DesignSystemListItem }
  | { mode: 'export'; item: DesignSystemListItem };

const byUpdated = (a: DesignSystemListItem, b: DesignSystemListItem) => b.updated_at.localeCompare(a.updated_at);

/* Galería de DSMak_r: buscador predictivo + filtros por cliente, estado y etiqueta + rejilla.
   Calco de FormGallery; la lógica de filtro y exportación vive en lib/ds/gallery.ts, testeada en node.
   La primera celda es "Crear design system". Las tarjetas llevan a /workspace/dsmak_r/[id]. */
export function DsGallery() {
  const router = useRouter();
  const [items, setItems] = useState<DesignSystemListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DsStatus | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [toDelete, setToDelete] = useState<DesignSystemListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = () =>
    listDesignSystems()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'));

  useEffect(() => {
    reload();
  }, []);

  const facets = useMemo(() => galleryFacets(items ?? []), [items]);

  const filtered = useMemo(
    () => filterSystems(items ?? [], { search, client: clientFilter, tags: selectedTags, status: statusFilter }),
    [items, search, clientFilter, selectedTags, statusFilter],
  );

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const open = (id: string) => router.push(`/workspace/dsmak_r/${id}`);

  const onCreate = async (values: DsMetaValues) => {
    const seed = values.start === 'interactius' ? interactiusTemplate() : { brand: defaultBrand(), overrides: {} };
    const rec = await createDesignSystem({
      brand: { ...seed.brand, name: values.name, client: values.client || null },
      overrides: seed.overrides,
      tags: values.tags,
    });
    open(rec.id);
  };

  const onDuplicate = (item: DesignSystemListItem) => async (values: DsMetaValues) => {
    const rec = await duplicateDesignSystem(item.id, { name: values.name, client: values.client || null, tags: values.tags });
    open(rec.id);
  };

  /* Renombrar no pasa por la marca: la API reescribe nombre y cliente sin recalcular tokens (plan, H4).
     Si otra pestaña guardó entre medias, se recarga el listado para que el siguiente intento parta de
     lo que hay. */
  const onRename = (item: DesignSystemListItem) => async (values: DsMetaValues) => {
    try {
      const rec = await updateDesignSystem(item.id, {
        expectedUpdatedAt: item.updated_at,
        name: values.name,
        client: values.client || null,
        tags: values.tags,
      });
      setItems((prev) =>
        (prev ?? [])
          .map((it) => (it.id === rec.id ? { ...it, name: rec.name, client: rec.client, tags: rec.tags, updated_at: rec.updated_at } : it))
          .sort(byUpdated),
      );
      setPending(null);
    } catch (e) {
      if (!(e instanceof ConflictError)) throw e;
      await reload();
      setPending(null);
      setError(`«${item.name}» se ha guardado desde otra pestaña mientras lo renombrabas. La galería se ha recargado: vuelve a intentarlo.`);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteDesignSystem(toDelete.id);
      const id = toDelete.id;
      setItems((prev) => (prev ?? []).filter((it) => it.id !== id));
      setToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setDeleting(false);
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
        <DsLogo height={22} />
        <span style={{ marginLeft: 'auto' }} />
        <LogoutButton />

        {/* Centrado respecto a la cabecera, no al hueco que queda. Igual que en DeckMak_r y FormMak_r. */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(380px, 42%)',
          }}
        >
          <SearchField value={search} onChange={setSearch} label="Buscar design systems por nombre, cliente o etiqueta" width={380} />
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 64px' }}>
        <FilterBar
          clients={facets.clients}
          client={clientFilter}
          onClient={setClientFilter}
          allTags={facets.tags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          statuses={items && items.length > 0 ? STATUSES : []}
          status={statusFilter}
          onStatus={(s) => setStatusFilter(s as DsStatus | null)}
        />

        {error && <div style={{ font: `400 12px/1.4 ${MONO}`, color: '#99335F', marginBottom: 20 }} role="alert">{error}</div>}

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
            {/* Mono a 400: IBM Plex Mono admite 400/500/600 (lib/tokens.ts). */}
            <span aria-hidden style={{ font: `400 40px/1 ${MONO}`, color: colors.dark }}>+</span>
            <span style={{ font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', color: colors.dark }}>
              Crear design system
            </span>
          </button>

          {items === null && !error && (
            <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash, alignSelf: 'center' }}>Cargando</div>
          )}
          {filtered.map((it) => (
            <DsCard
              key={it.id}
              item={it}
              onOpen={open}
              onRename={(item) => setPending({ mode: 'edit', item })}
              onExport={(item) => setPending({ mode: 'export', item })}
              onDuplicate={(item) => setPending({ mode: 'duplicate', item })}
              onDelete={setToDelete}
            />
          ))}
        </div>

        {items && items.length === 0 && (
          <div style={{ font: `400 12px/1.6 ${MONO}`, color: colors.ash, marginTop: 24 }}>
            Aún no hay design systems. Crea el primero con el botón de arriba.
          </div>
        )}
        {items && items.length > 0 && filtered.length === 0 && (
          <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash, marginTop: 24 }}>
            No hay design systems que coincidan con el filtro.
          </div>
        )}
      </div>

      {pending?.mode === 'new' && (
        <DsMetaModal mode="new" allTags={facets.tags} onClose={() => setPending(null)} onSubmit={onCreate} />
      )}
      {pending?.mode === 'duplicate' && (
        <DsMetaModal
          mode="duplicate"
          allTags={facets.tags}
          hint="La copia nace como borrador, con los mismos tokens y la misma versión del motor, y con su propia copia de los logos."
          initial={{ name: `${pending.item.name} (copia)`, client: pending.item.client ?? '', tags: pending.item.tags }}
          onClose={() => setPending(null)}
          onSubmit={onDuplicate(pending.item)}
        />
      )}
      {pending?.mode === 'edit' && (
        <DsMetaModal
          mode="edit"
          allTags={facets.tags}
          initial={{ name: pending.item.name, client: pending.item.client ?? '', tags: pending.item.tags }}
          onClose={() => setPending(null)}
          onSubmit={onRename(pending.item)}
        />
      )}
      {pending?.mode === 'export' && <DsExportModal item={pending.item} onClose={() => setPending(null)} />}

      {toDelete && (
        <ConfirmModal
          title="Eliminar design system"
          message={`Se borrará «${toDelete.name}», con sus logos. Esta acción no se puede deshacer.`}
          confirmLabel={deleting ? 'Eliminando' : 'Eliminar'}
          danger
          onConfirm={confirmDelete}
          onClose={() => !deleting && setToDelete(null)}
        />
      )}
    </div>
  );
}
