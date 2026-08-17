'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compileForm, type FormIssue } from '@/lib/forms/compile';
import { appendField, applyMeta, getFrontmatterValue, setFrontmatterValue, yamlString } from '@/lib/forms/edit';
import { getForm, translateForm, updateForm } from '@/lib/forms/api';
import type { TranslateTarget } from '@/lib/forms/translate';
import type { FormDraft } from '@/lib/forms/schema';
import type { FormListItem } from '@/lib/forms/types';
import { HeroPanel } from '@/components/forms/HeroPanel';
import { FormRenderer } from '@/components/forms/FormRenderer';
import { ConfirmModal } from '@/components/deck/studio/ConfirmModal';
import { ImageGallery } from '@/components/deck/studio/ImageGallery';
import { TranslatingOverlay } from '@/components/deck/studio/TranslatingOverlay';
import { colors } from '@/components/deck/studio/ui';
import { FormToolbar, type SaveState } from './FormToolbar';
import { FormEditorBar } from './FormEditorBar';
import { FormMetaModal, type FormMetaValues } from './FormMetaModal';
import { IssuesPanel } from './IssuesPanel';
import '@/components/forms/forms.css';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const PREVIEW_DELAY = 250;   // recompilado del visor (igual que DeckStudio)
const AUTOSAVE_DELAY = 1400; // guardado tras dejar de escribir (igual que DeckStudio)
/* Tope de reintentos, igual que DeckStudio. `saveState` está en las dependencias del efecto de
   autosave, así que un fallo lo re-dispara indefinidamente: error → reintento → error cada 1,4 s
   mientras dure la causa. El arreglo va en las DOS copias a propósito — con el manejo del error de
   carga ya pasó que se corrigió aquí y no allí, y estuvo meses descuadrado. */
const AUTOSAVE_MAX_RETRIES = 3;

const ASIDE_STORAGE_KEY = 'form.asideW';
const ASIDE_DEFAULT = 460;
const ASIDE_MIN = 340;
const maxAside = () => (typeof window === 'undefined' ? 720 : window.innerWidth * 0.6);

/* Ancho a partir del cual el visor pinta el formulario a dos columnas, como en escritorio.
   Se mide el PANEL, no el viewport: la media query de forms.css no sirve aquí. */
const WIDE_STAGE = 900;

const LANG_LABELS: Record<TranslateTarget, string> = {
  es: 'castellano',
  ca: 'català',
  en: 'inglés',
};

const snap = (md: string, tags: string[]) => JSON.stringify({ md, tags });

/* Editor de FormMaker.

   Mismo mecanismo y misma disposición que DeckStudio: markdown a la IZQUIERDA, visor a la derecha,
   dos átomos de estado (`md` es la verdad, `def` es lo compilado), recompilado con debounce que
   conserva la última versión buena, autoguardado por inactividad, aviso al salir con cambios sin
   guardar y panel lateral redimensionable. */
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
  const [editingMeta, setEditingMeta] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [pendingTranslate, setPendingTranslate] = useState<TranslateTarget | null>(null);

  const [asideW, setAsideW] = useState(ASIDE_DEFAULT);
  const [stageW, setStageW] = useState(0);

  const rowRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draggingRef = useRef(false);
  const savingRef = useRef(false);
  const retriesRef = useRef(0);
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

  /* Reemplaza el markdown entero y recompila ya, sin esperar al debounce.
     Lo usan traducir y el modal de metadatos, que cambian el documento de golpe. */
  const replaceMd = useCallback((next: string) => {
    setMd(next);
    const res = compileForm(next);
    setCompiles(res.ok);
    setIssues(res.issues);
    if (res.ok) setDef(res.def);
  }, []);

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
        retriesRef.current = 0;
      } catch (e) {
        console.error(e);
        retriesRef.current += 1;
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
    if (retriesRef.current >= AUTOSAVE_MAX_RETRIES) return;
    const t = setTimeout(() => saveNowRef.current(), AUTOSAVE_DELAY * 2 ** retriesRef.current);
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

  /* ── Panel redimensionable. El editor está a la IZQUIERDA, como en el deck. ─── */
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

  /* Traducir. El verificador de lib/forms/translate.ts corre dentro de translateForm: si la
     traducción tocó un `name`, un `type` o el `id`, lanza y el documento no se modifica. */
  const onTranslate = async (target: TranslateTarget) => {
    setTranslating(true);
    setTranslateError(null);
    try {
      const { md: out } = await translateForm(md, target);
      replaceMd(out);
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : 'No se pudo traducir');
    } finally {
      setTranslating(false);
    }
  };

  const publicId = def?.id ?? getFrontmatterValue(md, 'id') ?? record?.public_id ?? null;
  const status: 'draft' | 'published' =
    (def?.status ?? getFrontmatterValue(md, 'status')) === 'published' ? 'published' : 'draft';

  const onTogglePublish = () => {
    const next = setFrontmatterValue(md, 'status', status === 'published' ? 'draft' : 'published');
    setMd(next);
    // Publicar es un acto deliberado: se persiste ya, sin esperar al autoguardado.
    void saveNow(next);
  };

  const onSubmitMeta = async (values: FormMetaValues) => {
    const next = applyMeta(md, { title: values.title, client: values.client, accent: values.accent });
    replaceMd(next);
    setTags(values.tags);
    setEditingMeta(false);
    await saveNow(next, values.tags);
  };

  /* Imagen de fondo del hero. Misma galería que el DeckMaker (Supabase Storage + tabla `images`),
     y una sola línea del frontmatter reescrita — sin reserializar el YAML. */
  const onPickBackground = (url: string) => {
    setPickingImage(false);
    replaceMd(setFrontmatterValue(md, 'background', yamlString(url)));
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
        <button onClick={() => router.push('/workspace/formmak_r')} style={{ ...linkish, color: colors.dark }}>
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
        onHome={() => withGuard(() => router.push('/workspace/formmak_r'))}
        onEditTitle={() => setEditingMeta(true)}
        onTogglePublish={onTogglePublish}
        onCopyUrl={onCopyUrl}
        onSaveNow={() => {
          // Reintento manual: reanuda el autoguardado detenido tras agotar los intentos.
          retriesRef.current = 0;
          void saveNow();
        }}
      />

      <div ref={rowRef} style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Editor (izquierda) — misma disposición que DeckStudio */}
        <aside
          style={{
            width: asideW, flexShrink: 0, display: 'flex', flexDirection: 'column',
            minHeight: 0, background: colors.warmLight, padding: 20, paddingBottom: 0, gap: 12,
          }}
        >
          <FormEditorBar onAddField={onAddField} onTranslate={setPendingTranslate} />

          <textarea
            ref={textareaRef}
            value={md}
            onChange={(e) => setMd(e.target.value)}
            aria-label="Contenido markdown del formulario"
            spellCheck={false}
            style={{
              flex: 1, minHeight: 0, resize: 'none', padding: 12,
              border: `1px solid ${colors.warmDark}`, background: colors.white,
              font: `400 12px/1.55 ${MONO}`, color: colors.dark,
            }}
          />
          <div style={{ margin: '0 -20px' }}>
            <IssuesPanel issues={issues} stale={!compiles} onJump={jumpToLine} />
          </div>
        </aside>

        {/* Tirador de redimensionado */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar ancho del editor"
          onPointerDown={startResize}
          style={{
            width: 7, flexShrink: 0, cursor: 'col-resize',
            borderRight: `1px solid ${colors.warmDark}`, background: 'transparent', touchAction: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = colors.warmDark)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        />

        {/* Visor (derecha) */}
        <div
          ref={stageRef}
          className={`ixf-stage${stageW >= WIDE_STAGE ? ' ixf-stage--wide' : ''}`}
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: colors.warmLight }}
        >
          {def ? (
            <main className="ix-forms">
              <HeroPanel def={def} onPickImage={() => setPickingImage(true)} />
              <FormRenderer key={shapeKey} def={def} preview />
            </main>
          ) : (
            <div style={{ padding: 40, font: `400 12px/1.6 ${MONO}`, color: colors.ash }}>
              El formulario todavía no compila. Corrige los errores del panel de la izquierda para
              ver la vista previa.
            </div>
          )}
        </div>
      </div>

      {editingMeta && def && (
        <FormMetaModal
          mode="edit"
          initial={{
            title: def.title,
            client: def.client ?? '',
            accent: def.accent,
            tags,
          }}
          onClose={() => setEditingMeta(false)}
          onSubmit={onSubmitMeta}
        />
      )}

      {pickingImage && (
        <ImageGallery onSelect={onPickBackground} onClose={() => setPickingImage(false)} />
      )}

      {pendingTranslate && (
        <ConfirmModal
          title="Traducir formulario"
          message={`¿Traducir el formulario al ${LANG_LABELS[pendingTranslate]}? Se traducen los textos visibles; los identificadores de cada campo se conservan para no perder las respuestas ya recogidas. Esta acción conlleva un coste por el uso de la API de Anthropic.`}
          confirmLabel="Traducir"
          onConfirm={() => {
            const t = pendingTranslate;
            setPendingTranslate(null);
            void onTranslate(t);
          }}
          onClose={() => setPendingTranslate(null)}
        />
      )}

      {(translating || translateError) && (
        <TranslatingOverlay error={translateError} onClose={() => setTranslateError(null)} />
      )}

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
