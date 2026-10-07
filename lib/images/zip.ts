/* IMG_r · entrega 3 — «Descargar» de la barra de selección (G11): un ZIP montado en el navegador.

   Los originales ya son públicos, así que no hace falta servidor: una función de Netlify no puede devolver más
   de unos 6 MB. Se bajan uno a uno y van al ZIP sin volver a comprimir (`ZipPassThrough`), porque JPEG, PNG y
   WebP ya lo están. Los topes de 50 imágenes y 100 MB (lib/images/bulk.ts) acotan la memoria de la pestaña.

   Sin 'use client' ni React: el montaje se prueba en node con un `fetch` falso. */

import { Zip, ZipPassThrough } from 'fflate';

/* Los bytes de un fichero, con un reintento si la red o Storage fallan. null si falla las dos veces. */
export async function fetchBytes(url: string, fetchImpl: typeof fetch = fetch): Promise<Uint8Array | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(url, { cache: 'no-store' });
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
    } catch {
      // Error de red: se reintenta una vez.
    }
  }
  return null;
}

/* Los trozos del ZIP con los ficheros que se han podido bajar, y cuántos no. fflate marca los nombres como
   UTF-8, así que las tildes llegan bien. */
export async function zipParts(
  files: readonly { url: string; name: string }[],
  get: (url: string) => Promise<Uint8Array | null>,
): Promise<{ parts: Uint8Array[]; added: number; failed: number }> {
  const parts: Uint8Array[] = [];
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const finished = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const zip = new Zip((err, chunk, final) => {
    if (err) {
      reject(err);
      return;
    }
    parts.push(chunk);
    if (final) resolve();
  });

  let added = 0;
  let failed = 0;
  for (const f of files) {
    const data = await get(f.url);
    if (!data) {
      failed++;
      continue;
    }
    const entry = new ZipPassThrough(f.name);
    zip.add(entry);
    entry.push(data, true);
    added++;
  }
  zip.end();
  await finished;
  return { parts, added, failed };
}

/* Baja los ficheros, monta el ZIP y lo guarda con `zipFile` de nombre. Si no se pudo bajar ninguno, no guarda
   nada. Devuelve cuántos fallaron, para el aviso final. */
export async function downloadZip(files: readonly { url: string; name: string }[], zipFile: string): Promise<{ failed: number }> {
  const { parts, added, failed } = await zipParts(files, (url) => fetchBytes(url));
  if (added) {
    const href = URL.createObjectURL(new Blob(parts as BlobPart[], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = zipFile;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // El navegador ya tiene la descarga; la URL se libera después, por si tarda en arrancar.
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
  }
  return { failed };
}
