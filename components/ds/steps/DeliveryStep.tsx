'use client';
import { useMemo, useState } from 'react';
import { btn, btnGhost, colors } from '@/components/deck/studio/ui';
import { COMPONENTS } from '@/lib/ds/components';
import { deliveryFile } from '@/lib/ds/delivery';
import { cssBlocks } from '@/lib/ds/export/css';
import type { Brand, Configs, Tokens } from '@/lib/ds/schema';
import { ALERT, MONO, Section, Segmented, hintText } from '../controls';
import { downloadFile } from '../download';
import { buildStyleguideHtml } from '../styleguideHtml';

type Props = {
  name: string;
  brand: Brand | null;
  tokens: Tokens;
  configs: Configs;
};

type Tab = 'json' | 'css' | 'styleguide';

const TABS: { id: Tab; label: string }[] = [
  { id: 'json', label: 'JSON' },
  { id: 'css', label: 'CSS' },
  { id: 'styleguide', label: 'Styleguide' },
];

/* Cuánto JSON se enseña en pantalla. El fichero descargado va entero. */
const PREVIEW_LIMIT = 12000;

const code = {
  margin: 0, padding: 14, overflow: 'auto', background: colors.warmLight, border: `1px solid ${colors.warmDark}`,
  font: `400 11px/1.6 ${MONO}`, color: colors.dark, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
} as const;

/* Paso 4 · Entrega. Los tres ficheros salen de los tokens que hay en pantalla, sin recalcular nada: en
   un sistema de motor antiguo son los guardados, que es justo lo que se entregó (plan, H4).

   El styleguide se arma al pulsar, no al abrir el paso: pinta los 17 componentes en todas sus
   combinaciones y es el único trabajo caro de esta pantalla. */
export function DeliveryStep({ name, brand, tokens, configs }: Props) {
  const [tab, setTab] = useState<Tab>('json');
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>(tokens.modes === 'dark' ? 'dark' : 'light');

  const json = useMemo(
    () => deliveryFile('json', { name, tokens, configs, generatedAt: new Date().toISOString() })?.content ?? '',
    [name, tokens, configs],
  );
  const blocks = useMemo(() => cssBlocks(tokens), [tokens]);
  const css = useMemo(() => blocks.map((b) => b.css).join('\n\n'), [blocks]);

  const copy = async (id: string, text: string) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      setError('El navegador no ha dejado copiar al portapapeles. Descarga el fichero.');
    }
  };

  const download = (format: 'json' | 'css', styleguideHtml?: string) => {
    const file = deliveryFile(format, { name, tokens, configs, generatedAt: new Date().toISOString(), styleguideHtml });
    if (file) downloadFile(file);
  };

  /* Un tick antes de pintar los componentes, para que el botón llegue a decir "Preparando". */
  const downloadStyleguide = () => {
    setError(null);
    setBusy(true);
    window.setTimeout(() => {
      try {
        const generatedAt = new Date().toISOString();
        const html = buildStyleguideHtml({ name, tokens, configs, brand, mode, generatedAt });
        const file = deliveryFile('styleguide', { name, tokens, configs, generatedAt, styleguideHtml: html });
        if (file) downloadFile(file);
      } catch (e) {
        setError(e instanceof Error ? `No se ha podido generar el styleguide: ${e.message}` : 'No se ha podido generar el styleguide.');
      } finally {
        setBusy(false);
      }
    }, 0);
  };

  const copyLabel = (id: string, label = 'Copiar') => (copied === id ? 'Copiado ✓' : label);

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 24px 64px' }}>
      <nav aria-label="Formatos de entrega" style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={on ? 'true' : undefined}
              onClick={() => setTab(t.id)}
              style={{
                appearance: 'none', cursor: 'pointer', padding: '9px 14px', font: `500 11px/1 ${MONO}`, letterSpacing: '.04em',
                border: `1px solid ${on ? colors.dark : colors.warmDark}`, background: on ? colors.dark : colors.white,
                color: on ? colors.warmLight : colors.dark,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {error && (
        <div role="alert" style={{ font: `400 11px/1.5 ${MONO}`, color: ALERT, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {tab === 'json' && (
        <Section
          title="tokens.json"
          description={`Metadatos, todos los tokens con su contraste y la configuración de los ${COMPONENTS.length} componentes.`}
          actions={
            <>
              <button type="button" style={btnGhost} onClick={() => void copy('json', json)}>{copyLabel('json')}</button>
              <button type="button" style={btn} onClick={() => download('json')}>Descargar .json</button>
            </>
          }
        >
          <pre style={{ ...code, maxHeight: 420 }}>
            {json.length > PREVIEW_LIMIT ? `${json.slice(0, PREVIEW_LIMIT)}\n\n` : json}
            {json.length > PREVIEW_LIMIT && (
              <span style={{ color: colors.ash }}>{`[${json.length - PREVIEW_LIMIT} caracteres más en el fichero descargado]`}</span>
            )}
          </pre>
        </Section>
      )}

      {tab === 'css' && (
        <>
          <Section
            title="tokens.css"
            description="Copia bloque a bloque o descarga la hoja entera. Las variables son las mismas que usa la previsualización."
            actions={
              <>
                <button type="button" style={btnGhost} onClick={() => void copy('css', css)}>{copyLabel('css', 'Copiar todo')}</button>
                <button type="button" style={btn} onClick={() => download('css')}>Descargar .css</button>
              </>
            }
          >
            <p style={{ ...hintText, margin: 0 }}>
              {blocks.length} bloques · {css.split('\n').length} líneas
            </p>
          </Section>

          {blocks.map((b) => (
            <Section
              key={b.id}
              title={b.title}
              actions={<button type="button" style={btnGhost} onClick={() => void copy(b.id, b.css)}>{copyLabel(b.id)}</button>}
            >
              <pre style={{ ...code, maxHeight: 220 }}>{b.css}</pre>
            </Section>
          ))}
        </>
      )}

      {tab === 'styleguide' && (
        <Section
          title="Styleguide"
          description="Un HTML autocontenido para el cliente: color con su contraste medido, tipografía, espaciado, radios, sombras, breakpoints, retícula y los 17 componentes con sus ejes. Las tipografías se piden a Google Fonts, así que sin conexión se ve todo menos las fuentes."
          actions={
            <button type="button" style={btn} disabled={busy} onClick={downloadStyleguide}>
              {busy ? 'Preparando' : 'Descargar .html'}
            </button>
          }
        >
          {tokens.modes === 'both' ? (
            <div style={{ maxWidth: 260 }}>
              <span style={{ ...hintText, display: 'block', marginBottom: 6 }}>Modo en el que se pinta</span>
              <Segmented
                ariaLabel="Modo del styleguide"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'light', label: 'Claro' },
                  { value: 'dark', label: 'Oscuro' },
                ]}
              />
            </div>
          ) : (
            <p style={{ ...hintText, margin: 0 }}>Se pinta en modo {tokens.modes === 'dark' ? 'oscuro' : 'claro'}, el del sistema.</p>
          )}
        </Section>
      )}
    </div>
  );
}
