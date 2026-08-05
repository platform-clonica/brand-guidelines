'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compileForm, type FormIssue } from '@/lib/forms/compile';
import { appendField, getFrontmatterValue, setFrontmatterValue } from '@/lib/forms/edit';
import { getForm, updateForm } from '@/lib/forms/api';
import type { FormDraft } from '@/lib/forms/schema';
import type { FormListItem } from '@/lib/forms/types';
import { HeroPanel } from '@/components/forms/HeroPanel';
import { FormRenderer } from '@/components/forms/FormRenderer';
import { ConfirmModal } from '@/components/deck/studio/ConfirmModal';
import { colors } from '@/components/deck/studio/ui';
import { FormToolbar, type SaveState } from './FormToolbar';
import { IssuesPanel } from './IssuesPanel';
import '@/components/forms/forms.css';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const PREVIEW_DELAY = 250;   // recompilado del visor (igual que DeckStudio)
const AUTOSAVE_DELAY = 1400; // guardado tras dejar de escribir (igual que DeckStudio)

const ASIDE_STORAGE_KEY = 'form.asideW';
const ASIDE_DEFAULT = 460;
const ASIDE_MIN = 340;
const maxAside = () => (typeof window === 'undefined' ? 720 : window.innerWidth * 0.6);

/* Ancho a partir del cual el visor pinta el formulario a dos columnas, como en escritorio.
   Se mide el PANEL, no el viewport: la media query de forms.css no sirve aquí. */
const WIDE_STAGE = 900;

const snap = (md: string, tags: string[]) => JSON.stringify({ md, tags });

/* Editor de FormMaker.

   Mismo mecanismo que DeckStudio: dos átomos de estado (`md` es la verdad, `def` es lo compilado),
   recompilado con debounce que conserva la última versión buena, autoguardado por inactividad,
   aviso al salir con cambios sin guardar y panel lateral redimensionable.

   La orientación va al revés que en el deck (markdown a la DERECHA, visor a la izquierda), por
   petición expresa: el formulario público es hero-izquierda / campos-derecha y así se conserva
   la lectura. */
export function FormStudio({ formId }: { formId: string }) {
  const router = useRouter();

  const [record, setRecord] = useState<FormListItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [md, setMd] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [savedSnap, setSavedSnap] = useState('');

  const [def, setDef] = useState<FormDraft | null>(null);   // última versión que compiló
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [compiles, setCompiles] = useState(true);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [copied, setCopied] = useState(false);
  const [guard, setGuard] = useState<null | { run: () => void }>(null);

  const [asideW, setAsideW] = useState(ASIDE_DEFAULT);
  const [stageW, setStageW] = useState(0);

  const rowRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draggingRef = useRef(false);
  const savingRef = useRef(false);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  const dirty = useMemo(() => snap(md, tags) !== savedSnap, [md, tags, savedSnap]);

  /* ── Carga inicial ────────────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    getForm(formId)
      .then((rec) => {
        if (!alive) return;
        setRecord(rec);
        setMd(rec.md);
        setTags(rec.tags ?? []);
        setSavedSnap(snap(rec.md, rec.tags ?? []));
        // Compilado inmediato: el visor no debe ir un debounce por detrás de la carga.
        const res = compileForm(rec.md);
        setCompiles(res.ok);
        setIssues(res.issues);
        if (res.ok) setDef(res.def);
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : 'No se pudo cargar'));
    return () => {
      alive = false;
    };
  }, [formId]);

  /* ── Visor en vivo: recompilado con debounce.
        Si no compila, se conserva el último `def` bueno y los errores van al panel. ─────── */
  useEffect(() => {
    if (!record) return;
    const t = setTimeout(() => {
      const res = compileForm(md);
      setCompiles(res.ok);
      setIssues(res.issues);
      if (res.ok) setDef(res.def);
    }, PREVIEW_DELAY);
    return () => clearTimeout(t);
  }, [md, record]);

  /* ── Guardado ─────────────────────────────────────────────────────────────── */
  const saveNow = useCallback(
    async (overrideMd?: string, overrideTags?: string[]) => {
      if (savingRef.current) return;
      const nextMd = overrideMd ?? md;
      const nextTags = overrideTags ?? tags;
      savingRef.current = true;
      setSaveState('saving');
      try {
        const rec = await updateForm(formId, { md: nextMd, tags: nextTags });
        setRecord((prev) => (prev ? { ...prev, ...rec } : prev));
        setSavedSnap(snap(nextMd, nextTags));
        setSaveState('saved');
      } catch (e) {
        console.error(e);
        setSaveState('error');
      } finally {
        savingRef.current = false;
      }
    },
    [formId, md, tags],
  );

  // Ref para que el temporizador llame siempre al cierre más reciente sin reiniciarse al teclear.
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  useEffect(() => {
    if (!record || !dirty || savingRef.current) return;
    const t = setTimeout(() => saveNowRef.current(), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [md, tags, record, dirty, saveState]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 2000);
    return () => clearTimeout(t);
  }, [saveState]);

  // Aviso al cerrar la pestaña con un guardado pendiente o fallido.
  useEffect(() => {
    const pending = (dirty && !!record) || saveState === 'error';
    if (!pending) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty, record, saveState]);

  const withGuard = (run: () => void) => (dirty ? setGuard({ run }) : run());

  /* ── Panel redimensionable. El editor está a la DERECHA, así que el ancho se mide
        desde el borde derecho de la fila. ──────────────────────────────────────── */
  useEffect(() => {
    const saved = Number(localStorage.getItem(ASIDE_STORAGE_KEY));
    if (saved) setAsideW(Math.max(ASIDE_MIN, Math.min(saved, maxAside())));
    const onResize = () => setAsideW((w) => Math.max(ASIDE_MIN, Math.min(w, maxAside())));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const right = rowRef.current?.getBoundingClientRect().right ?? 0;
      setAsideW(Math.max(ASIDE_MIN, Math.min(right - e.clientX, maxAside())));
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

  // Ancho real del escenario, para decidir apilado vs. dos columnas.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setStageW(Math.round(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [record]);

  /* ── Acciones ─────────────────────────────────────────────────────────────── */

  // Lleva el cursor a una línea del documento (desde el panel de issues).
  const jumpToLine = (line: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const lines = md.split('\n');
    const offset = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    ta.focus();
    ta.setSelectionRange(offset, offset + (lines[line - 1]?.length ?? 0));
    const ratio = md.length ? offset / md.length : 0;
    ta.scrollTop = Math.max(0, ratio * ta.scrollHeight - ta.clientHeight / 3);
  };

  const onAddField = (snippet: string) => {
    const { md: next, selectionStart, selectionEnd } = appendField(md, snippet);
    pendingSelection.current = { start: selectionStart, end: selectionEnd };
    setMd(next);
  };

  // El cursor se coloca tras el repintado, cuando el textarea ya tiene el texto nuevo.
  useEffect(() => {
    const sel = pendingSelection.current;
    const ta = textareaRef.current;
    if (!sel || !ta) return;
    pendingSelection.current = null;
    ta.focus();
    ta.setSelectionRange(sel.start, sel.end);
    const ratio = md.length ? sel.start / md.length : 0;
    ta.scrollTop = Math.max(0, ratio * ta.scrollHeight - ta.clientHeight / 3);
  }, [md]);

  const publicId = def?.id ?? getFrontmatterValue(md, 'id') ?? record?.public_id ?? null;
  const status: 'draft' | 'published' =
    (def?.status ?? getFrontmatterValue(md, 'status')) === 'published' ? 'published' : 'draft';

  const onTogglePublish = () => {
    const next = setFrontmatterValue(md, 'status', status === 'published' ? 'draft' : 'published');
    setMd(next);
    // Publicar es un acto deliberado: se persiste ya, sin esperar al autoguardado.
    void saveNow(next);
  };

  const onCopyUrl = async () => {
    if (!publicId) return;
    const url = `${window.location.origin}/forms/f/${publicId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copia la URL del formulario:', url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* Firma de FORMA de los campos. El visor se remonta cuando cambia la estructura (añadir,
     borrar o reordenar campos, o cambiar sus opciones) pero NO al retocar una etiqueta.
     Sin esto, FormRenderer conserva su estado inicial: los campos nuevos salen sin valor por
     defecto y los borrados dejan respuestas fantasma. */
  const shapeKey = useMemo(() => {
    if (!def) return 'empty';
    return JSON.stringify(
      def.fields.map((f) => ('name' in f ? [f.type, f.name, 'options' in f ? f.options : 0] : [f.type])),
    );
  }, [def]);

  /* ── Render ───────────────────────────────────────────────────────────────── */

  if (loadError) {
    return (
      <div style={{ padding: 40, font: `400 13px/1.6 ${MONO}`, color: '#99335F' }}>
        {loadError}{' '}
        <button onClick={() => router.push('/forms/maker')} style={{ ...linkish, color: colors.dark }}>
          Volver a la galería
        </button>
      </div>
    );
  }

  if (!record) {
    return <div style={{ padding: 40, font: `400 13px/1.6 ${MONO}`, color: colors.ash }}>Cargando…</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: colors.warmLight }}>
      <FormToolbar
        title={def?.title ?? record.title}
        status={status}
        saveState={saveState}
        dirty={dirty}
        publicId={publicId}
        responses={record.responses ?? 0}
        canPublish={compiles}
        copied={copied}
        onBack={() => withGuard(() => router.push('/forms/maker'))}
        onAddField={onAddField}
        onTogglePublish={onTogglePublish}
        onCopyUrl={onCopyUrl}
        onSaveNow={() => void saveNow()}
      />

      <div ref={rowRef} style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Visor (izquierda) */}
        <div
          ref={stageRef}
          className={`ixf-stage${stageW >= WIDE_STAGE ? ' ixf-stage--wide' : ''}`}
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: colors.warmLight }}
        >
          {def ? (
            <main className="ix-forms">
              <HeroPanel def={def} />
              <FormRenderer key={shapeKey} def={def} preview />
            </main>
          ) : (
            <div style={{ padding: 40, font: `400 12px/1.6 ${MONO}`, color: colors.ash }}>
              El formulario todavía no compila. Corrige los errores del panel de la derecha para ver
              la vista previa.
            </div>
          )}
        </div>

        {/* Tirador de redimensionado */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar ancho del editor"
          onPointerDown={startResize}
          style={{
            width: 7, flexShrink: 0, cursor: 'col-resize',
            borderLeft: `1px solid ${colors.warmDark}`, background: 'transparent', touchAction: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = colors.warmDark)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        />

        {/* Editor (derecha) */}
        <aside
          style={{
            width: asideW, flexShrink: 0, display: 'flex', flexDirection: 'column',
            minHeight: 0, background: colors.warmLight,
          }}
        >
          <textarea
            ref={textareaRef}
            value={md}
            onChange={(e) => setMd(e.target.value)}
            aria-label="Contenido markdown del formulario"
            spellCheck={false}
            style={{
              flex: 1, minHeight: 0, resize: 'none', padding: 12, margin: 20, marginBottom: 12,
              border: `1px solid ${colors.warmDark}`, background: colors.white,
              font: `400 12px/1.55 ${MONO}`, color: colors.dark,
            }}
          />
          <IssuesPanel issues={issues} stale={!compiles} onJump={jumpToLine} />
        </aside>
      </div>

      {guard && (
        <ConfirmModal
          title="Cambios sin guardar"
          message="Tienes cambios que aún no se han guardado. Si sales ahora se perderán."
          confirmLabel="Salir sin guardar"
          danger
          onConfirm={() => {
            const run = guard.run;
            setGuard(null);
            run();
          }}
          onClose={() => setGuard(null)}
        />
      )}
    </div>
  );
}

const linkish: React.CSSProperties = {
  appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
  padding: 0, font: 'inherit', textDecoration: 'underline',
};
