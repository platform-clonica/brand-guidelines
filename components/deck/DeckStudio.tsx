'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { compileDeck } from '@/lib/deck';
import type { ClientRecord, DeckListItem, DeckMeta, DeckRecord } from '@/lib/decks/types';
import { createDeck, getDeck, listClients, translateDeck, updateDeck } from '@/lib/decks/api';
import { splitSourceBlocks, setBlockImage } from '@/lib/deck/source';
import { DeckRenderer } from './DeckRenderer';
import { ToneReport } from './ToneReport';
import { DeckToolbar } from './studio/DeckToolbar';
import { DeckMetaModal, type MetaValues } from './studio/DeckMetaModal';
import { ConfirmModal } from './studio/ConfirmModal';
import { SlideNavigator } from './studio/SlideNavigator';
import { IconButton } from './studio/IconButton';
import { LayoutGallery } from './studio/LayoutGallery';
import { ImageGallery } from './studio/ImageGallery';
import { TranslateMenu } from './studio/TranslateMenu';
import { TranslatingOverlay } from './studio/TranslatingOverlay';
import { TEMPLATES } from '@/lib/deck/templates';

const SAMPLE = TEMPLATES.comercial;

const btn: React.CSSProperties = {
  appearance: 'none', border: '1px solid #1C1A17', background: '#1C1A17', color: '#F5F2ED',
  font: '500 11px/1 var(--font-ibm-plex-mono, monospace)', letterSpacing: '.04em', padding: '10px 12px', cursor: 'pointer', flex: 1,
};

// UTF-8 safe, URL-safe base64 (base64url) for sharing the .md inside the URL hash.
function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64decode(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const EMPTY_META: DeckMeta = {
  commercial_id: '', client_id: null, contact_emails: [], logo_path: null, budget_url: null, type: 'comercial',
};
const snap = (md: string, meta: DeckMeta) => JSON.stringify({ md, meta });

// Resizable editor panel — drag the divider to widen it, up to half the viewport.
const ASIDE_MIN = 320;
const ASIDE_DEFAULT = 420;
const ASIDE_STORAGE_KEY = 'deck.asideW';
const maxAside = () => (typeof window === 'undefined' ? Infinity : window.innerWidth * 0.5);

// Slide navigator strip.
const NAV_WIDTH = 156;
const NAV_STORAGE_KEY = 'deck.navOpen';

const LANG_LABELS: Record<'es' | 'ca' | 'en', string> = { es: 'Castellano', ca: 'Català', en: 'Inglés' };

function NavIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <rect x="4.5" y="1.5" width="7" height="13" rx="1.2" />
      <line x1="4.5" y1="6" x2="11.5" y2="6" />
      <line x1="4.5" y1="10.5" x2="11.5" y2="10.5" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

type ModalState =
  | { kind: 'new' | 'duplicate'; initial?: Partial<MetaValues> & { client_name?: string | null }; seedMd: string; template?: boolean }
  | { kind: 'edit'; initial: Partial<MetaValues> & { client_name?: string | null } }
  | null;

export function DeckStudio() {
  const [md, setMd] = useState(SAMPLE);
  const [meta, setMeta] = useState<DeckMeta>(EMPTY_META);
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [deck, setDeck] = useState(() => compileDeck(SAMPLE, 'comercial'));
  const [savedSnap, setSavedSnap] = useState(() => snap(SAMPLE, EMPTY_META));
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [guard, setGuard] = useState<{ run: () => void; targetName?: string } | null>(null);
  const [toneOn, setToneOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [asideW, setAsideW] = useState(ASIDE_DEFAULT);
  const [navOpen, setNavOpen] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [imageSlot, setImageSlot] = useState<number | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [pendingTranslate, setPendingTranslate] = useState<'es' | 'ca' | 'en' | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const dirty = useMemo(() => snap(md, meta) !== savedSnap, [md, meta, savedSnap]);

  // Restore the saved editor width, then keep it within [min, 50% of viewport].
  useEffect(() => {
    const saved = Number(localStorage.getItem(ASIDE_STORAGE_KEY));
    if (saved) setAsideW(Math.max(ASIDE_MIN, Math.min(saved, maxAside())));
    const onResize = () => setAsideW((w) => Math.max(ASIDE_MIN, Math.min(w, maxAside())));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drag-to-resize the editor panel.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const left = rowRef.current?.getBoundingClientRect().left ?? 0;
      setAsideW(Math.max(ASIDE_MIN, Math.min(e.clientX - left, maxAside())));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(ASIDE_STORAGE_KEY, String(Math.round(asideW)));
  }, [asideW]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  // Slide navigator visibility (persisted).
  useEffect(() => {
    const v = localStorage.getItem(NAV_STORAGE_KEY);
    if (v != null) setNavOpen(v === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem(NAV_STORAGE_KEY, navOpen ? '1' : '0');
  }, [navOpen]);

  // Move the editor caret to a slide's source block and scroll it roughly into view.
  const jumpToSource = (blockIndex: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const b = splitSourceBlocks(md)[blockIndex];
    if (!b) return;
    ta.focus();
    ta.setSelectionRange(b.start, b.start);
    const ratio = md.length ? b.start / md.length : 0;
    ta.scrollTop = Math.max(0, ratio * ta.scrollHeight - ta.clientHeight / 3);
  };

  // Translate the deck content (markers/structure preserved server-side) and replace the editor.
  const onTranslate = async (target: 'es' | 'ca' | 'en') => {
    setTranslating(true);
    setTranslateError(null);
    try {
      const { md: out } = await translateDeck(md, target);
      setMd(out);
      setDeck(compileDeck(out, meta.type));
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : 'No se pudo traducir');
    } finally {
      setTranslating(false);
    }
  };

  // Shared link from URL hash: #view=1&md=... loads + renders only the presentation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const mdParam = params.get('md');
    if (mdParam) {
      try {
        const decoded = b64decode(mdParam);
        setMd(decoded);
        setDeck(compileDeck(decoded, meta.type));
      } catch { /* ignore malformed link */ }
    }
    if (params.has('view')) {
      setViewer(true);
      document.body.classList.add('ix-viewer');
    } else {
      listClients().then(setClients).catch(() => {});
    }
    return () => document.body.classList.remove('ix-viewer');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientNameFor = (id: string | null) => clients.find((c) => c.id === id)?.name ?? null;

  const loadRecord = (rec: DeckRecord) => {
    const m: DeckMeta = {
      commercial_id: rec.commercial_id, client_id: rec.client_id, contact_emails: rec.contact_emails,
      logo_path: rec.logo_path, budget_url: rec.budget_url, type: rec.type,
    };
    setCurrentDeckId(rec.id);
    setMeta(m);
    setMd(rec.md);
    setDeck(compileDeck(rec.md, rec.type));
    setSavedSnap(snap(rec.md, m));
  };

  const withGuard = (run: () => void, targetName?: string) => {
    if (dirty) setGuard({ run, targetName });
    else run();
  };

  // Toolbar actions
  const onNew = () => withGuard(() => setModal({ kind: 'new', initial: { type: 'comercial' }, seedMd: '', template: true }));

  const onSave = async () => {
    if (!currentDeckId) {
      // Save-as: capture metadata first, keep current md.
      setModal({ kind: 'new', initial: { type: meta.type }, seedMd: md });
      return;
    }
    setSaving(true);
    try {
      await updateDeck(currentDeckId, { ...meta, md });
      setSavedSnap(snap(md, meta));
    } catch (e) {
      // surface minimally; keep editor state
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const onOpenDeck = (item: DeckListItem) =>
    withGuard(async () => {
      try {
        loadRecord(await getDeck(item.id));
      } catch (e) {
        console.error(e);
      }
    }, item.commercial_id);

  const onDuplicateDeck = async (item: DeckListItem) => {
    try {
      const full = await getDeck(item.id);
      setModal({
        kind: 'duplicate',
        seedMd: full.md,
        initial: {
          commercial_id: `${full.commercial_id} Copy`,
          client_id: full.client_id,
          client_name: clientNameFor(full.client_id),
          contact_emails: full.contact_emails,
          logo_path: full.logo_path,
          budget_url: full.budget_url,
          type: full.type,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const onEditTitle = () => {
    if (!currentDeckId) return;
    setModal({
      kind: 'edit',
      initial: { ...meta, client_name: clientNameFor(meta.client_id) },
    });
  };

  // Saved decks share a clean, persistent link (/deck/:id/view) that always reflects the
  // latest saved content; unsaved decks fall back to the self-contained base64 hash snapshot.
  const onCopyUrl = async () => {
    let url: string;
    if (currentDeckId) {
      if (dirty) await onSave();
      url = `${window.location.origin}/deck/${currentDeckId}/view`;
    } else {
      url = `${window.location.origin}${window.location.pathname}#view=1&md=${b64encode(md)}`;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };

  // Saved decks print from the clean viewer surface (?print=1 auto-fires the dialog) so the PDF
  // is never polluted by the editor chrome; unsaved decks print the current screen as a fallback.
  const onDownloadPdf = async () => {
    if (currentDeckId) {
      if (dirty) await onSave();
      window.open(`/deck/${currentDeckId}/view?print=1`, '_blank', 'noopener');
    } else {
      window.print();
    }
  };

  const onSubmitMeta = async (values: MetaValues) => {
    if (!modal) return;
    if (modal.kind === 'edit') {
      if (!currentDeckId) return;
      await updateDeck(currentDeckId, { ...values });
      const m: DeckMeta = { ...values };
      setMeta(m);
      setDeck(compileDeck(md, m.type));
      setSavedSnap(snap(md, m));
    } else {
      // "Nueva" seeds from the per-type starter template; save-as/duplicate keep their md.
      const seed = modal.template ? TEMPLATES[values.type] : modal.seedMd;
      const rec = await createDeck({ ...values, md: seed });
      loadRecord(rec);
    }
    setModal(null);
    listClients().then(setClients).catch(() => {});
  };

  // Client-facing presentation: only the deck, nothing internal.
  if (viewer) {
    return (
      <div style={{ height: '100vh' }}>
        <DeckRenderer deck={deck} viewer />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F5F2ED' }}>
      <DeckToolbar
        title={meta.commercial_id || null}
        dirty={dirty}
        saving={saving}
        onNew={onNew}
        onOpenDeck={onOpenDeck}
        onDuplicateDeck={onDuplicateDeck}
        onEditTitle={onEditTitle}
        onSave={onSave}
        onToggleTone={() => setToneOn((v) => !v)}
        toneOn={toneOn}
        onDownloadPdf={onDownloadPdf}
        onCopyUrl={onCopyUrl}
        copied={copied}
      />

      <div ref={rowRef} style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <aside
          className="studio-controls"
          style={{ width: asideW, flexShrink: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
            <span style={{ font: '500 11px/1.4 var(--font-ibm-plex-mono, monospace)', letterSpacing: '.14em', textTransform: 'uppercase', color: '#75706B' }}>
              CONTENIDO
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <TranslateMenu onPick={setPendingTranslate} />
              <IconButton label="Galería de layouts" onClick={() => setGalleryOpen(true)}>
                <GalleryIcon />
              </IconButton>
              <IconButton
                label={navOpen ? 'Ocultar navegador' : 'Mostrar navegador'}
                active={navOpen}
                ariaPressed={navOpen}
                onClick={() => setNavOpen((v) => !v)}
              >
                <NavIcon />
              </IconButton>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={md}
            onChange={(e) => setMd(e.target.value)}
            aria-label="Contenido markdown de la presentación"
            spellCheck={false}
            style={{ flex: 1, minHeight: 0, resize: 'none', padding: 12, border: '1px solid #E0DAD2', background: '#fff', font: '400 12px/1.55 var(--font-ibm-plex-mono, monospace)', color: '#1C1A17' }}
          />

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button style={btn} onClick={() => setDeck(compileDeck(md, meta.type))}>Generar</button>
          </div>

          {toneOn && (
            <div style={{ flexShrink: 0, maxHeight: 160, overflowY: 'auto', borderTop: '1px solid #E0DAD2', paddingTop: 4 }}>
              <ToneReport text={md} />
            </div>
          )}
        </aside>

        {/* Drag handle: resize the editor up to 50% of the viewport. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar ancho del editor"
          onPointerDown={startResize}
          style={{ width: 7, flexShrink: 0, cursor: 'col-resize', borderRight: '1px solid #E0DAD2', background: 'transparent', touchAction: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#E0DAD2')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        />

        <AnimatePresence initial={false}>
          {navOpen && (
            <motion.div
              key="nav"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: NAV_WIDTH, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              // display:flex stretches the strip to the panel height so it scrolls internally.
              style={{ flexShrink: 0, overflow: 'hidden', display: 'flex' }}
            >
              <SlideNavigator deck={deck} width={NAV_WIDTH} previewRef={previewRef} onJumpToSource={jumpToSource} />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={previewRef} className="deck-preview" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <DeckRenderer deck={deck} onPickImage={setImageSlot} />
        </div>
      </div>

      {galleryOpen && <LayoutGallery onClose={() => setGalleryOpen(false)} />}

      {imageSlot != null && (
        <ImageGallery
          onClose={() => setImageSlot(null)}
          onSelect={(url) => {
            const next = setBlockImage(md, imageSlot, url);
            setMd(next);
            setDeck(compileDeck(next, meta.type));
            setImageSlot(null);
          }}
        />
      )}

      {pendingTranslate && (
        <ConfirmModal
          title="Traducir presentación"
          message={`¿Estás seguro que quieres traducir la presentación al ${LANG_LABELS[pendingTranslate]}? Asegúrate de revisar bien todo, esta acción conlleva un coste por el uso de la API de Anthropic.`}
          confirmLabel="Traducir"
          onConfirm={() => { const t = pendingTranslate; setPendingTranslate(null); onTranslate(t); }}
          onClose={() => setPendingTranslate(null)}
        />
      )}

      {(translating || translateError) && (
        <TranslatingOverlay error={translateError} onClose={() => setTranslateError(null)} />
      )}

      {modal && (
        <DeckMetaModal
          mode={modal.kind}
          clients={clients}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSubmit={onSubmitMeta}
        />
      )}

      {guard && (
        <ConfirmModal
          title="Abrir presentación"
          message={`${guard.targetName ? guard.targetName + ' · ' : ''}No has guardado cambios. ¿Quieres continuar?`}
          confirmLabel="Aceptar"
          onConfirm={() => { const run = guard.run; setGuard(null); run(); }}
          onClose={() => setGuard(null)}
        />
      )}
    </div>
  );
}
