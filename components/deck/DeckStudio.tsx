'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { compileDeck, deckWarnings } from '@/lib/deck';
import type { ClientRecord, DeckListItem, DeckMeta, DeckRecord } from '@/lib/decks/types';
import { createDeck, getDeck, listClients, listDecks, publicLogoUrl, translateDeck, updateDeck } from '@/lib/decks/api';
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

// UTF-8 safe, URL-safe base64 (base64url) — decodes legacy `#view=1&md=…` share links.
function b64decode(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const EMPTY_META: DeckMeta = {
  commercial_id: '', client_id: null, contact_emails: [], logo_path: null, budget_url: null, type: 'comercial', tags: [],
};
const snap = (md: string, meta: DeckMeta) => JSON.stringify({ md, meta });

// Autosave lifecycle for the toolbar indicator.
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
// Idle time after the last edit before autosave fires.
const AUTOSAVE_DELAY = 1400;
// Idle time after the last edit before the live preview recompiles.
const PREVIEW_DELAY = 250;

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

function RulesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 7.3v4" strokeLinecap="round" />
      <circle cx="8" cy="4.7" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Concise markdown parsing rules shown in the toolbar tooltip (monospace, aligned).
const MD_RULES = [
  'REGLAS DEL MARKDOWN',
  '#               Título grande',
  '##              Subtítulo',
  '###             Secciones (columnas · fases)',
  '-               Lista',
  '>               Cita',
  '![alt](url)     Imagen',
  'TEXTO MAYÚS     Antetítulo',
  'clave: valor    Datos (cliente, firma…)',
  '**negrita**  ·  / énfasis /',
  '[ly: marcador]  Elige el layout',
  '---             Separa diapositivas',
].join('\n');

type ModalState =
  | { kind: 'new' | 'duplicate'; initial?: Partial<MetaValues> & { client_name?: string | null }; seedMd: string; template?: boolean }
  | { kind: 'edit'; initial: Partial<MetaValues> & { client_name?: string | null } }
  | null;

export function DeckStudio({ deckId, initialMd: initialMdProp, previewClientLogo }: { deckId?: string; initialMd?: string; previewClientLogo?: string } = {}) {
  const router = useRouter();
  // When addressed by /deck/[id] we load that deck on mount; start blank to avoid a
  // flash of the sample template. Standalone (no id) seeds `initialMd` if given (the /lab sandbox
  // passes a deck of every layout), else the sample template.
  const initialMd = deckId ? '' : (initialMdProp ?? SAMPLE);
  const [md, setMd] = useState(initialMd);
  const [meta, setMeta] = useState<DeckMeta>(EMPTY_META);
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [deck, setDeck] = useState(() => compileDeck(initialMd, 'comercial'));
  const [savedSnap, setSavedSnap] = useState(() => snap(initialMd, EMPTY_META));
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [guard, setGuard] = useState<{ run: () => void; targetName?: string } | null>(null);
  const [toneOn, setToneOn] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saving = saveState === 'saving';
  // Guards against overlapping PATCHes (autosave + manual/share flush racing).
  const savingRef = useRef(false);
  const [copied, setCopied] = useState(false);
  // Set when Compartir URL / Descargar PDF is clicked on an unsaved deck: the save dialog opens,
  // and the action runs automatically once the deck has an id.
  const [pendingShare, setPendingShare] = useState<'copy' | 'pdf' | null>(null);
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
  /* Uploaded in DeckMetaModal (and defaulted per client): the cover shows it instead of the
     client name. Memoised because resolving the URL builds a Supabase client. */
  const clientLogo = useMemo(() => publicLogoUrl(meta.logo_path) ?? previewClientLogo ?? null, [meta.logo_path, previewClientLogo]);

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

  // Load the deck addressed by the route.
  useEffect(() => {
    if (!deckId) return;
    getDeck(deckId).then(loadRecord).catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Tag suggestions for the edit modal's autocomplete (derived from all decks).
  useEffect(() => {
    listDecks()
      .then((items) => {
        const set = new Set<string>();
        items.forEach((it) => (it.tags ?? []).forEach((t) => set.add(t)));
        setAllTags([...set].sort());
      })
      .catch(() => {});
  }, []);

  const loadRecord = (rec: DeckRecord) => {
    const m: DeckMeta = {
      commercial_id: rec.commercial_id, client_id: rec.client_id, contact_emails: rec.contact_emails,
      logo_path: rec.logo_path, budget_url: rec.budget_url, type: rec.type, tags: rec.tags ?? [],
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

  // Persist the current md+meta against the saved deck id. Reused by autosave, the
  // manual Guardar button and the share/PDF flush. No-ops when there's nothing to save
  // or another PATCH is already in flight (the trailing dirty state re-triggers autosave).
  const saveNow = async () => {
    if (!currentDeckId || savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    try {
      await updateDeck(currentDeckId, { ...meta, md });
      setSavedSnap(snap(md, meta));
      setSaveState('saved');
    } catch (e) {
      // surface minimally; keep editor state so the user can retry
      console.error(e);
      setSaveState('error');
    } finally {
      savingRef.current = false;
    }
  };
  // Ref so the debounce timer always calls the latest closure without resetting on every keystroke.
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  const onSave = async () => {
    if (!currentDeckId) {
      // Save-as: capture metadata first, keep current md.
      setModal({ kind: 'new', initial: { type: meta.type }, seedMd: md });
      return;
    }
    await saveNow();
  };

  // Live preview: recompile the rendered deck shortly after each markdown/type change so edits
  // are seen in real time (replaces the old manual "Generar" button). Debounced to avoid
  // recompiling on every keystroke; try/catch keeps the last good preview if a half-typed block
  // fails to parse.
  useEffect(() => {
    const t = setTimeout(() => {
      try { setDeck(compileDeck(md, meta.type)); }
      catch (e) { console.error(e); }
    }, PREVIEW_DELAY);
    return () => clearTimeout(t);
  }, [md, meta.type]);

  // Autosave: once the deck has an id, persist edits after a short idle window.
  useEffect(() => {
    if (!currentDeckId || !dirty || savingRef.current) return;
    const t = setTimeout(() => saveNowRef.current(), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [md, meta, currentDeckId, dirty, saveState]);

  // Fade the "Guardado ✓" confirmation back to idle.
  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 2000);
    return () => clearTimeout(t);
  }, [saveState]);

  // Warn on tab close/refresh while a save is still pending or failed. In-app navigation
  // is already covered by withGuard/ConfirmModal.
  useEffect(() => {
    const pending = (dirty && !!currentDeckId) || saveState === 'error';
    if (!pending) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty, currentDeckId, saveState]);

  const onOpenDeck = (item: DeckListItem) =>
    withGuard(() => router.push(`/workspace/deckmak_r/${item.id}`), item.commercial_id);

  // Back to the gallery (respecting unsaved changes).
  const onHome = () => withGuard(() => router.push('/workspace/deckmak_r'));

  const onDuplicateDeck = async (item: DeckListItem) => {
    try {
      const full = await getDeck(item.id);
      setModal({
        kind: 'duplicate',
        seedMd: full.md,
        initial: {
          commercial_id: `${full.commercial_id} (copia)`,
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

  // Run a share/PDF action against a saved deck id. The clean /deck/:id/view link is the same
  // whether or not it's the latest save, so copy works immediately; prompt() is a reliable
  // fallback when the clipboard or a popup is blocked (e.g. after an awaited save).
  const shareSaved = async (id: string, action: 'copy' | 'pdf') => {
    const origin = window.location.origin;
    if (action === 'copy') {
      const url = `${origin}/deck/${id}/view`;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        window.prompt('Copia el enlace compartible:', url);
      }
    } else {
      const url = `${origin}/deck/${id}/view?print=1`;
      const w = window.open(url, '_blank', 'noopener');
      if (!w) window.prompt('Abre este enlace para descargar el PDF:', url);
    }
  };

  // Compartir URL — a saved deck yields the clean, persistent /deck/:id/view link; an unsaved
  // deck is sent through the save dialog first (the link needs an id), then copied automatically.
  const onCopyUrl = async () => {
    if (!currentDeckId) {
      setPendingShare('copy');
      setModal({ kind: 'new', initial: { type: meta.type }, seedMd: md });
      return;
    }
    if (dirty) onSave().catch(() => {}); // flush edits so the shared link reflects them
    await shareSaved(currentDeckId, 'copy');
  };

  // Descargar PDF — prints from the clean viewer surface (?print=1 auto-fires the dialog) so the
  // PDF is never polluted by the editor chrome. Unsaved decks save first; dirty saved decks open a
  // blank tab inside the gesture and redirect it after the save so the PDF reflects the latest edits.
  const onDownloadPdf = async () => {
    if (!currentDeckId) {
      setPendingShare('pdf');
      setModal({ kind: 'new', initial: { type: meta.type }, seedMd: md });
      return;
    }
    const url = `${window.location.origin}/deck/${currentDeckId}/view?print=1`;
    if (!dirty) {
      const w = window.open(url, '_blank', 'noopener');
      if (!w) window.prompt('Abre este enlace para descargar el PDF:', url);
      return;
    }
    const tab = window.open('', '_blank');
    try {
      await onSave();
    } finally {
      if (tab) { tab.opener = null; tab.location.href = url; }
      else { const w = window.open(url, '_blank', 'noopener'); if (!w) window.prompt('Abre este enlace para descargar el PDF:', url); }
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
      // If the save was triggered by Compartir URL / Descargar PDF, run that action now.
      if (pendingShare) { await shareSaved(rec.id, pendingShare); setPendingShare(null); }
      // Sync the URL to the freshly created deck so refresh/back behave.
      if (rec.id !== deckId) router.push(`/workspace/deckmak_r/${rec.id}`);
    }
    setModal(null);
    listClients().then(setClients).catch(() => {});
  };

  // Advisory: content the chosen layout won't render (recomputed live from the markdown).
  const warnings = useMemo(() => deckWarnings(md), [md]);

  // Client-facing presentation: only the deck, nothing internal.
  if (viewer) {
    return (
      <div style={{ height: '100vh' }}>
        <DeckRenderer deck={deck} viewer clientLogo={clientLogo} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F5F2ED' }}>
      <DeckToolbar
        title={meta.commercial_id || null}
        dirty={dirty}
        saving={saving}
        saveState={saveState}
        hasId={!!currentDeckId}
        onHome={onHome}
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
              <IconButton label="Reglas del markdown" tooltip={MD_RULES} onClick={() => {}}>
                <RulesIcon />
              </IconButton>
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

          {warnings.length > 0 && (
            <div style={{ flexShrink: 0, maxHeight: 120, overflowY: 'auto', border: '1px solid #E0DAD2', background: '#FBF3E7', padding: '8px 10px' }}>
              {warnings.map((w) => (
                <div key={w.index} style={{ font: '400 10.5px/1.5 var(--font-ibm-plex-mono, monospace)', color: '#46433F' }}>
                  <b style={{ fontWeight: 600 }}>⚠ Diapositiva {w.index + 1}</b> ({w.kind}) no muestra: {w.dropped.join(' · ')}
                </div>
              ))}
            </div>
          )}

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
          <DeckRenderer deck={deck} onPickImage={setImageSlot} clientLogo={clientLogo} />
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
          allTags={allTags}
          hint={pendingShare ? 'Guarda la presentación para obtener su enlace compartible y el PDF de alta fidelidad.' : undefined}
          onClose={() => { setModal(null); setPendingShare(null); }}
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
