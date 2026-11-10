import { toBlob } from 'html-to-image';
import { zipSync, strToU8 } from 'fflate';
import { CANVASES, EXPORT_SCALE, type CanvasId } from './types.ts';

/* Exportación a PNG.
   ─────────────────────────────────────────────────────────────────────────
   SE EXPORTA DESDE EL DOM, A PROPÓSITO. No se vuelve a dibujar la tarjeta
   en el servidor.

   El motivo está escrito en el CLAUDE.md del repo: la portada del deck ya
   tuvo que redibujarse a mano para la imagen de previsualización, porque
   satori no sabe ejecutar nuestro React ni nuestro CSS. Eso creó una
   **segunda fuente del diseño** que hay que mantener en paralelo y que
   deriva en cuanto alguien toca una y no la otra. Repetir esa jugada con
   nueve layouts serían nueve derivas.

   Exportando el nodo que ya está pintado, el PNG y la vista previa no
   pueden diferir: son el mismo árbol.

   El lienzo se pinta a tamaño real (1080 de ancho) y el multiplicador lo
   aplica `pixelRatio`, así que el resultado sale a 2160 — exactamente el
   tamaño al que Interactius ya exporta sus carruseles. */

export class ExportError extends Error {}

/** Nombre de archivo seguro y legible: `comercio-agentico-03.png`. */
export function fileName(base: string, index: number, total: number): string {
  const slug =
    base
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'social';
  const width = String(total).length;
  return `${slug}-${String(index + 1).padStart(Math.max(2, width), '0')}.png`;
}

async function nodeToPng(node: HTMLElement, canvas: CanvasId): Promise<Blob> {
  const spec = CANVASES[canvas];
  const blob = await toBlob(node, {
    width: spec.w,
    height: spec.h,
    pixelRatio: EXPORT_SCALE,
    /* El lienzo se mide en px propios; cualquier factor de visualización que
       traiga la vista previa se anula aquí para que el PNG no herede el zoom. */
    style: { transform: 'none', transformOrigin: 'top left' },
    /* `cacheBust` evita que una foto ya cacheada vuelva sin cabeceras CORS y
       deje la tarjeta en blanco. */
    cacheBust: true,
  });
  if (!blob) throw new ExportError('El navegador no ha devuelto la imagen.');
  return blob;
}

/** Descarga una tarjeta suelta. */
export async function exportCard(
  node: HTMLElement,
  canvas: CanvasId,
  name: string,
): Promise<void> {
  const blob = await nodeToPng(node, canvas);
  download(blob, name);
}

/* Descarga el carrusel entero en un .zip.

   En zip y no en descargas sueltas porque un carrusel son siete u ocho
   archivos y los navegadores bloquean las descargas múltiples seguidas; y
   porque dentro del zip van numerados, que es lo que fija el orden al
   subirlos. `fflate` ya estaba en el proyecto. */
export async function exportAll(
  nodes: HTMLElement[],
  canvas: CanvasId,
  base: string,
): Promise<void> {
  if (!nodes.length) throw new ExportError('No hay ninguna tarjeta que exportar.');
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < nodes.length; i++) {
    const blob = await nodeToPng(nodes[i], canvas);
    files[fileName(base, i, nodes.length)] = new Uint8Array(await blob.arrayBuffer());
  }
  /* Una nota dentro del zip con el tamaño real, para quien lo reciba y no
     haya estado en esta conversación. */
  const spec = CANVASES[canvas];
  files['LEEME.txt'] = strToU8(
    `${base}\n${nodes.length} imagen(es) · ${spec.w * EXPORT_SCALE}×${spec.h * EXPORT_SCALE} px (${spec.ratio})\n` +
      `Generado con el Social Maker de Interactius.\n`,
  );
  const zip = zipSync(files, { level: 6 });
  /* `slice()` sobre el buffer: fflate puede devolver una vista de un buffer
     mayor, y pasarla tal cual al Blob metería bytes de más. */
  download(
    new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
    `${fileName(base, 0, 1).replace(/-\d+\.png$/, '')}.zip`,
  );
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* El objeto se libera en el siguiente tick: revocarlo antes aborta la
     descarga en Safari. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
