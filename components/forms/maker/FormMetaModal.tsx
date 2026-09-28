'use client';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { TagInput } from '@/components/studio/TagInput';
import { btn, btnGhost, colors, field, input, label, seg, segOn } from '@/components/deck/studio/ui';
import { ACCENTS, type Accent } from '@/lib/forms/schema';
import { normalizeSlug, slugError, SLUG_MAX } from '@/lib/forms/slug';
import { checkSlug } from '@/lib/forms/api';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERT = '#99335F'; // Burdeos — rol de alerta declarado en lib/tokens.ts

const DESCRIPTION_MAX = 300; // el mismo tope que lib/forms/schema.ts

export type FormMetaValues = {
  title: string;
  client: string;
  accent: Accent;
  tags: string[];
  /* Los cuatro de abajo solo los gobierna el modo `edit`. `undefined` significa "no los toques":
     así crear y duplicar siguen sin opinar sobre la URL pública ni sobre la indexación. */
  slug?: string;
  description?: string;
  indexable?: boolean;
  aiCrawlers?: 'allow' | 'block';
};

type Mode = 'new' | 'duplicate' | 'edit';

const TITLES: Record<Mode, string> = {
  new: 'Crear nuevo formulario',
  duplicate: 'Duplicar formulario',
  edit: 'Ajustes del formulario',
};
const SUBMIT: Record<Mode, string> = { new: 'Crear', duplicate: 'Duplicar', edit: 'Guardar' };
const BUSY: Record<Mode, string> = { new: 'Creando…', duplicate: 'Duplicando…', edit: 'Guardando…' };

/* Los acentos identifican servicios (lib/tokens.ts): no son decoración.
   Se etiquetan con su servicio para que elegir uno sea una decisión consciente. */
const ACCENT_LABELS: Record<Accent, string> = {
  opal: 'Opal · estrategia',
  bordeaux: 'Burdeos · experiencias',
  emerald: 'Esmeralda · cultura',
};

const SLUG_DEBOUNCE = 400;

type SlugCheck = { state: 'idle' | 'checking' | 'ok' | 'taken'; error: string | null };

export function FormMetaModal({
  mode,
  initial,
  allTags = [],
  hint,
  formId,
  publicId,
  onClose,
  onSubmit,
}: {
  mode: Mode;
  initial?: Partial<FormMetaValues>;
  allTags?: string[];
  hint?: string;
  /** uuid de la fila que se edita: su propia slug no cuenta como ocupada al comprobarla. */
  formId?: string;
  /** El id opaco del frontmatter — la URL que sigue funcionando cuando no hay slug. */
  publicId?: string | null;
  onClose: () => void;
  onSubmit: (values: FormMetaValues) => Promise<void> | void;
}) {
  const advanced = mode === 'edit';

  const [title, setTitle] = useState(initial?.title ?? '');
  const [client, setClient] = useState(initial?.client ?? '');
  const [accent, setAccent] = useState<Accent>(initial?.accent ?? 'bordeaux');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [indexable, setIndexable] = useState(initial?.indexable ?? false);
  const [aiCrawlers, setAiCrawlers] = useState<'allow' | 'block'>(initial?.aiCrawlers ?? 'block');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grammar = slugError(slug);
  const [check, setCheck] = useState<SlugCheck>({ state: 'idle', error: null });

  /* Disponibilidad de la slug, con retardo: se pregunta al servidor mientras se teclea para poder
     decirlo aquí y no en un error de guardado que el indicador de la barra no sabe explicar.
     La slug inicial no se comprueba — es la suya y siempre está libre para ella misma. */
  useEffect(() => {
    if (!advanced) return;
    const value = slug.trim();
    if (!value || grammar || value === (initial?.slug ?? '')) {
      setCheck({ state: 'idle', error: null });
      return;
    }
    setCheck({ state: 'checking', error: null });
    let alive = true;
    const t = setTimeout(() => {
      checkSlug(value, formId)
        .then((res) => {
          if (!alive) return;
          setCheck(res.available ? { state: 'ok', error: null } : { state: 'taken', error: res.error });
        })
        // Un fallo de red no debe bloquear el guardado: la unicidad la garantiza la tabla.
        .catch(() => alive && setCheck({ state: 'idle', error: null }));
    }, SLUG_DEBOUNCE);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [slug, grammar, advanced, formId, initial?.slug]);

  const slugProblem = grammar ?? check.error;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (advanced && slugProblem) {
      setError(slugProblem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        client: client.trim(),
        accent,
        tags,
        ...(advanced
          ? {
              slug: slug.trim(),
              description: description.trim(),
              indexable,
              aiCrawlers,
            }
          : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setBusy(false);
    }
  }

  const urlTail = slug.trim() || publicId || '…';

  return (
    <Modal title={TITLES[mode]} onClose={onClose}>
      <form onSubmit={submit}>
        {hint && (
          <div style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginBottom: 16 }}>{hint}</div>
        )}

        <div style={field}>
          <label style={label} htmlFor="fm-title">Título</label>
          <input
            id="fm-title"
            style={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Taller de alineamiento estratégico"
            autoFocus
          />
        </div>

        <div style={field}>
          <label style={label} htmlFor="fm-client">Cliente</label>
          <input
            id="fm-client"
            style={input}
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div style={field}>
          <label style={label}>Acento</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a)}
                aria-pressed={accent === a}
                style={{ ...seg, ...(accent === a ? segOn : {}), textTransform: 'none', letterSpacing: '.02em' }}
              >
                {ACCENT_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        <div style={field}>
          <TagInput
            tags={tags}
            onChange={setTags}
            suggestions={allTags}
            listId="form-tags"
            placeholder="Escribe y pulsa Enter (taller, prework…)"
          />
        </div>

        {advanced && (
          <>
            {/* ── URL pública ──────────────────────────────────────────────── */}
            <Section
              title="URL pública"
              note="El enlace con el id sigue funcionando siempre, tenga alias o no. Cambiar el alias no rompe las respuestas ya recogidas: se guardan contra el id."
            />

            <div style={field}>
              <label style={label} htmlFor="fm-slug">Alias del enlace</label>
              <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${colors.warmDark}`, background: colors.white }}>
                <span
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 0 10px 12px',
                    font: `400 13px/1.4 ${MONO}`, color: colors.ash, whiteSpace: 'nowrap',
                  }}
                >
                  /forms/f/
                </span>
                <input
                  id="fm-slug"
                  style={{ ...input, border: 'none', paddingLeft: 0, flex: 1, minWidth: 0 }}
                  value={slug}
                  /* Se normaliza al teclear: nadie debería tener que adivinar la gramática.
                     Los acentos y espacios se convierten solos (lib/forms/slug.ts). */
                  onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                  maxLength={SLUG_MAX}
                  placeholder="opcional — p. ej. taller-estrategia-acme"
                  spellCheck={false}
                  aria-invalid={!!slugProblem}
                  aria-describedby="fm-slug-status"
                />
              </div>
              <div id="fm-slug-status" style={{ font: `400 11px/1.5 ${MONO}`, marginTop: 6, color: slugProblem ? ALERT : colors.ash }} aria-live="polite">
                {slugProblem
                  ?? (check.state === 'checking'
                    ? 'Comprobando…'
                    : slug.trim()
                      ? `brand.interactius.com/forms/f/${urlTail}`
                      : `Sin alias, el enlace es /forms/f/${publicId ?? '…'} — no adivinable. Déjalo vacío si el formulario es confidencial.`)}
              </div>
            </div>

            {/* ── Compartir y SEO ──────────────────────────────────────────── */}
            <Section
              title="Compartir y SEO"
              note="La descripción es lo que se lee cuando el enlace se pega en WhatsApp, Slack o LinkedIn. Si la dejas vacía se usa «Formulario para {cliente}»."
            />

            <div style={field}>
              <label style={label} htmlFor="fm-description">Descripción</label>
              <textarea
                id="fm-description"
                style={{ ...input, resize: 'vertical', minHeight: 72, lineHeight: 1.5 }}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                maxLength={DESCRIPTION_MAX}
                rows={3}
                placeholder="Unas líneas de prework antes del taller del 12 de marzo."
              />
              <div style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash, marginTop: 4, textAlign: 'right' }}>
                {description.length}/{DESCRIPTION_MAX}
              </div>
            </div>

            <div style={field}>
              <label style={label}>Buscadores</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <Toggle on={!indexable} onClick={() => setIndexable(false)}>No indexar</Toggle>
                <Toggle on={indexable} onClick={() => setIndexable(true)}>Indexar</Toggle>
              </div>
              <Note>
                {indexable
                  ? 'Google podrá indexar esta página. Úsalo solo en convocatorias abiertas: un formulario de cliente no debería aparecer en una búsqueda.'
                  : 'Por defecto. La página queda fuera de los buscadores; el enlace se sigue pudiendo compartir y se despliega igual de bien.'}
              </Note>
            </div>

            {/* ── GEO ──────────────────────────────────────────────────────── */}
            <Section
              title="GEO · motores generativos"
              note="Qué pueden hacer con esta página los rastreadores de ChatGPT, Claude, Perplexity o Gemini."
            />

            <div style={field}>
              <div style={{ display: 'flex', gap: 6 }}>
                <Toggle on={aiCrawlers === 'block'} onClick={() => setAiCrawlers('block')}>Bloquear</Toggle>
                <Toggle on={aiCrawlers === 'allow'} onClick={() => setAiCrawlers('allow')}>Permitir</Toggle>
              </div>
              <Note>
                {aiCrawlers === 'allow'
                  ? 'Sin restricción, y con datos estructurados si además está indexado — para que un motor generativo pueda citar el formulario correctamente.'
                  : 'Por defecto. Se declara «no indexar, no archivar» para GPTBot, ClaudeBot, PerplexityBot, Google-Extended y compañía. Es una declaración legible por máquina: la respeta quien quiere, no es un cortafuegos.'}
              </Note>
            </div>
          </>
        )}

        {error && (
          <div style={{ font: `400 11px/1.4 ${MONO}`, color: ALERT, marginBottom: 12 }} role="alert">
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" style={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" style={btn} disabled={busy}>
            {busy ? BUSY[mode] : SUBMIT[mode]}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* Cabecera de bloque. El modal pasó de cuatro campos a nueve: sin separaciones es un muro. */
function Section({ title, note }: { title: string; note: string }) {
  return (
    <div style={{ borderTop: `1px solid ${colors.warmDark}`, marginTop: 22, paddingTop: 16, marginBottom: 14 }}>
      <div style={{ ...label, marginBottom: 6 }}>{title}</div>
      <div style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash }}>{note}</div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{ ...seg, ...(on ? segOn : {}), textTransform: 'none', letterSpacing: '.02em' }}
    >
      {children}
    </button>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginTop: 6 }}>{children}</div>;
}
