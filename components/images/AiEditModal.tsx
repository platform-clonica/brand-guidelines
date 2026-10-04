'use client';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors, input, label, linkBtn, linkDanger, seg, segOn } from '@/components/deck/studio/ui';
import { useToast } from '@/components/ui/Toast';
import { commitEdit, discardEdit, getEditQuota, startEdit, type EditQuota, type EditStart } from '@/lib/decks/api';
import type { ImageRecord, ImageUse } from '@/lib/decks/types';
import { uploadEditVariants } from '@/lib/images/client';
import { parseTmp } from '@/lib/images/edit/files';
import { DEFAULT_EDIT_MODEL, EDIT_MODELS, type EditModelId } from '@/lib/images/edit/models';
import { INSTRUCTION_MAX } from '@/lib/images/edit/prompt';
import { usedByText } from '@/lib/images/view';
import { HoldToCompare } from './HoldToCompare';
import './images.css';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const EDIT_FAILED =
  'No se ha podido editar la imagen. Este intento no cuenta para tu límite. Vuelve a intentarlo en un momento.';
const PRO_HINT = 'Prueba con Nano Banana Pro: a veces edita fotos que este rechaza.';
const SAVE_FAILED = 'No se ha podido guardar la edición. Vuelve a intentarlo.';
/* El servidor corta la llamada al modelo a los 40 s y responde antes de los 60 de Netlify. El navegador espera
   un poco más que eso; si aun así no llega nada, enseña el fallo y vuelve a pedir la cuota. */
const CLIENT_TIMEOUT_MS = 55_000;

type Variant = 'standard' | 'people';
const VARIANTS: { id: Variant; label: string }[] = [
  { id: 'standard', label: 'Estándar' },
  { id: 'people', label: 'Personas' },
];

/* «Editar con IA» (docs/features/img-r.md, F2 a F17).

   A la izquierda, la imagen; a la derecha, el prompt de la guía (preseleccionado según haya personas), el
   modelo (Nano Banana 2 por defecto, decisión de Carlos del 3 de octubre de 2026), la indicación, el contador
   y las acciones. Sin texto explicativo del estilo ni aviso de privacidad (F2).

   Mientras edita o guarda no se cierra (ni Cancelar, ni Escape, ni clic fuera) ni se tocan los controles.
   Cerrar con un resultado sin guardar lo descarta sin preguntar; el intento cuenta igual (F17). */
export function AiEditModal({
  image,
  uses,
  onClose,
  onSaved,
}: {
  image: ImageRecord;
  /** Dónde se usa: decide si se puede sobrescribir (F12). */
  uses: ImageUse[] | undefined;
  onClose: () => void;
  onSaved: (row: ImageRecord, mode: 'copy' | 'overwrite') => void;
}) {
  const toast = useToast();
  const people = image.people_present;
  const [variant, setVariant] = useState<Variant>(people ? 'people' : 'standard');
  const [model, setModel] = useState<EditModelId>(DEFAULT_EDIT_MODEL);
  const [instruction, setInstruction] = useState('');
  const [quota, setQuota] = useState<EditQuota | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<EditStart | null>(null);
  const [tries, setTries] = useState(0);
  const [failure, setFailure] = useState<{ text: string; proHint: boolean } | null>(null);
  const [holding, setHolding] = useState(false);
  const [liveUses, setLiveUses] = useState(uses);
  const insId = useId();

  useEffect(() => {
    getEditQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, []);

  // F17: lo que quede sin guardar al cerrar se descarta. La ref, para que el cierre vea el último resultado.
  const resultRef = useRef<EditStart | null>(null);
  resultRef.current = result;
  useEffect(
    () => () => {
      if (resultRef.current) discardEdit(image.id, resultRef.current.tmp);
    },
    [image.id],
  );

  const locked = busy || saving;
  const exhausted = quota !== null && quota.remaining <= 0;
  const inUse = (liveUses?.length ?? 0) > 0;

  const run = async () => {
    if (locked || exhausted) return;
    const previous = result;
    setBusy(true);
    setFailure(null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    try {
      const a = await startEdit(image.id, { variant, instruction, model }, ctrl.signal);
      if (a.ok) {
        if (previous) discardEdit(image.id, previous.tmp);
        setResult(a.result);
        setTries((t) => t + 1);
        setQuota(a.result);
      } else {
        if (a.quota) setQuota(a.quota);
        else void getEditQuota().then(setQuota).catch(() => {});
        // Agotado no es un fallo: lo dice el contador (F5). Un fallo sin cuota es un 504 de la pasarela.
        if (!a.exhausted) setFailure({ text: a.quota ? a.error : EDIT_FAILED, proHint: !!a.blocked && model === 'fast' });
      }
    } catch {
      setFailure({ text: EDIT_FAILED, proHint: false });
      void getEditQuota().then(setQuota).catch(() => {});
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  const discard = () => {
    if (!result || locked) return;
    discardEdit(image.id, result.tmp);
    resultRef.current = null;
    setResult(null);
    setFailure(null);
    toast.show('Edición descartada');
  };

  const save = async (mode: 'copy' | 'overwrite') => {
    const tmp = result ? parseTmp(result.tmp) : null;
    if (!result || !tmp || locked || (mode === 'overwrite' && inUse)) return;
    setSaving(true);
    try {
      const v = await uploadEditVariants(result.previewUrl, tmp.id);
      const r = await commitEdit(image.id, { tmp: result.tmp, mode, variant, model, instruction, original: v.original, light: v.light });
      if (!r.ok) {
        // Alguien la colocó en un documento entretanto: ya no se puede sobrescribir (F12).
        setLiveUses(r.uses);
        return;
      }
      resultRef.current = null;
      setResult(null);
      toast.show(mode === 'copy' ? 'Copia guardada' : 'Imagen sobrescrita. El original queda guardado');
      onSaved(r.row, mode);
    } catch {
      toast.show(SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (locked) return;
    onClose();
  };

  let variantHint: { text: string; bad: boolean };
  if (variant === 'standard' && people === true) variantHint = { text: 'Con este prompt, el modelo puede quitar a las personas de la foto.', bad: true };
  else if (people === null) variantHint = { text: 'Esta imagen aún no se ha analizado: revisa el prompt antes de aplicar.', bad: false };
  else variantHint = { text: people ? 'Elegido porque hay personas en la foto.' : 'Elegido porque no hay personas en la foto.', bad: false };

  let stateLine: { text: string; color: string; pulse?: boolean } | null = null;
  if (busy) stateLine = { text: 'Editando. Puede tardar hasta 40 segundos.', color: colors.dark, pulse: true };
  else if (saving) stateLine = { text: 'Guardando', color: colors.dark, pulse: true };
  else if (failure) stateLine = { text: failure.text, color: colors.bordeaux };
  else if (result?.width && result.height) stateLine = { text: `Versión ${tries} · ${result.width} × ${result.height} px`, color: colors.ash };

  return (
    <Modal title="Editar con IA" onClose={close} width={960}>
      <div className="ixi-ai">
        <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
          <div style={{ background: colors.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
            {/* <img> y no next/image: la URL pública de Storage ya es el fichero que se quiere. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result && !holding ? result.previewUrl : image.url}
              alt=""
              style={{ maxHeight: '58vh', width: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div role="status" className={stateLine?.pulse ? 'ixi-pulse' : undefined} style={{ ...stateText, color: stateLine?.color }}>
            {stateLine?.text}
          </div>
          {failure?.proHint && <div style={{ ...stateText, color: colors.ash, minHeight: 0 }}>{PRO_HINT}</div>}
        </div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start', minWidth: 0 }}>
          <div>
            <span style={label}>Prompt de la guía</span>
            <Segments label="Prompt de la guía" options={VARIANTS} value={variant} onChange={setVariant} disabled={locked} />
            <div style={{ ...hint, color: variantHint.bad ? colors.bordeaux : colors.ash }}>{variantHint.text}</div>
          </div>

          <div>
            <span style={label}>Modelo</span>
            <Segments label="Modelo" options={EDIT_MODELS} value={model} onChange={setModel} disabled={locked} />
          </div>

          <div>
            <label htmlFor={insId} style={label}>
              Indicación, opcional
            </label>
            <textarea
              id={insId}
              rows={3}
              maxLength={INSTRUCTION_MAX}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Por ejemplo: más cálida, quita el cartel del fondo"
              disabled={locked}
              style={{ ...input, resize: 'vertical', minHeight: 72, font: `400 12px/1.5 ${MONO}` }}
            />
            <div style={{ ...hint, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <span>Describe el retoque con tus palabras.</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {instruction.length} / {INSTRUCTION_MAX}
              </span>
            </div>
          </div>

          {quota && (
            <div style={{ font: `400 12px/1.5 ${MONO}`, color: exhausted && !result ? colors.bordeaux : colors.ashDark }}>
              {exhausted && !result ? (
                `Has llegado a las ${quota.limit} ediciones de este mes. El contador se reinicia ${quota.resetLabel}.`
              ) : (
                <>
                  Te quedan <strong style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{quota.remaining}</strong> de {quota.limit} ediciones
                  este mes. Cada intento cuenta.
                </>
              )}
            </div>
          )}

          {!busy && !result && (
            <div>
              <button type="button" style={{ ...btn, ...(exhausted || saving ? off : null) }} onClick={run} disabled={exhausted || saving}>
                Aplica el estilo
              </button>
            </div>
          )}

          {!busy && result && (
            <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
              <HoldToCompare onHold={setHolding} disabled={saving} />
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="hover-wipe-underline"
                  style={{ ...linkBtn, ...(exhausted || saving ? offLink : null) }}
                  onClick={run}
                  disabled={exhausted || saving}
                >
                  Probar otra vez
                </button>
                <button type="button" className="hover-wipe-underline" style={{ ...linkDanger, ...(saving ? offLink : null) }} onClick={discard} disabled={saving}>
                  Descartar
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{ ...btnGhost, ...(inUse || saving ? off : null) }}
                  onClick={() => void save('overwrite')}
                  disabled={inUse || saving}
                >
                  Sobrescribir
                </button>
                <button type="button" style={{ ...btn, ...(saving ? off : null) }} onClick={() => void save('copy')} disabled={saving}>
                  Guardar como copia
                </button>
              </div>
              <p style={{ ...hint, margin: 0 }}>
                {inUse
                  ? `No se puede sobrescribir: ${usedByText(liveUses ?? [])}. Guárdala como copia.`
                  : 'Sobrescribir cambia esta imagen y guarda el original para poder volver a él.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
        <button type="button" style={{ ...btnGhost, ...(locked ? off : null) }} onClick={close} disabled={locked}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

/* Los segmentos de `studio/ui.ts` (F2a), con el estado en `aria-pressed`. */
function Segments<T extends string>({
  label: groupLabel,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled: boolean;
}) {
  return (
    <div role="group" aria-label={groupLabel} style={{ display: 'flex', maxWidth: 300 }}>
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          disabled={disabled}
          style={{
            ...seg,
            ...(value === o.id ? { ...segOn, position: 'relative', zIndex: 1 } : null),
            // Los bordes se solapan un píxel en vez de quitar uno: mezclar `border` y `borderLeft` hace que
            // React avise al repintar. El activo va encima para que se vea entero su borde de tinta.
            ...(i > 0 ? { marginLeft: -1 } : null),
            ...(disabled ? { cursor: 'not-allowed', opacity: 0.6 } : null),
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const stateText: CSSProperties = { font: `500 11px/1.5 ${MONO}`, minHeight: 16 };
const hint: CSSProperties = { font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginTop: 6 };
const off: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const offLink: CSSProperties = { opacity: 0.3, cursor: 'not-allowed' };
