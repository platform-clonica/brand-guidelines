'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compileSocial } from '@/lib/social/compile';
import { CANVASES, type CanvasId } from '@/lib/social/types';
import { LAYOUTS } from '@/lib/social/catalog';
import { TEMPLATES, templateById, type TemplateId } from '@/lib/social/templates';
import { exportAll, exportCard, fileName } from '@/lib/social/exportPng';
import { colors, btn, btnGhost, toolbarBtn, seg, segOn } from '@/components/deck/studio/ui';
import { SocialCard } from './SocialCard';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* El editor: markdown a la izquierda, tarjetas a la derecha.
   Misma mecánica que el Deck Maker a propósito — quien sepa usar uno sabe
   usar el otro. El cromo reutiliza `components/deck/studio/ui.ts`, así que
   los dos editores no pueden separarse visualmente por descuido. */

export function SocialStudio() {
  const [md, setMd] = useState(() => templateById('miradas').md);
  const [canvas, setCanvas] = useState<CanvasId>('carrusel');
  const [titulo, setTitulo] = useState('Carrusel sin título');
  const [actual, setActual] = useState(0);
  const [exportando, setExportando] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);

  const deck = useMemo(() => compileSocial(md, canvas), [md, canvas]);
  const total = deck.slides.length;

  /* Los nodos reales de cada tarjeta, para exportarlos. Se guardan por
     índice: la exportación tiene que salir del DOM que ya está pintado y no
     de una segunda versión del diseño. */
  const nodos = useRef<(HTMLDivElement | null)[]>([]);
  nodos.current.length = total;

  useEffect(() => {
    if (actual >= total) setActual(Math.max(0, total - 1));
  }, [total, actual]);

  const spec = CANVASES[canvas];
  /* La vista previa se escala para caber en su columna sin tocar el lienzo. */
  const [anchoVista, setAnchoVista] = useState(520);
  const vista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = vista.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAnchoVista(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const escala = Math.min(1, (anchoVista - 48) / spec.w);

  const descargarUna = useCallback(async () => {
    const node = nodos.current[actual];
    if (!node) return;
    setError(null);
    setExportando('Preparando la imagen…');
    try {
      await exportCard(node, canvas, fileName(titulo, actual, total));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido generar el PNG.');
    } finally {
      setExportando(null);
    }
  }, [actual, canvas, titulo, total]);

  const descargarTodas = useCallback(async () => {
    const lista = nodos.current.filter((n): n is HTMLDivElement => Boolean(n));
    setError(null);
    setExportando(`Generando ${lista.length} imágenes…`);
    try {
      await exportAll(lista, canvas, titulo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido generar el zip.');
    } finally {
      setExportando(null);
    }
  }, [canvas, titulo]);

  const insertar = (skeleton: string) => {
    setMd((prev) => `${prev.trimEnd()}\n\n---\n\n${skeleton}\n`);
    setActual(total);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.warmLight }}>
      {/* ── Barra superior ── */}
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
          borderBottom: `1px solid ${colors.warmDark}`, background: colors.white, flexWrap: 'wrap',
        }}
      >
        <strong style={{ font: `600 12px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Social Maker
        </strong>

        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Nombre de la pieza"
          style={{
            font: `400 12px/1 ${MONO}`, padding: '9px 10px', minWidth: 220,
            border: `1px solid ${colors.warmDark}`, background: colors.warmLight, color: colors.dark,
          }}
        />

        {/* Lienzo */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(Object.keys(CANVASES) as CanvasId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setCanvas(id)}
              style={canvas === id ? { ...seg, ...segOn } : seg}
              title={`${CANVASES[id].nombre} · ${CANVASES[id].w}×${CANVASES[id].h} (${CANVASES[id].ratio})`}
            >
              {CANVASES[id].nombre}
            </button>
          ))}
        </div>

        <select
          onChange={(e) => {
            const t = templateById(e.target.value as TemplateId);
            setMd(t.md);
            setActual(0);
          }}
          defaultValue="miradas"
          aria-label="Plantilla"
          style={{ ...toolbarBtn, padding: '8px 10px' }}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>

        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {exportando && (
            <span style={{ font: `400 11px/1 ${MONO}`, color: colors.ash }}>{exportando}</span>
          )}
          {error && (
            /* Burdeos es el color de alerta del sistema, declarado en lib/tokens.ts. */
            <span style={{ font: `500 11px/1.4 ${MONO}`, color: colors.bordeaux, maxWidth: 320 }}>{error}</span>
          )}
          <button type="button" style={btnGhost} onClick={descargarUna} disabled={!!exportando}>
            PNG de esta
          </button>
          <button type="button" style={btn} onClick={descargarTodas} disabled={!!exportando}>
            Descargar {total} en .zip
          </button>
        </span>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* ── Columna del texto ── */}
        <section style={{ width: '38%', minWidth: 340, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${colors.warmDark}` }}>
          <textarea
            value={md}
            onChange={(e) => setMd(e.target.value)}
            spellCheck={false}
            aria-label="Texto de las tarjetas, en markdown"
            style={{
              flex: 1, resize: 'none', padding: '20px', border: 'none', outline: 'none',
              font: `400 13px/1.7 ${MONO}`, color: colors.dark, background: colors.white,
              tabSize: 2,
            }}
          />
          {/* Galería de layouts: añade un bloque al final y salta a él. */}
          <div style={{ borderTop: `1px solid ${colors.warmDark}`, padding: 12, background: colors.warmLight }}>
            <p style={{ font: `500 10px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase', color: colors.ash, margin: '0 0 10px' }}>
              Añadir tarjeta
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LAYOUTS.map((l) => (
                <button
                  key={l.marker}
                  type="button"
                  onClick={() => insertar(`[ly: ${l.marker}]\n\n${l.skeleton}`)}
                  title={l.slots}
                  style={{ ...toolbarBtn, padding: '7px 9px' }}
                >
                  {l.nombre}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Columna de las tarjetas ── */}
        <section ref={vista} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', justifyContent: 'center' }}>
            <div className="ix-social">
              {deck.slides.map((slide, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    nodos.current[i] = el?.querySelector<HTMLDivElement>('.frame') ?? null;
                  }}
                  onClick={() => setActual(i)}
                  style={{
                    marginBottom: 20,
                    outline: i === actual ? `2px solid ${colors.dark}` : '2px solid transparent',
                    outlineOffset: 4,
                    cursor: 'pointer',
                  }}
                >
                  <SocialCard slide={slide} canvas={canvas} scale={escala} />
                  <p style={{ font: `400 10px/1 ${MONO}`, color: colors.ash, margin: '8px 0 0', letterSpacing: '.06em' }}>
                    {String(i + 1).padStart(2, '0')} · {slide.kind}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <footer style={{ borderTop: `1px solid ${colors.warmDark}`, padding: '10px 20px', background: colors.white, font: `400 11px/1 ${MONO}`, color: colors.ash }}>
            {total} tarjeta{total === 1 ? '' : 's'} · lienzo {spec.w}×{spec.h} · se exporta a{' '}
            {spec.w * 2}×{spec.h * 2}
          </footer>
        </section>
      </div>
    </div>
  );
}
