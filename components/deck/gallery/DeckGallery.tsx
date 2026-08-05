'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compileDeck } from '@/lib/deck';
import { TEMPLATES } from '@/lib/deck/templates';
import type { ClientRecord, DeckListItem } from '@/lib/decks/types';
import { createDeck, listClients, listDecks } from '@/lib/decks/api';
import { DeckMetaModal, type MetaValues } from '../studio/DeckMetaModal';
import { SlideThumb } from '../studio/SlideThumb';
import { DeckLogo } from '../studio/DeckLogo';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { chromeLink, colors } from '../studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const SEARCH_MIN = 3; // predictive filter kicks in from the 3rd character

const fmt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

/* Landing / gallery: predictive search + tag filters + a 4-up grid of deck cover thumbnails.
   First cell is "Crear nueva presentación". Cards and the "new" flow route to /deck/[id]. */
export function DeckGallery() {
  const router = useRouter();
  const [items, setItems] = useState<DeckListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listDecks().then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'));
    listClients().then(setClients).catch(() => {});
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (items ?? []).forEach((it) => (it.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [items]);

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const applyQuery = q.length >= SEARCH_MIN;
    return (items ?? []).filter((it) => {
      if (applyQuery && !it.commercial_id.toLowerCase().includes(q)) return false;
      // Multiple selected tags => AND.
      if (selectedTags.length && !selectedTags.every((t) => (it.tags ?? []).includes(t))) return false;
      return true;
    });
  }, [items, search, selectedTags]);

  const onCreate = async (values: MetaValues) => {
    const rec = await createDeck({ ...values, md: TEMPLATES[values.type] });
    router.push(`/deck/${rec.id}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.warmLight, color: colors.dark }}>
      {/* Toolbar header — mirrors the editor's DeckToolbar bar. */}
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight,
        }}
      >
        <DeckLogo height={26} />
        <a href="/home" style={{ ...chromeLink, marginLeft: 'auto' }}>
          ← Inicio
        </a>
        <LogoutButton />
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 64px' }}>
        {/* Search */}
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
              aria-label="Buscar presentaciones por nombre"
              style={{
                flex: 1, minWidth: 0, appearance: 'none', border: 'none', outline: 'none',
                background: 'transparent', font: `400 14px/1.2 ${MONO}`, color: colors.dark,
              }}
            />
          </div>
        </div>

        {/* Tag filters */}
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
            onClick={() => setCreating(true)}
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
          {items && filtered.map((it) => <DeckCard key={it.id} item={it} onOpen={(id) => router.push(`/deck/${id}`)} />)}
        </div>

        {items && items.length > 0 && filtered.length === 0 && (
          <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash, marginTop: 24 }}>
            No hay presentaciones que coincidan con el filtro.
          </div>
        )}
      </div>

      {creating && (
        <DeckMetaModal
          mode="new"
          clients={clients}
          initial={{ type: 'comercial' }}
          onClose={() => setCreating(false)}
          onSubmit={onCreate}
        />
      )}
    </div>
  );
}

/* One deck card: a live cover-slide thumbnail (falls back to a neutral placeholder), name + date.
   The thumbnail width tracks the card's rendered width via ResizeObserver. */
function DeckCard({ item, onOpen }: { item: DeckListItem; onOpen: (id: string) => void }) {
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
    <button
      onClick={() => onOpen(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Abrir presentación"
      style={{
        appearance: 'none', cursor: 'pointer', textAlign: 'left', background: 'transparent',
        border: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8,
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
  );
}
