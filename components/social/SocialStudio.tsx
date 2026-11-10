'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compileSocial } from '@/lib/social/compile';
import { CANVASES, type CanvasId } from '@/lib/social/types';
import { LAYOUTS } from '@/lib/social/catalog';
import { TEMPLATES, templateById, type TemplateId } from '@/lib/social/templates';
import { exportAll, exportCard, fileName } from '@/lib/social/exportPng';
import { colors, btn, btnGhost, toolbarBtn, seg, segOn } from '@/components/deck/studio/ui';
import { ImageGallery } from '@/components/deck/studio/ImageGallery';
import {
  countBlockImages,
  removeBlockImageAt,
  setBlockBackground,
  setBlockImageAt,
  setMeta,
} from '@/lib/social/source';
import { Paleta } from './studio/Paleta';
import { SocialCard } from './SocialCard';

/* Los layouts que llevan foto a sangre. En ellos manda la imagen, así que
   el relleno de color no pinta nada y la paleta se apaga. */
const CON_FOTO: readonly string[] = ['portada', 'foto', 'cierre'];

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
  /* Qué imagen se está cambiando: el bloque del markdown y, dentro de él,
     cuál de sus imágenes. El cierre tiene dos: el fondo y el retrato. */
  const [ranura, setRanura] = useState<{ bloque: number; pos: number } | null>(null);
  /* Cuando está activo, lo que se elija en la galería es el logo del
     cliente y no una foto de tarjeta. */
  const [eligiendoLogo, setEligiendoLogo] = useState(false);
  const [encima, setEncima] = useState<number | null>(null);

  const deck = useMemo(() => compileSocial(md, canvas), [md, canvas]);
  const total = deck.slides.length;

  /* Avisos. Hoy solo uno, y vale la pena: la foto del autor sale del
     nombre, así que una errata deja la tarjeta firmada con el isotipo y
     nadie se entera hasta que está publicada. Mejor decirlo aquí. */
  const avisos = useMemo(
    () =>
      deck.slides.flatMap((s, i) =>
        s.kind === 'cierre' && s.autorEnEquipo === false
          ? [`Tarjeta ${i + 1}: «${s.author}» no está en el equipo, así que firma el isotipo.`]
          : [],
      ),
    [deck],
  );

  /* Los nodos reales de cada tarjeta, para exportarlos. Se guardan por
     índice: la exportación tiene que salir del DOM que ya está pintado y no
     de una segunda versión del diseño. */
  const nodos = useRef<(HTMLDivElement | null)[]>([]);
  nodos.current.length = total;

  useEffect(() => {
    if (actual >= total) setActual(Math.max(0, total - 1));
  }, [total, actual]);

  const spec = CANVASES[canvas];

  /* La vista previa se escala para caber en su hueco sin tocar el lienzo.

     Se mide el ALTO además del ancho, y es lo que arregla el problema de
     verdad: ajustando solo al ancho, una tarjeta de 1350 de alto se salía
     de la pantalla en cuanto la columna era ancha. Un carrusel es vertical;
     el alto es la dimensión que manda. */
  const [caja, setCaja] = useState({ w: 520, h: 700 });
  const vista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = vista.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setCaja({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Encaje: la tarjeta entera dentro del hueco, con aire. Nunca por encima
     del 100 %, que sería ampliar un lienzo fijo y emborronarlo. */
  const encaje = Math.min(1, (caja.w - 72) / spec.w, (caja.h - 72) / spec.h);
  /* Y encima, el zoom que elija quien edita. Se guarda en el navegador
     porque es una preferencia de pantalla, no de la pieza: quien trabaja en
     un portátil no quiere volver a bajarlo cada vez que abre. */
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem('socialmakr:zoom'));
      if (v >= 0.25 && v <= 1.5) setZoom(v);
    } catch {
      /* Modo privado o almacenamiento bloqueado: se queda en 1 y no pasa nada. */
    }
  }, []);
  const cambiarZoom = useCallback((v: number) => {
    const z = Math.min(1.5, Math.max(0.25, Math.round(v * 100) / 100));
    setZoom(z);
    try {
      localStorage.setItem('socialmakr:zoom', String(z));
    } catch {
      /* Ídem: la preferencia se pierde al cerrar, pero la sesión funciona. */
    }
  }, []);
  const escala = encaje * zoom;

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

  /* El índice del bloque de markdown que produjo la tarjeta. Hoy es 1:1,
     pero se lee de `provenance` para que siga valiendo si deja de serlo. */
  const bloqueDe = useCallback((i: number) => deck.provenance?.[i] ?? i, [deck]);

  /* Clic sobre una tarjeta: el primero SELECCIONA, el segundo actúa.

     Si el clic sobre la foto abriera la galería a la primera, una tarjeta
     con foto no se podría ni seleccionar para bajarle la exposición: el
     modal saltaría siempre. Seleccionar y luego actuar es el patrón de
     toda la vida y conserva el gesto de «clico en la imagen y la cambio»,
     que es lo que se pidió. */
  const alClicar = useCallback(
    (e: React.MouseEvent, i: number) => {
      const yaEstaba = actual === i;
      setActual(i);
      if (!yaEstaba) return;
      const t = e.target as HTMLElement;
      if (t.closest('.avatar')) setRanura({ bloque: bloqueDe(i), pos: 1 });
      else if (t.closest('.photo')) setRanura({ bloque: bloqueDe(i), pos: 0 });
    },
    [actual, bloqueDe],
  );

  const slideActual = deck.slides[actual];
  /* Donde hay foto no hay relleno: el fondo es la imagen. */
  const paletaApagada = !slideActual
    ? 'Elige una tarjeta para cambiarle el fondo.'
    : CON_FOTO.includes(slideActual.kind)
      ? `Una tarjeta de «${slideActual.kind}» lleva foto a sangre: el fondo es la imagen. Haz clic sobre ella para cambiarla.`
      : slideActual.fondo?.src
        ? 'Esta tarjeta tiene foto de fondo. Quítala para volver a un color.'
        : undefined;

  /* La tarjeta tiene foto si el layout la lleva de serie o si alguien le
     ha puesto una de fondo. En los dos casos se puede bajar la exposición. */
  const conFotoActual = Boolean(
    slideActual && (CON_FOTO.includes(slideActual.kind) || slideActual.fondo?.src),
  );
  const exposicionActual = slideActual?.exposicion ?? 100;

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

        {/* Desplegable a secas: sin caja ni relleno, para que no compita con
            los botones que sí son acciones. La flecha es un fondo dibujado
            y no un carácter, así que no se puede seleccionar con el texto. */}
        <select
          onChange={(e) => {
            const t = templateById(e.target.value as TemplateId);
            setMd(t.md);
            setActual(0);
          }}
          defaultValue="miradas"
          aria-label="Plantilla"
          style={{
            appearance: 'none', border: 'none', background: 'transparent',
            font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', color: colors.dark,
            margin: 0, padding: '0 18px 0 0', cursor: 'pointer',
            backgroundImage:
              `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='9' height='6'><path d='M0 0h9L4.5 6z' fill='%231C1A17'/></svg>")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right center',
          }}
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
          {/* El logo del cliente se hereda a toda la pieza, así que se pone
              una vez y no tarjeta a tarjeta. */}
          <button
            type="button"
            style={btnGhost}
            onClick={() => (deck.logo?.src ? setMd((prev) => setMeta(prev, 0, 'logo', null)) : setEligiendoLogo(true))}
            title={
              deck.logo?.src
                ? 'Quitar el logo del cliente de toda la pieza'
                : 'Añadir el logo de un cliente: va en la portada arriba a la derecha y al pie de las demás'
            }
          >
            {deck.logo?.src ? 'Quitar logo de cliente' : 'Logo de cliente'}
          </button>
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

          {/* Panel de la foto de la tarjeta seleccionada.

              Existe porque el control por hover sobre la propia tarjeta,
              que también sigue ahí, no se encuentra: quien edita mira a la
              columna de la izquierda, que es donde están las demás
              acciones. Una función que no se ve es una función que no
              existe. */}
          <div style={{ padding: 12, borderTop: `1px solid ${colors.warmDark}`, background: colors.warmLight }}>
            <p
              style={{
                font: `500 10px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase',
                color: colors.ash, margin: '0 0 10px',
              }}
            >
              Foto de la tarjeta
            </p>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={!slideActual}
                onClick={() => slideActual && setRanura({ bloque: bloqueDe(actual), pos: 0 })}
                style={{ ...toolbarBtn, padding: '7px 9px', opacity: slideActual ? 1 : 0.45 }}
              >
                {conFotoActual ? 'Cambiar foto' : 'Añadir foto'}
              </button>

              {/* Quitar solo vale para la foto de fondo. En los layouts que
                  la llevan de serie no tiene sentido: una portada sin foto
                  no es una portada. */}
              <button
                type="button"
                disabled={!slideActual?.fondo?.src}
                title={
                  slideActual && CON_FOTO.includes(slideActual.kind)
                    ? `Una tarjeta de «${slideActual.kind}» lleva foto por diseño: no se puede quitar, solo cambiar.`
                    : undefined
                }
                onClick={() => setMd((prev) => removeBlockImageAt(prev, bloqueDe(actual), 0))}
                style={{
                  ...toolbarBtn, padding: '7px 9px',
                  opacity: slideActual?.fondo?.src ? 1 : 0.45,
                  cursor: slideActual?.fondo?.src ? 'pointer' : 'not-allowed',
                }}
              >
                Quitar foto
              </button>
            </div>

            {/* Exposición: solo baja. El velo del layout es lo que
                garantiza que el texto se lea encima de cualquier foto, así
                que subirlo por encima de ahí sería poder publicar algo
                ilegible. */}
            <p
              style={{
                font: `400 10px/1 ${MONO}`, color: colors.ash,
                margin: '14px 0 8px', display: 'flex', justifyContent: 'space-between',
              }}
            >
              <span>Exposición</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {conFotoActual ? `${exposicionActual} %` : '—'}
              </span>
            </p>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={exposicionActual}
              disabled={!conFotoActual}
              aria-label="Exposición de la foto"
              onChange={(e) => {
                const v = Number(e.target.value);
                setMd((prev) =>
                  /* 100 es el valor normal: en vez de escribirlo, se quita
                     la línea. Un markdown lleno de metadatos que no hacen
                     nada es más difícil de leer. */
                  setMeta(prev, bloqueDe(actual), 'exposicion', v >= 100 ? null : String(v)),
                );
              }}
              style={{ width: '100%', accentColor: colors.dark, opacity: conFotoActual ? 1 : 0.4 }}
            />
          </div>

          <Paleta
            actual={slideActual && !CON_FOTO.includes(slideActual.kind) && !slideActual.fondo?.src
              ? (slideActual.theme === 'dark' ? 'dark' : (slideActual.bg ?? 'warm-light'))
              : undefined}
            deshabilitado={paletaApagada}
            onElegir={(f) => {
              if (!slideActual) return;
              setMd((prev) => setBlockBackground(prev, bloqueDe(actual), slideActual.kind, f.token));
            }}
          />
        </section>

        {/* ── Columna de las tarjetas ── */}
        <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Fondo blanco, y no el crema del editor.

              El crema ES uno de los rellenos de tarjeta (Warm Light), así
              que una tarjeta clara desaparecía dentro de él. Cualquier
              neutro de marca que se elija aquí choca con alguno de los
              cuatro rellenos claros: el color solo no basta.

              Lo que separa de verdad es el FILETE de cada tarjeta, que la
              hace legible sobre cualquier fondo. Va en el contenedor y no
              en el lienzo, así que no entra en el PNG. */}
          <div
            ref={vista}
            style={{
              flex: 1, overflow: 'auto', padding: 24,
              display: 'flex', justifyContent: 'center', background: colors.white,
            }}
          >
            <div className="ix-social">
              {deck.slides.map((slide, i) => {
                const conFoto = CON_FOTO.includes(slide.kind);
                return (
                  <div
                    key={i}
                    style={{ marginBottom: 20 }}
                    onMouseEnter={() => setEncima(i)}
                    onMouseLeave={() => setEncima((v) => (v === i ? null : v))}
                  >
                    <div
                      ref={(el) => {
                        nodos.current[i] = el?.querySelector<HTMLDivElement>('.frame') ?? null;
                      }}
                      onClick={(e) => alClicar(e, i)}
                      style={{
                        position: 'relative',
                        /* Filete siempre, para que la tarjeta se lea sobre el
                           fondo sea cual sea su relleno. Es sombra y no borde:
                           no ocupa sitio y no se confunde con el diseño. */
                        boxShadow: `0 0 0 1px ${colors.warmDark}`,
                        outline: i === actual ? `2px solid ${colors.dark}` : '2px solid transparent',
                        outlineOffset: 4,
                        cursor: 'pointer',
                        width: 'fit-content',
                      }}
                    >
                      <SocialCard slide={slide} canvas={canvas} scale={escala} />

                      {/* El clic sobre la foto ya funciona, pero nadie lo
                          adivina. El rótulo aparece al pasar por encima: dice
                          que se puede, sin ensuciar la vista el resto del
                          tiempo. */}
                      {encima === i && (
                        <span style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActual(i);
                              setRanura({ bloque: bloqueDe(i), pos: 0 });
                            }}
                            style={{ ...toolbarBtn, padding: '6px 9px' }}
                          >
                            {conFoto || slide.fondo?.src ? 'Cambiar foto' : 'Foto de fondo'}
                          </button>
                          {/* Quitar solo se ofrece cuando la foto es de
                              fondo. En los layouts que la llevan de serie
                              no tiene sentido: una portada sin foto no es
                              una portada. */}
                          {slide.fondo?.src && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActual(i);
                                setMd((prev) => removeBlockImageAt(prev, bloqueDe(i), 0));
                              }}
                              style={{ ...toolbarBtn, padding: '6px 9px' }}
                            >
                              Quitar foto
                            </button>
                          )}
                        </span>
                      )}
                      {/* El retrato es la SEGUNDA imagen del bloque, así que
                          solo tiene sentido ofrecerlo cuando ya hay una
                          primera. Sin foto de fondo, este botón cambiaría el
                          fondo creyendo cambiar el retrato. */}
                      {slide.kind === 'cierre' &&
                        encima === i &&
                        countBlockImages(md, bloqueDe(i)) > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActual(i);
                            setRanura({ bloque: bloqueDe(i), pos: 1 });
                          }}
                          style={{
                            position: 'absolute', bottom: 10, right: 10, zIndex: 10,
                            ...toolbarBtn, padding: '6px 9px',
                          }}
                        >
                          Cambiar retrato
                        </button>
                        )}
                    </div>

                    <p style={{ font: `400 10px/1 ${MONO}`, color: colors.ash, margin: '8px 0 0', letterSpacing: '.06em' }}>
                      {String(i + 1).padStart(2, '0')} · {slide.kind}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <footer style={{ borderTop: `1px solid ${colors.warmDark}`, padding: '10px 20px', background: colors.white, font: `400 11px/1 ${MONO}`, color: colors.ash }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ whiteSpace: 'nowrap' }}>
                {total} tarjeta{total === 1 ? '' : 's'} · lienzo {spec.w}×{spec.h} · se exporta a{' '}
                {spec.w * 2}×{spec.h * 2}
              </span>
              {avisos.length > 0 && (
                <span
                  style={{
                    color: colors.bordeaux, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  title={avisos.join('\n')}
                >
                  · {avisos[0]}
                  {avisos.length > 1 && ` (+${avisos.length - 1})`}
                </span>
              )}
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => cambiarZoom(zoom - 0.1)}
                  aria-label="Ver más pequeño"
                  style={{ ...toolbarBtn, padding: '5px 9px' }}
                >
                  −
                </button>
                {/* Se enseña la escala REAL sobre el lienzo, no el zoom: es el
                    número que dice de verdad a qué tamaño estás mirando. */}
                <span style={{ minWidth: 42, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(escala * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => cambiarZoom(zoom + 0.1)}
                  aria-label="Ver más grande"
                  style={{ ...toolbarBtn, padding: '5px 9px' }}
                >
                  +
                </button>
              </span>
            </span>
          </footer>
        </section>
      </div>

      {eligiendoLogo && (
        <ImageGallery
          onClose={() => setEligiendoLogo(false)}
          onSelect={(url) => {
            setMd((prev) => setMeta(prev, 0, 'logo', url));
            setEligiendoLogo(false);
          }}
        />
      )}

      {ranura && (
        <ImageGallery
          onClose={() => setRanura(null)}
          onSelect={(url) => {
            setMd((prev) => {
              /* Nunca se salta un hueco: si se pide la segunda imagen de un
                 bloque que solo tiene una, la nueva va a la segunda
                 posición, no a la tercera. Sin esto se colaban dos imágenes
                 idénticas y el fondo acababa siendo el retrato. */
              const pos = Math.min(ranura.pos, countBlockImages(prev, ranura.bloque));
              return setBlockImageAt(prev, ranura.bloque, pos, url);
            });
            setRanura(null);
          }}
        />
      )}
    </div>
  );
}
