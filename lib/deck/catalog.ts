import type { Slide } from './types.ts';
import { themeFor } from './theme.ts';

/* Single source of truth for the available layouts. Drives:
   - LAYOUT_MAP (marker → kind) in classify.ts
   - the "Galería de layouts" popup (thumbnail + marker + name + slots)
   - the developer docs (docs/features/deck-layouts-sistema.md)
   Add a layout here and it shows up everywhere. */
export type LayoutCatalogEntry = {
  marker: string;        // the `[ly: marker]` token name
  kind: Slide['kind'];   // the compiled slide kind
  name: string;          // human label
  slots: string;         // what the content fills
  skeleton: string;      // ready-to-paste markdown block (see SKELETONS)
};

/* Placeholder image for the skeletons: a real brand asset, so a pasted block renders instead of
   404-ing. Swapped from the editor's image gallery with one click. */
const IMG = '![Imagen del universo visual](/universo/universo-01.jpg)';

/* Ready-to-paste markdown per layout: the marker plus dummy content that mirrors the layout's
   real structure, so the author sees which slots exist without opening the guide. Text is
   instructive ("Título de la sección") rather than plausible copy — it must be obvious that it
   needs replacing, and it must never read as real content if it survives into a client deck.

   The brand pages (manifiesto/equipo/clientes) are marker-only on purpose: their layouts fall
   back to the canonical brand copy when the block is EMPTY (all-or-nothing, see Manifesto.tsx),
   so dummy text here would silently replace the very content the author wants.

   No trailing `---`: the separator is a paste-time concern, added by the gallery on copy. */
const SKELETONS: Record<string, string> = {
  portada: `# Nombre de la propuesta

## Propuesta de colaboración - Mes Año

> cliente: Nombre del cliente

${IMG}`,

  enunciado: `ANTETÍTULO EN MAYÚSCULAS

## Titular grande que resume la idea`,

  texto: `ANTETÍTULO EN MAYÚSCULAS

Primer párrafo del cuerpo de texto.

- Punto de una lista, si hace falta.
- Otro punto de la lista.

Segundo párrafo, después de la lista.`,

  lista: `## Título de la diapositiva

- Primer punto de la lista.
- Segundo punto de la lista.
- Tercer punto de la lista.`,

  columnas: `## Título de la sección

### Primer subtítulo
Texto de la primera columna.

### Segundo subtítulo
Texto de la segunda columna.

### Tercer subtítulo
Texto de la tercera columna.`,

  'split-izq': `ANTETÍTULO EN MAYÚSCULAS

## Título junto a la imagen

Párrafo que acompaña a la imagen.

${IMG}`,

  'split-der': `ANTETÍTULO EN MAYÚSCULAS

## Título junto a la imagen

Párrafo que acompaña a la imagen.

${IMG}`,

  contexto: `CONTEXTO

Primer párrafo que describe el contexto del proyecto.

Segundo párrafo, si hace falta desarrollarlo más.`,

  reto: `EL RETO

## Enunciado del reto en una frase

${IMG}`,

  objetivos: `## Objetivos

- Primer objetivo.
- Segundo objetivo.
- Tercer objetivo.

${IMG}`,

  roadmap: `## Roadmap

Estimamos que la duración del proyecto será de 6 semanas.

### Nombre de la primera fase
Texto introductorio de la fase.
- Primera tarea.
- Segunda tarea.

### Nombre de la segunda fase
Texto introductorio de la fase.
- Primera tarea.
- Segunda tarea.`,

  gantt: `## Calendario

Esta es una estimación aproximada

semanas: 8
Primera fase: 1-2
Segunda fase: 3-5
Tercera fase: 6-8
hitos cliente: 2, 5, 8`,

  presupuesto: `## Presupuesto

- Primera partida: 1.000 €
- Segunda partida: 2.000 €
- Tercera partida: 3.000 €

### Condiciones
- Primera condición.
- Segunda condición.`,

  manifiesto: '',
  equipo: '',
  clientes: '',

  aceptacion: `## Aceptación de la propuesta

nombre: Nombre y apellidos
cargo: Cargo en la empresa
empresa: Nombre de la empresa
nif: NIF de la empresa
direccion: Dirección fiscal`,

  cierre: `## Gracias

www.interactius.com`,
};

const BASE: Omit<LayoutCatalogEntry, 'skeleton'>[] = [
  { marker: 'portada',     kind: 'cover',         name: 'Portada',         slots: 'título, subtítulo, cliente, imagen de fondo' },
  { marker: 'enunciado',   kind: 'statement',     name: 'Enunciado',       slots: 'antetítulo (MAYÚS) + título grande' },
  { marker: 'texto',       kind: 'paragraph',     name: 'Texto',           slots: 'antetítulo + párrafos y listas (-)' },
  { marker: 'lista',       kind: 'bullets',       name: 'Lista',           slots: 'título + viñetas' },
  { marker: 'columnas',    kind: 'columns',       name: 'Columnas',        slots: 'título + columnas (### subtítulo + cuerpo)' },
  { marker: 'split-izq',   kind: 'split',         name: 'Split · img izq.', slots: 'antetítulo, título, párrafos y listas (-), imagen (izquierda)' },
  { marker: 'split-der',   kind: 'split',         name: 'Split · img der.', slots: 'antetítulo, título, párrafos y listas (-), imagen (derecha)' },
  { marker: 'contexto',    kind: 'contexto',      name: 'Contexto',        slots: 'antetítulo (CONTEXTO) + párrafos y listas (-)' },
  { marker: 'reto',        kind: 'elreto',        name: 'El reto',         slots: 'antetítulo (EL RETO) + título + imagen' },
  { marker: 'objetivos',   kind: 'objetivos',     name: 'Objetivos',       slots: 'título + lista numerada + imagen' },
  { marker: 'roadmap',     kind: 'roadmapPhases', name: 'Roadmap · fases', slots: 'título, subtítulo, fases (### + tareas)' },
  { marker: 'gantt',       kind: 'gantt',         name: 'Gantt',           slots: 'líneas «clave: valor» (semanas/meses/días…, tramos con comas, hitos <etiqueta>)' },
  { marker: 'presupuesto', kind: 'budget',        name: 'Presupuesto',     slots: '## título, partidas (- Partida: importe), total (o «nototal»), ### Condiciones' },
  { marker: 'manifiesto',  kind: 'manifesto',     name: 'Manifiesto',      slots: 'título (con / énfasis /) + subtítulo (default de marca)' },
  { marker: 'equipo',      kind: 'team',          name: 'Equipo',          slots: 'texto libre (párrafos, listas, citas, subtítulos · **negrita**/énfasis) + imagen' },
  { marker: 'clientes',    kind: 'clients',       name: 'Clientes',        slots: 'etiquetas de categoría (- lista, traducibles) + imagen de logos (defaults de marca)' },
  { marker: 'aceptacion',  kind: 'acceptance',    name: 'Aceptación',      slots: 'título, firmante (nombre/cargo/…), aviso, CTA, firma' },
  { marker: 'cierre',      kind: 'closing',       name: 'Cierre',          slots: 'título + url' },
];

/* Each layout carries its own skeleton. `SKELETONS` is keyed by marker and checked against the
   table by catalog.test.ts, so adding a layout without a skeleton fails the suite. */
export const LAYOUT_CATALOG: LayoutCatalogEntry[] = BASE.map((e) => ({
  ...e,
  skeleton: SKELETONS[e.marker],
}));

/* marker → kind, derived so there is a single list to maintain. */
export const LAYOUT_MAP: Record<string, Slide['kind']> = Object.fromEntries(
  LAYOUT_CATALOG.map((c) => [c.marker, c.kind]),
);

/* The appearance token the snippet ships with. The background picker has no UI — the markdown IS
   the interface — so a pasted block states its own fill to make the knob discoverable: the author
   sees `{warm-light}` and swaps it for `{white}` or `{warm-dark}` without opening the guide.

   Los cuatro nombres canónicos son los de los tokens de marca, en inglés y en una sola familia:
   `warm-light` · `warm-dark` · `white` · `dark`. Los alias en castellano (`crema`, `arena`,
   `blanco`, `oscuro`) siguen funcionando en resolveAppearance() para no romper los decks ya
   escritos, pero no se emiten: mezclarlos era lo que hacía que la guía enseñara dos idiomas a la
   vez (`warm-light` junto a `blanco`).

   It is deliberately a NO-OP: it spells out the default this layout already has, derived from
   themeFor() so the two can't drift. The canonical dark heroes (portada/enunciado/cierre) get
   `{dark}` for the same reason — writing `{warm-light}` there would flip them light. */
function defaultAppearance(kind: Slide['kind']): string {
  return themeFor(kind, undefined) === 'dark' ? '{dark}' : '{warm-light}';
}

/* The exact text the gallery copies to the clipboard. The `---` goes AFTER the block: authors
   paste on the empty line below an existing slide's closing `---`, so the separator they still
   need is the one that closes the new slide. */
export function layoutSnippet(entry: LayoutCatalogEntry): string {
  const body = entry.skeleton ? `\n\n${entry.skeleton}` : '';
  return `[ly: ${entry.marker}] ${defaultAppearance(entry.kind)}${body}\n\n---\n`;
}
