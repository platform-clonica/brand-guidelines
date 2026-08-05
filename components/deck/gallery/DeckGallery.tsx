'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compileDeck } from '@/lib/deck';
import { TEMPLATES } from '@/lib/deck/templates';
import type { ClientRecord, DeckListItem } from '@/lib/decks/types';
import { createDeck, deleteDeck, getDeck, listClients, listDecks } from '@/lib/decks/api';
import { DeckMetaModal, type MetaValues } from '../studio/DeckMetaModal';
import { ConfirmModal } from '../studio/ConfirmModal';
import { SlideThumb } from '../studio/SlideThumb';
import { DeckLogo } from '../studio/DeckLogo';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { CardActions } from '@/components/studio/CardActions';
import { FilterBar, SearchField } from '@/components/studio/GalleryFilters';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { colors } from '../studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const SEARCH_MIN = 3; // predictive filter kicks in from the 3rd character

const fmt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

/* Crear y duplicar comparten modal: la única diferencia es el markdown de partida — la plantilla
   del tipo elegido, o el del deck que se copia. Mismo trato que en FormMaker. */
type Modal =
  | { kind: 'new' }
  | { kind: 'duplicate'; seedMd: string; initial: Partial<MetaValues> & { client_name?: string | null } };

/* Landing / gallery: predictive search + tag filters + a 4-up grid of deck cover thumbnails.
   First cell is "Crear nueva presentación". Cards and the "new" flow route to /deck/[id]. */
export function DeckGallery() {
  const router = useRouter();
  const [items, setItems] = useState<DeckListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [toDelete, setToDelete] = useState<DeckListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listDecks().then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'));
    listClients().then(setClients).catch(() => {});
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (items ?? []).forEach((it) => (it.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [items]);

  /* Los clientes del desplegable salen de las presentaciones que hay, no de la tabla `clients`:
     un filtro que ofrece opciones sin resultados no filtra, engaña. */
  const clientNames = useMemo(() => {
    const set = new Set<string>();
    (items ?? []).forEach((it) => it.client_name && set.add(it.client_name));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [items]);

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const applyQuery = q.length >= SEARCH_MIN;
    return (items ?? []).filter((it) => {
      if (applyQuery && !it.commercial_id.toLowerCase().includes(q)) return false;
      if (clientFilter && it.client_name !== clientFilter) return false;
      // Multiple selected tags => AND.
      if (selectedTags.length && !selectedTags.every((t) => (it.tags ?? []).includes(t))) return false;
      return true;
    });
  }, [items, search, selectedTags, clientFilter]);

  /* Duplicar necesita el markdown completo, que el listado no trae entero; se pide la fila y se
     abre el modal ya relleno, igual que hace el editor desde "Abrir ▾". */
  const startDuplicate = async (deck: DeckListItem) => {
    setError(null);
    try {
      const full = await getDeck(deck.id);
      setModal({
        kind: 'duplicate',
        seedMd: full.md,
        initial: {
          commercial_id: `${full.commercial_id} (copia)`,
          client_id: full.client_id,
          client_name: clients.find((c) => c.id === full.client_id)?.name ?? null,
          contact_emails: full.contact_emails,
          logo_path: full.logo_path,
          budget_url: full.budget_url,
          type: full.type,
          tags: full.tags,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la presentación para duplicarla');
    }
  };

  const onSubmitMeta = async (values: MetaValues) => {
    const seed = modal?.kind === 'duplicate' ? modal.seedMd : TEMPLATES[values.type];
    const rec = await createDeck({ ...values, md: seed });
    router.push(`/workspace/deckmak_r/${rec.id}`);
  };

  const onDelete = async (deck: DeckListItem) => {
    setDeleting(true);
    setError(null);
    try {
      await deleteDeck(deck.id);
      setItems((prev) => (prev ?? []).filter((d) => d.id !== deck.id));
      setToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la presentación');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.warmLight, color: colors.dark }}>
      {/* Toolbar header — mirrors the editor's DeckToolbar bar. */}
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
        <DeckLogo height={22} />
        <span style={{ marginLeft: 'auto' }} />
        <LogoutButton />

        {/* Centrado respecto a la cabecera, no al hueco que queda: en flujo se desplazaría cada
            vez que cambie el ancho del logo o del botón de salir. Ancho en % para que nunca
            alcance a los extremos. */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(380px, 42%)',
          }}
        >
          <SearchField value={search} onChange={setSearch} label="Buscar presentaciones por nombre" width={380} />
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

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
            gap: 28,
          }}
        >
          {/* New presentation */}
          <button
            onClick={() => setModal({ kind: 'new' })}
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
              Crear nueva presentación
            </span>
          </button>

          {items === null && (
            <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash, alignSelf: 'center' }}>Cargando…</div>
          )}
          {items && filtered.map((it) => (
            <DeckCard
              key={it.id}
              item={it}
              onOpen={(id) => router.push(`/workspace/deckmak_r/${id}`)}
              onDuplicate={() => startDuplicate(it)}
              onDelete={() => setToDelete(it)}
            />
          ))}
        </div>

        {items && items.length > 0 && filtered.length === 0 && (
          <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash, marginTop: 24 }}>
            No hay presentaciones que coincidan con el filtro.
          </div>
        )}
      </div>

      {modal && (
        <DeckMetaModal
          mode={modal.kind}
          clients={clients}
          allTags={allTags}
          initial={modal.kind === 'duplicate' ? modal.initial : { type: 'comercial' }}
          hint={modal.kind === 'duplicate' ? 'La copia se crea vacía de firmas: solo hereda el contenido y los metadatos.' : undefined}
          onClose={() => setModal(null)}
          onSubmit={onSubmitMeta}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title="Eliminar presentación"
          message={`Vas a borrar «${toDelete.commercial_id}». Esta acción no se puede deshacer.`}
          confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
          danger
          onConfirm={() => !deleting && onDelete(toDelete)}
          onClose={() => !deleting && setToDelete(null)}
        />
      )}
    </div>
  );
}

/* One deck card: a live cover-slide thumbnail (falls back to a neutral placeholder), name + date.
   The thumbnail width tracks the card's rendered width via ResizeObserver. */
function DeckCard({
  item,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  item: DeckListItem;
  onOpen: (id: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(Math.round(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [hover, setHover] = useState(false);

  const cover = useMemo(() => {
    try {
      return compileDeck(item.md ?? '', item.type).slides[0] ?? null;
    } catch {
      return null;
    }
  }, [item.md, item.type]);

  return (
    /* Wrapper (no el botón) porque las acciones son otros botones: anidarlos sería HTML inválido.
       El hover vive aquí para que pasar el puntero a los iconos no lo apague. */
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
    <button
      onClick={() => onOpen(item.id)}
      title="Abrir presentación"
      style={{
        appearance: 'none', cursor: 'pointer', textAlign: 'left', background: 'transparent',
        border: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, width: '100%',
      }}
    >
      <div
        ref={ref}
        style={{
          width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', lineHeight: 0,
          background: '#E7E1D9', border: `1px solid ${hover ? colors.dark : colors.warmDark}`,
          boxShadow: hover ? '0 6px 18px rgba(28,26,23,.16)' : 'none',
          transform: hover ? 'translateY(-2px)' : 'none',
          transition: 'transform .15s, box-shadow .15s, border-color .15s',
        }}
      >
        {w > 0 && cover && <SlideThumb slide={cover} page={1} width={w} />}
      </div>
      <div style={{ paddingLeft: 2 }}>
        <div style={{ font: `500 11px/1.4 ${MONO}`, color: colors.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.commercial_id}
        </div>
        <div style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash, marginTop: 2 }}>Creado el {fmt(item.created_at)}</div>
      </div>
    </button>

      {/* Duplicar y eliminar: esquina superior derecha de la miniatura, solo al pasar el puntero.
          Mismo componente que en FormMaker — la interacción es una sola, no dos parecidas. */}
      <CardActions
        visible={hover}
        actions={[
          { icon: 'copy', label: `Duplicar «${item.commercial_id}»`, onClick: onDuplicate },
          { icon: 'trash', label: `Eliminar «${item.commercial_id}»`, onClick: onDelete },
        ]}
      />
    </div>
  );
}
