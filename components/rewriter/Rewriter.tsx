'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { Wordmark } from '@/components/studio/Wordmark';
import { btn, colors, label as labelStyle, seg, segOn } from '@/components/deck/studio/ui';
import type { EvalResult } from '@/lib/eval';
import {
  AXIS_MAX,
  AXIS_MIN,
  FORMALITY_SCALE,
  LANGS,
  LENGTHS,
  PRESETS,
  TEXT_TYPES,
  WARMTH_SCALE,
  type LengthId,
  type OutputLang,
  type PresetId,
  type RewriteRequest,
  type TextType,
} from '@/lib/rewriter/options';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const SERIF = 'var(--font-ibm-plex-serif, serif)';

type Result = { subject: string; body: string; changes: string[]; eval: EvalResult };

/* Anatomía de escritorio, la misma que DeckStudio y FormStudio: shell de 100vh que no scrollea,
   aside de ancho fijo a la izquierda y los paneles de trabajo enfrentados a la derecha. Como en
   sus hermanas, no hay colapso a una columna: es una herramienta de escritorio. */
const ASIDE_W = 460;
const PAD = 20;        // aire alrededor de los paneles de trabajo
const SEP_W = 20;      // tirador; hace también de hueco entre los dos paneles
const PANE_MIN = 320;  // ni Borrador ni Resultado bajan de aquí
const SPLIT_STORAGE_KEY = 'rewrite.draftW';

/* ReWrit_r — afina un borrador con la voz de marca aplicada.

   Estilos inline como el resto del studio (DeckMaker / FormMaker), no una hoja .ixw-*: esta
   pantalla es interactiva de arriba abajo, así que ya es un client component y no gana nada
   sacando el hover a CSS.

   El texto reescrito se pinta en IBM Plex Serif — es prosa, no chrome. Todo lo demás va en
   Mono, igual que en las dos herramientas hermanas. */
export function Rewriter() {
  const [draft, setDraft] = useState('');
  const [context, setContext] = useState('');
  const [textType, setTextType] = useState<TextType>('correo');
  const [preset, setPreset] = useState<PresetId>('cliente');
  const [formality, setFormality] = useState(3);
  const [warmth, setWarmth] = useState(3);
  const [lang, setLang] = useState<OutputLang>('auto');
  const [length, setLength] = useState<LengthId>('igual');
  const [brandVoice, setBrandVoice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* Reparto Borrador / Resultado. `null` = mitad y mitad (los dos paneles a `flex: 1`); en cuanto
     se arrastra —o se recupera lo guardado— el Borrador pasa a tener ancho en píxeles y el
     Resultado se queda con el resto. Se persiste como en DeckStudio y FormStudio. */
  const [draftW, setDraftW] = useState<number | null>(null);
  const [gripHot, setGripHot] = useState(false);
  const paneRowRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Ancho útil de la fila de paneles y borde izquierdo del primero, descontando el aire.
  const paneBox = () => {
    const rect = paneRowRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { left: rect.left + PAD, width: rect.width - PAD * 2 };
  };
  const clampDraft = (w: number, inner: number) =>
    Math.max(PANE_MIN, Math.min(w, inner - SEP_W - PANE_MIN));

  useEffect(() => {
    const saved = Number(localStorage.getItem(SPLIT_STORAGE_KEY));
    const box = paneBox();
    if (saved && box) setDraftW(clampDraft(saved, box.width));

    // Al estrechar la ventana, el Borrador cede para que el Resultado no baje del mínimo.
    const onResize = () =>
      setDraftW((w) => {
        const b = paneBox();
        return w === null || !b ? w : clampDraft(w, b.width);
      });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const box = paneBox();
      if (!box) return;
      setDraftW(clampDraft(e.clientX - box.left, box.width));
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
    if (draftW !== null) localStorage.setItem(SPLIT_STORAGE_KEY, String(Math.round(draftW)));
  }, [draftW]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const rewrite = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    /* Tipado a propósito: un objeto literal suelto dejaría que olvidar un campo compilara y
       pasara los tests con el control correspondiente inerte. Es como nació el `_type` que
       compileDeck ignora. Aquí, omitir uno es error de compilación. */
    const payload: RewriteRequest = {
      draft,
      context,
      textType,
      preset,
      formality,
      warmth,
      lang,
      length,
      brandVoice,
    };

    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'No se ha podido reescribir el texto.');
        return;
      }
      setResult(data as Result);
    } catch {
      setError('No se ha podido contactar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      /* Sin asunto no se anteponen dos saltos de línea vacíos al pegar un mensaje de chat. */
      const subject = result.subject.trim();
      await navigator.clipboard.writeText(subject ? `${subject}\n\n${result.body}` : result.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('El navegador ha bloqueado el portapapeles.');
    }
  };

  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: colors.warmLight, color: colors.dark,
      }}
    >
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight, flexShrink: 0,
        }}
      >
        {/* Imagotipo → lanzador de apps; el wordmark de la herramienta es identidad, no enlace. */}
        <BrandMark height={20} href="/workspace" label="Ir a la landing de aplicaciones" />
        <MarkDivider />
        <Wordmark before="ReWrit" after="r" title="ReWritr" height={22} />
        <span style={{ marginLeft: 'auto' }} />
        <LogoutButton />
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* ── Aside: contexto arriba, ajustes en medio, Reescribir anclado abajo ── */}
        <aside
          style={{
            width: ASIDE_W, flexShrink: 0, display: 'flex', flexDirection: 'column',
            minHeight: 0, gap: 12, padding: PAD, borderRight: `1px solid ${colors.warmDark}`,
          }}
        >
          <section style={{ ...panel, flexShrink: 0 }}>
            <label style={labelStyle} htmlFor="rw-context">Información de contexto</label>
            <textarea
              id="rw-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ej.: cliente nuevo y algo escéptico, la propuesta sigue abierta. Responde a una duda sobre plazos."
              rows={3}
              // `font` completo, no `fontSize`: `area` ya fija el shorthand y mezclarlos avisa.
              style={{ ...area, font: `400 13px/1.6 ${SERIF}` }}
            />
          </section>

          {/* Los ajustes se quedan con el alto sobrante y scrollean por dentro: así el botón
              de abajo no se va nunca de la vista, entre en la ventana lo que entre. */}
          <section style={{ ...panel, flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <span style={labelStyle}>Ajustes</span>

            {/* Qué escribes precede a cómo lo dices, así que el tipo abre el panel. */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ ...labelStyle, marginBottom: 8 }}>Tipo de texto</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {TEXT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTextType(t.id)}
                    aria-pressed={textType === t.id}
                    style={textType === t.id ? { ...seg, ...segOn } : seg}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <span style={{ ...labelStyle, marginBottom: 8 }}>Perfil</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              {PRESETS.map((p) => {
                const on = preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p.id)}
                    aria-pressed={on}
                    style={{
                      appearance: 'none', cursor: 'pointer', textAlign: 'left', padding: '9px 10px',
                      border: `1px solid ${on ? colors.dark : colors.warmDark}`,
                      background: on ? colors.dark : colors.white,
                      color: on ? colors.warmLight : colors.dark,
                      fontFamily: MONO,
                    }}
                  >
                    <span style={{ display: 'block', font: `500 12px/1.3 ${MONO}` }}>{p.label}</span>
                    <span
                      style={{
                        display: 'block', marginTop: 2, font: `400 10px/1.3 ${MONO}`,
                        color: on ? colors.warmDark : colors.ash,
                      }}
                    >
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
              <Axis
                id="rw-formality"
                name="Formalidad"
                value={formality}
                display={FORMALITY_SCALE[formality - 1]}
                onChange={setFormality}
              />
              <Axis
                id="rw-warmth"
                name="Calidez"
                value={warmth}
                display={WARMTH_SCALE[warmth - 1]}
                onChange={setWarmth}
              />

              <div>
                <span style={{ ...labelStyle, marginBottom: 8 }}>Longitud</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {LENGTHS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLength(l.id)}
                      aria-pressed={length === l.id}
                      style={length === l.id ? { ...seg, ...segOn } : seg}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12, marginTop: 20, paddingTop: 16,
                borderTop: `1px solid ${colors.warmDark}`,
              }}
            >
              <div>
                <span style={{ ...labelStyle, marginBottom: 8 }}>Idioma de salida</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {LANGS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLang(l.id)}
                      aria-pressed={lang === l.id}
                      style={{ ...(lang === l.id ? { ...seg, ...segOn } : seg), flex: '0 0 auto', minWidth: 52 }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBrandVoice(!brandVoice)}
                aria-pressed={brandVoice}
                style={{
                  appearance: 'none', cursor: 'pointer', border: 0, background: 'transparent',
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0,
                  font: `500 10px/1 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase',
                  color: brandVoice ? colors.dark : colors.ash, alignSelf: 'flex-end',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: 'relative', display: 'inline-block', width: 30, height: 16,
                    background: brandVoice ? colors.dark : colors.warmDark, flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', top: 3, left: brandVoice ? 17 : 3, width: 10, height: 10,
                      background: colors.white, transition: 'left 150ms ease',
                    }}
                  />
                </span>
                Voz Interactius
              </button>
            </div>
          </section>

          <button
            type="button"
            onClick={rewrite}
            disabled={loading || !draft.trim()}
            style={{
              ...btn, width: '100%', flexShrink: 0,
              padding: '14px 16px', font: `500 12px/1 ${MONO}`, letterSpacing: '.06em',
              opacity: loading || !draft.trim() ? 0.35 : 1,
              cursor: loading || !draft.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Reescribiendo…' : 'Reescribir'}
          </button>
        </aside>

        {/* ── Borrador | Resultado, con el reparto en manos de quien escribe ── */}
        <div ref={paneRowRef} style={{ flex: 1, minWidth: 0, display: 'flex', padding: PAD }}>
          <section
            style={{
              ...panel, display: 'flex', flexDirection: 'column', minWidth: 0,
              ...(draftW === null ? { flex: 1 } : { width: draftW, flexShrink: 0 }),
            }}
          >
            <label style={labelStyle} htmlFor="rw-draft">Borrador</label>
            <textarea
              id="rw-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Pega aquí tu borrador de correo o de texto."
              style={{ ...area, flex: 1, minHeight: 0 }}
            />
          </section>

          {/* Tirador de redimensionado: hace de hueco entre los dos paneles y de agarre. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Ajustar el reparto entre borrador y resultado"
            onPointerDown={startResize}
            onMouseEnter={() => setGripHot(true)}
            onMouseLeave={() => setGripHot(false)}
            style={{
              width: SEP_W, flexShrink: 0, cursor: 'col-resize', touchAction: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 3, height: 36, background: gripHot ? colors.dark : colors.warmDark,
                transition: 'background 150ms ease',
              }}
            />
          </div>

          {/* ── Resultado ── */}
          <section style={{ ...panel, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Resultado</span>
              {result && (
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button type="button" onClick={rewrite} style={ghost}>Otra versión</button>
                  <button type="button" onClick={copy} style={ghost}>{copied ? 'Copiado' : 'Copiar'}</button>
                </span>
              )}
            </div>

            {!result && !loading && !error && (
              <p style={{ ...centered, color: colors.ash }}>El texto reescrito aparecerá aquí.</p>
            )}
            {loading && <p style={{ ...centered, color: colors.ash }}>Reescribiendo…</p>}
            {error && !loading && (
              <p role="alert" style={{ ...centered, color: '#99335F' }}>{error}</p>
            )}

            {result && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 14, flex: 1 }}>
                {/* Solo el correo lleva asunto. En el resto el modelo devuelve cadena vacía. */}
                {result.subject.trim() && (
                  <div style={{ paddingBottom: 14, borderBottom: `1px solid ${colors.warmDark}` }}>
                    <span style={{ ...labelStyle, marginBottom: 4 }}>Asunto</span>
                    <p style={{ margin: 0, font: `500 16px/1.3 ${SERIF}` }}>{result.subject}</p>
                  </div>
                )}

                <div style={{ margin: 0, font: `400 15px/1.7 ${SERIF}`, whiteSpace: 'pre-wrap' }}>
                  {result.body}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${colors.warmDark}` }}>
                  <span style={{ ...labelStyle, marginBottom: 8 }}>Qué ha cambiado</span>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.changes.map((c, i) => (
                      <li key={i} style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash, display: 'flex', gap: 8 }}>
                        <span aria-hidden style={{ color: colors.warmDark }}>—</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Auditoría contra las reglas duras, del mismo motor que /api/eval. */}
                  <p
                    style={{
                      margin: '14px 0 0', display: 'flex', alignItems: 'center', gap: 8,
                      font: `400 11px/1 ${MONO}`, color: result.eval.hardFail ? '#99335F' : colors.ash,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: result.eval.hardFail ? '#99335F' : '#5999A6',
                      }}
                    />
                    Cumplimiento de voz {result.eval.score}/100
                    {result.eval.hardFail && ' · revisar'}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Axis({
  id, name, value, display, onChange,
}: {
  id: string;
  name: string;
  value: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <label htmlFor={id} style={{ ...labelStyle, marginBottom: 0 }}>{name}</label>
        <span style={{ font: `400 11px/1 ${MONO}`, color: colors.dark }}>{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={AXIS_MIN}
        max={AXIS_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: colors.dark }}
      />
    </div>
  );
}

const panel: CSSProperties = {
  border: `1px solid ${colors.warmDark}`,
  background: colors.white,
  padding: 18,
};

const area: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  // Sin tirador propio: en un shell de alto fijo, redimensionar el textarea pelea con la caja.
  resize: 'none',
  border: 0,
  outline: 'none',
  background: 'transparent',
  color: colors.dark,
  font: `400 14px/1.6 ${SERIF}`,
};

const ghost: CSSProperties = {
  appearance: 'none',
  cursor: 'pointer',
  border: `1px solid ${colors.warmDark}`,
  background: colors.white,
  color: colors.ash,
  padding: '6px 10px',
  font: `500 10px/1 ${MONO}`,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
};

const centered: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  margin: 0,
  font: `400 12px/1.5 ${MONO}`,
};
