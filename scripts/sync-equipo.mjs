#!/usr/bin/env node
/* Trae las fotos del equipo y regenera el registro.
   ─────────────────────────────────────────────────────────────────────────
   LA FUENTE DE VERDAD DEL EQUIPO ES `interactius-web`, NO ESTE REPO.

   Allí viven `lib/data/team.ts` y `public/identidad/fotos-team/team.md`, y
   allí se da de alta a quien entra. Aquí hacen falta las fotos porque el
   Social Maker firma la tarjeta de cierre con el retrato de quien escribe,
   y porque el PNG se genera desde el DOM: una imagen de otro dominio
   contamina el lienzo y la exportación se cae.

   Copiar datos entre repositorios deriva. Por eso esto es un script y no un
   copia y pega: cuando alguien entre o salga del equipo, se vuelve a correr
   y punto.

       node scripts/sync-equipo.mjs [ruta del repo de la web]

   Por defecto busca en ../Interactius Web. Si no lo encuentra, lo dice y no
   toca nada: es preferible un registro viejo y avisado que uno a medias. */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = process.argv[2] ?? join(AQUI, '..', 'Interactius Web');
const ORIGEN = join(WEB, 'public/identidad/fotos-team');
const DESTINO = join(AQUI, 'public/identidad/fotos-team');
const REGISTRO = join(AQUI, 'lib/social/equipo.ts');

if (!existsSync(join(ORIGEN, 'team.md'))) {
  console.error(`No encuentro el equipo en ${ORIGEN}`);
  console.error('Pasa la ruta del repo de la web como argumento. No se ha tocado nada.');
  process.exit(1);
}

/* `team.md` es la especificación legible: `Nombre Apellido - Rol - Archivo.webp` */
const filas = readFileSync(join(ORIGEN, 'team.md'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const p = l.split(' - ').map((x) => x.trim());
    if (p.length !== 3) throw new Error(`Línea que no entiendo en team.md: ${l}`);
    return { nombre: p[0], rol: p[1], archivo: p[2] };
  });

mkdirSync(DESTINO, { recursive: true });
let copiadas = 0;
for (const f of filas) {
  const de = join(ORIGEN, f.archivo);
  if (!existsSync(de)) throw new Error(`team.md nombra ${f.archivo} y el archivo no está`);
  copyFileSync(de, join(DESTINO, f.archivo));
  copiadas++;
}

/* Las que sobran se avisan pero no se borran: pueden ser de alguien que
   acaba de salir y cuya firma sigue en una pieza ya publicada. */
const sobran = readdirSync(DESTINO)
  .filter((f) => f.endsWith('.webp'))
  .filter((f) => !filas.some((x) => x.archivo === f));

const hoy = new Date().toISOString().slice(0, 10);
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const ancho = Math.max(...filas.map((f) => f.nombre.length));

writeFileSync(
  REGISTRO,
  `/* GENERADO — no editar a mano.
   Lo escribe \`scripts/sync-equipo.mjs\` desde
   \`interactius-web/public/identidad/fotos-team/team.md\`, que es la fuente
   de verdad del equipo. Para actualizarlo:

       node scripts/sync-equipo.mjs

   Última sincronización: ${hoy} · ${filas.length} personas. */

export type Persona = { nombre: string; rol: string; foto: string };

export const EQUIPO: readonly Persona[] = [
${filas
  .map(
    (f) =>
      `  { nombre: '${esc(f.nombre)}',${' '.repeat(ancho - f.nombre.length)} rol: '${esc(f.rol)}', foto: '/identidad/fotos-team/${esc(f.archivo)}' },`,
  )
  .join('\n')}
];
`,
);

console.log(`${copiadas} fotos copiadas · registro con ${filas.length} personas`);
if (sobran.length) console.log(`Sobran (no se borran): ${sobran.join(', ')}`);
