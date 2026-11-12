'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compileSocial } from '@/lib/social/compile';
import { CANVASES, EXPORT_SCALE, type CanvasId } from '@/lib/social/types';
import { LAYOUTS } from '@/lib/social/catalog';
import { TEMPLATES, templateById, type TemplateId } from '@/lib/social/templates';
import { exportAll, exportCard, fileName } from '@/lib/social/exportPng';
import { colors, btn, toolbarBtn, seg, segOn } from '@/components/deck/studio/ui';
import type { SessionUser } from '@/lib/auth/sessionUser';
import { SocialToolbar } from './studio/SocialToolbar';
import { ImageGallery } from '@/components/deck/studio/ImageGallery';
import { AiEditModal } from '@/components/images/AiEditModal';
import { ToastProvider } from '@/components/ui/Toast';
import { buscarFoto, type FotoDelBanco } from '@/lib/social/estiloIA';
import { uploadLogo } from '@/lib/storage/logos';
import { publicLogoUrl } from '@/lib/decks/publicApi';
import { splitSourceBlocks } from '@/lib/deck/source';
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
const CON_IMAGEN: readonly string[] = ['portada', 'imagen', 'cierre'];

/* Los tres paneles de edición, en una fila de pestañas. Cerrados de
   salida: el sitio es del texto, que es donde se trabaja. */
type PanelId = 'slide' | 'imagen' | 'fondo';
const PESTANAS: { id: PanelId; label: string }[] = [
  { id: 'slide', label: 'Añadir slide' },
  { id: 'imagen', label: 'Modificar imagen' },
  { id: 'fondo', label: 'Cambiar fondo' },
];

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* El editor: markdown a la izquierda, tarjetas a la derecha.
   Misma mecánica que el Deck Maker a propósito — quien sepa usar uno sabe
   usar el otro. El cromo reutiliza `components/deck/studio/ui.ts`, así que
   los dos editores no pueden separarse visualmente por descuido. */

export function SocialStudio({ user }: { user?: SessionUser } = {}) {
  /* Al abrir, siempre el carrusel de Miradas. La plantilla va en estado y
     no en `defaultValue`: así el desplegable no puede quedarse enseñando
     una cosa mientras el texto es otra. */
  const [plantilla, setPlantilla] = useState<TemplateId>('miradas');
  const [md, setMd] = useState(() => templateById('miradas').md);
  const [canvas, setCanvas] = useState<CanvasId>('carrusel');
  const [titulo, setTitulo] = useState('Carrusel sin título');
  const [actual, setActual] = useState(0);
  const [exportando, setExportando] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);
  /* Qué imagen se está cambiando: el bloque del markdown y, dentro de él,
     cuál de sus imágenes. El cierre tiene dos: el fondo y el retrato. */
  const [ranura, setRanura] = useState<{ bloque: number; pos: number } | null>(null);
  /* La foto del banco sobre la que se va a aplicar el estilo con IA. */
  const [estilo, setEstilo] = useState<FotoDelBanco | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const inputLogo = useRef<HTMLInputElement>(null);
  /* Qué panel está abierto, o ninguno. Se recuerda en el navegador: es una
     preferencia de pantalla, como el zoom, no algo de la pieza. */
  const [panel, setPanel] = useState<PanelId | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem('socialmakr:panel');
      if (v && PESTANAS.some((t) => t.id === v)) setPanel(v as PanelId);
    } catch {
      /* Modo privado o almacenamiento bloqueado: se queda cerrado. */
    }
  }, []);
  const cambiarPanel = useCallback((id: PanelId | null) => {
    setPanel(id);
    try {
      if (id) localStorage.setItem('socialmakr:panel', id);
      else localStorage.removeItem('socialmakr:panel');
    } catch {
      /* Ídem: se pierde al cerrar, la sesión funciona igual. */
    }
  }, []);
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
          ? [`Slide ${i + 1}: «${s.author}» no está en el equipo, así que firma el isotipo.`]
          : [],
      ),
    [deck],
  );

  /* Los nodos reales de cada tarjeta, para exportarlos. Se guardan por
     índice: la exportación tiene que salir del DOM que ya está pintado y no
     de una segunda versión del diseño. */
  const textarea = useRef<HTMLTextAreaElement>(null);
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
  /* Lleva el cursor del editor al bloque de esa tarjeta y lo acerca a la
     vista. Igual que el Deck Maker (`jumpToSource` en DeckStudio): clicar
     una tarjeta es la forma natural de decir «quiero editar esta», y sin
     esto hay que buscarla a mano en un texto de cien líneas. */
  const irAlTexto = useCallback(
    (i: number) => {
      const ta = textarea.current;
      if (!ta) return;
      const b = splitSourceBlocks(md)[bloqueDe(i)];
      if (!b) return;
      ta.focus();
      ta.setSelectionRange(b.start, b.start);
      const ratio = md.length ? b.start / md.length : 0;
      ta.scrollTop = Math.max(0, ratio * ta.scrollHeight - ta.clientHeight / 3);
    },
    [md, bloqueDe],
  );

  const alClicar = useCallback(
    (e: React.MouseEvent, i: number) => {
      const yaEstaba = actual === i;
      setActual(i);
      irAlTexto(i);
      if (!yaEstaba) return;
      const t = e.target as HTMLElement;
      if (t.closest('.avatar')) setRanura({ bloque: bloqueDe(i), pos: 1 });
      else if (t.closest('.photo')) setRanura({ bloque: bloqueDe(i), pos: 0 });
    },
    [actual, bloqueDe, irAlTexto],
  );

  const slideActual = deck.slides[actual];
  /* Donde hay foto no hay relleno: el fondo es la imagen. */
  const paletaApagada = !slideActual
    ? 'Elige una slide para cambiarle el fondo.'
    : CON_IMAGEN.includes(slideActual.kind)
      ? `Una tarjeta de «${slideActual.kind}» lleva imagen a sangre: el fondo es la imagen. Haz clic sobre ella para cambiarla.`
      : slideActual.fondo?.src
        ? 'Esta slide tiene imagen de fondo. Quítala para volver a un color.'
        : undefined;

  /* La tarjeta tiene foto si el layout la lleva de serie o si alguien le
     ha puesto una de fondo. En los dos casos se puede bajar la exposición. */
  const conImagenActual = Boolean(
    slideActual && (CON_IMAGEN.includes(slideActual.kind) || slideActual.fondo?.src),
  );
  const exposicionActual = slideActual?.exposicion ?? 100;

  /* Por qué no se puede quitar la imagen, dicho en voz alta.

     Un botón apagado sin explicación deja a quien edita pensando que algo
     está roto. El motivo vive debajo del botón y no en un `title`, porque
     un tooltip solo lo encuentra quien ya sospecha que hay algo que
     encontrar. */
  const porQueNoSeQuita = !slideActual
    ? 'Elige una slide para poder quitarle la imagen.'
    : CON_IMAGEN.includes(slideActual.kind)
      ? `Una slide de «${slideActual.kind}» lleva imagen por diseño: se puede cambiar, pero no quitar. Una portada sin imagen no es una portada.`
      : !slideActual.fondo?.src
        ? 'Esta slide no tiene imagen de fondo, así que no hay nada que quitar.'
        : undefined;
  const urlImagenActual =
    slideActual?.fondo?.src ??
    (slideActual && 'image' in slideActual ? slideActual.image?.src : undefined);

  /* «Aplicar estilo Interactius»: busca la foto en el banco y abre el mismo
     modal de IMG_r. La directiva no se duplica aquí; ver lib/social/estiloIA.ts. */
  const aplicarEstilo = useCallback(async () => {
    if (!urlImagenActual) return;
    setError(null);
    setBuscando(true);
    try {
      setEstilo(await buscarFoto(urlImagenActual));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido abrir el editor de estilo.');
    } finally {
      setBuscando(false);
    }
  }, [urlImagenActual]);

  const insertar = (skeleton: string) => {
    setMd((prev) => `${prev.trimEnd()}\n\n---\n\n${skeleton}\n`);
    setActual(total);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.warmLight }}>
      {/* La barra es la del workspace, no una propia: ver SocialToolbar. */}
      <SocialToolbar titulo={titulo} onTitulo={setTitulo} user={user}>
        {/* Lienzo */}
        <div style={{ display: 'flex', gap: 0 }}>
          {/* El post va primero para que «Carrusel» quede pegado al
              desplegable de plantillas, que es lo que más se usa junto. */}
          {(['post', 'carrusel'] as CanvasId[]).map((id) => (
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
            setPlantilla(t.id);
            setMd(t.md);
            setActual(0);
          }}
          value={plantilla}
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
          <input
            ref={inputLogo}
            type="file"
            accept="image/svg+xml,image/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setError(null);
              setSubiendoLogo(true);
              try {
                const url = publicLogoUrl(await uploadLogo(file, 'social'));
                if (url) setMd((prev) => setMeta(prev, 0, 'logo', url));
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No se ha podido subir el logo.');
              } finally {
                setSubiendoLogo(false);
              }
            }}
          />
          <button
            type="button"
            style={toolbarBtn}
            disabled={subiendoLogo}
            onClick={() =>
              deck.logo?.src
                ? setMd((prev) => setMeta(prev, 0, 'logo', null))
                : inputLogo.current?.click()
            }
            title={
              deck.logo?.src
                ? 'Quitar el logo del cliente de toda la pieza'
                : 'Sube un SVG. Se pinta con la tinta de cada slide, así que da igual el color que traiga.'
            }
          >
            {subiendoLogo ? 'Subiendo…' : deck.logo?.src ? 'Quitar logo de cliente' : 'Logo de cliente'}
          </button>
          <button type="button" style={toolbarBtn} onClick={descargarUna} disabled={!!exportando}>
            PNG de esta
          </button>
          <button type="button" style={btn} onClick={descargarTodas} disabled={!!exportando}>
            Descargar {total} en .zip
          </button>
        </span>
      </SocialToolbar>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* ── Columna del texto ── */}
        <section style={{ width: '38%', minWidth: 340, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${colors.warmDark}` }}>
          <textarea
            ref={textarea}
            value={md}
            onChange={(e) => setMd(e.target.value)}
            spellCheck={false}
            aria-label="Texto de las slides, en markdown"
            style={{
              flex: 1, resize: 'none', padding: '20px', border: 'none', outline: 'none',
              font: `400 13px/1.7 ${MONO}`, color: colors.dark, background: colors.white,
              tabSize: 2,
            }}
          />
          {/* Los tres paneles de edición, en PESTAÑAS y cerrados de salida.

              Antes iban apilados y abiertos: unos 300 px que le comían el
              sitio al texto, que es donde de verdad se trabaja. Ahora la
              fila de pestañas ocupa unos 38 px, se abre la que haga falta y
              se cierra sola la anterior, así que el alto del bloque está
              acotado pase lo que pase.

              Cuál quedó abierta se recuerda en el navegador: es una
              preferencia de pantalla, como el zoom, no algo de la pieza. */}
          <div style={{ borderTop: `1px solid ${colors.warmDark}`, background: colors.warmLight }}>
            <div style={{ display: 'flex' }}>
              {PESTANAS.map((t) => {
                const activa = panel === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => cambiarPanel(activa ? null : t.id)}
                    aria-expanded={activa}
                    style={activa ? { ...seg, ...segOn } : seg}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {panel === 'slide' && (
              <div style={{ padding: 12, borderTop: `1px solid ${colors.warmDark}`, background: colors.warmLight }}>
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
            )}

            {panel === 'imagen' && (
              <div style={{ padding: 12, borderTop: `1px solid ${colors.warmDark}`, background: colors.warmLight }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={!slideActual}
                    onClick={() => slideActual && setRanura({ bloque: bloqueDe(actual), pos: 0 })}
                    style={{ ...toolbarBtn, padding: '7px 9px', opacity: slideActual ? 1 : 0.45 }}
                  >
                    {conImagenActual ? 'Cambiar imagen' : 'Añadir imagen'}
                  </button>

                  {/* Quitar solo vale para la foto de fondo. En los layouts
                      que la llevan de serie no tiene sentido: una portada
                      sin foto no es una portada. */}
                  <button
                    type="button"
                    disabled={Boolean(porQueNoSeQuita)}
                    onClick={() => setMd((prev) => removeBlockImageAt(prev, bloqueDe(actual), 0))}
                    style={{
                      ...toolbarBtn, padding: '7px 9px',
                      opacity: porQueNoSeQuita ? 0.45 : 1,
                      cursor: porQueNoSeQuita ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Quitar imagen
                  </button>

                  {/* El estilo de marca con IA. Es el motor de IMG_r y su
                      misma cuota; aquí solo se abre su modal. */}
                  <button
                    type="button"
                    disabled={!urlImagenActual || buscando}
                    onClick={() => void aplicarEstilo()}
                    title="Aplica la directiva de imagen de Interactius con IA. Gasta cuota de IMG_r."
                    style={{
                      ...toolbarBtn, padding: '7px 9px',
                      opacity: urlImagenActual ? 1 : 0.45,
                      cursor: urlImagenActual ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {buscando ? 'Abriendo…' : 'Estilo Interactius'}
                  </button>
                </div>

                {porQueNoSeQuita && (
                  <p style={{ font: `400 10px/1.5 ${MONO}`, color: colors.ash, margin: '10px 0 0' }}>
                    {porQueNoSeQuita}
                  </p>
                )}

                {/* Exposición: solo baja. El velo del layout es lo que
                    garantiza que el texto se lea encima de cualquier foto,
                    así que subirlo por encima de ahí sería poder publicar
                    algo ilegible. */}
                <p
                  style={{
                    font: `400 10px/1 ${MONO}`, color: colors.ash,
                    margin: '14px 0 8px', display: 'flex', justifyContent: 'space-between',
                  }}
                >
                  <span>Exposición</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {conImagenActual ? `${exposicionActual} %` : '—'}
                  </span>
                </p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={exposicionActual}
                  disabled={!conImagenActual}
                  aria-label="Exposición de la imagen"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMd((prev) =>
                      /* 100 es el valor normal: en vez de escribirlo, se
                         quita la línea. Un markdown lleno de metadatos que
                         no hacen nada es más difícil de leer. */
                      setMeta(prev, bloqueDe(actual), 'exposicion', v >= 100 ? null : String(v)),
                    );
                  }}
                  style={{ width: '100%', accentColor: colors.dark, opacity: conImagenActual ? 1 : 0.4 }}
                />
              </div>
            )}

            {panel === 'fondo' && (
              <Paleta
                actual={slideActual && !CON_IMAGEN.includes(slideActual.kind) && !slideActual.fondo?.src
                  ? (slideActual.theme === 'dark' ? 'dark' : (slideActual.bg ?? 'warm-light'))
                  : undefined}
                deshabilitado={paletaApagada}
                onElegir={(f) => {
                  if (!slideActual) return;
                  setMd((prev) => setBlockBackground(prev, bloqueDe(actual), slideActual.kind, f.token));
                }}
              />
            )}
          </div>

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
                const conImagen = CON_IMAGEN.includes(slide.kind);
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
                            {conImagen || slide.fondo?.src ? 'Cambiar imagen' : 'Imagen de fondo'}
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
                              Quitar imagen
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
                {total} slide{total === 1 ? '' : 's'} · lienzo {spec.w}×{spec.h}
                {/* El tamaño de exportación solo se dice cuando NO coincide con
                    el del lienzo. Hoy coinciden, así que repetirlo era ruido.
                    Condicional y no borrado: si algún día el factor vuelve a
                    ser otro, el dato reaparece solo. */}
                {EXPORT_SCALE !== 1 && (
                  <> · se exporta a {spec.w * EXPORT_SCALE}×{spec.h * EXPORT_SCALE}</>
                )}
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

      {estilo && (
        /* El modal de IMG_r pide su propio contexto de avisos. */
        <ToastProvider>
          <AiEditModal
            image={estilo.image}
            uses={estilo.uses}
            onClose={() => setEstilo(null)}
            onSaved={(row) => {
              /* La imagen editada puede ser otra fila (copia) o la misma
                 sobrescrita. En los dos casos basta con escribir su URL:
                 el markdown sigue siendo la fuente de verdad. */
              setMd((prev) => setBlockImageAt(prev, bloqueDe(actual), 0, row.url));
              setEstilo(null);
            }}
          />
        </ToastProvider>
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
