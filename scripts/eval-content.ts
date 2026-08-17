/* Audita el copy real del proyecto contra las reglas duras de lib/tokens.ts.
 *
 *   node --experimental-strip-types scripts/eval-content.ts
 *
 * Este fichero llevaba tiempo documentado en la cabecera de `lib/eval.ts` como uno de sus
 * consumidores — "scripts/eval-content.ts (CI / manual self-validation)" — y NO EXISTÍA. Quien
 * leyera el motor daba por hecho que había una red automática que no estaba: ningún test tocaba el
 * copy, y `GET /api/eval/manual` está detrás del gate de sesión, no corre en CI y no mira
 * `content/`. Que sea justo en `content/forms/` donde estaban las dos únicas infracciones duras
 * reales del sitio (dos `¡Gracias!` publicados para un cliente) dice bastante.
 *
 * Diferencias deliberadas con /api/eval/manual:
 *
 *  1. Cubre TAMBIÉN `content/forms/*.md`, que es lo que se sirve a clientes.
 *  2. Las exclusiones son por clave exacta, no por prefijo. El endpoint excluye `tonoMarca.red`,
 *     que barre de golpe los `red*Word` (citas legítimas: el manual nombra la palabra para
 *     prohibirla) y los `red*Rule` (prosa normal, donde la palabra NO debería aparecer). Aquí solo
 *     se perdonan las citas.
 *  3. Separa reglas duras de blandas. Vocabulario prohibido, exclamación y elipsis fallan el
 *     proceso. La longitud de frase se informa y no bloquea, que es como `hardFailFor` la trata en
 *     `lib/eval.ts` — y como debe ser, porque hoy el 29 % de la prosa del manual se sale del rango
 *     y arreglarlo es una tarea de redacción, no de código.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { evalText, type EvalViolation } from '../lib/eval.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Claves que CITAN una palabra prohibida porque su función es enseñarla. Exactas, no prefijos:
   `tonoMarca.red1Word` es una cita; `tonoMarca.red1Rule` es prosa y sí debe cumplir la norma. */
const QUOTES_FORBIDDEN = new Set([
  'tonoMarca.red1Word', 'tonoMarca.red2Word', 'tonoMarca.red3Word',
  'tonoMarca.red4Word', 'tonoMarca.red5Word', 'tonoMarca.red6Word',
  'tonoMarca.redHeadWord', 'tonoMarca.redTitle', 'tonoMarca.redBody',
  /* punc1 y punc2 son las reglas de puntuación enunciándose: para prohibir la exclamación hay que
     escribirla — «Queda estrictamente prohibido el uso de signos de exclamación (¡ !)». Es la
     misma categoría que los red*Word. */
  'tonoMarca.punc1', 'tonoMarca.punc2',
  'tonoMarca.puncTitle', 'tonoMarca.puncBody',
  'tonoMarca.copyPrompt', 'universoVisual.copyPrompt',
]);

/* Baseline de decisiones pendientes. NO es una lista de perdones: es la deuda que existe hoy,
   escrita para que no crezca. Un incumplimiento nuevo en cualquier otro sitio sigue fallando.
   Las tres entradas son decisiones de norma, no de código, y están en audit/INFORME.md §4. */
const PENDIENTE_DECISION = new Map<string, string>([
  ['messages:tonoMarca.red1Rule',
   'La columna de criterio usa «solución», que la fila de dos más abajo prohíbe. O se reescribe el criterio, o se afina la entrada de lib/tokens.ts. Decide Alberto.'],
  ['messages:tonoMarca.red3Rule',
   'Igual con «impacto». Es además palabra corriente del castellano: la pregunta de fondo es si la entrada de tokens debería cazar solo los usos vacíos.'],
  ['content/forms/calidad-proyecto.md:53',
   'Elipsis con función sintáctica: la frase la completa la respuesta («el resultado ha quedado…»). O se reescribe, o las etiquetas de opción se declaran excepción EN lib/tokens.ts.'],
  ['content/forms/massimo-dutti.md:38',
   '«de mayor a menor impacto» — uso ordinario, no relleno de marketing. Mismo fondo que red3Rule.'],
]);

/* Claves de frontmatter que son identificadores de máquina, no copy: no se leen, no se pintan y
   no tiene sentido auditarlas. `name: personas_impacto` disparaba la lista roja por el nombre de
   un campo de formulario. */
const MACHINE_KEYS = new Set([
  'id', 'name', 'slug', 'accent', 'status', 'client', 'logo', 'background',
  'version', 'type', 'theme', 'redirect', 'webhook',
]);

/** Claves cuyo valor no es prosa: etiquetas, botones, specs técnicas. Solo eximen de LONGITUD. */
const NOT_PROSE = /^(menu\.|chrome\.|ui\.|meta\.|prompts\.|.*\.(label|title|cta|hint|placeholder|alt)$)/;

type Finding = { source: string; key: string; rule: string; detail: string };

function flatten(obj: unknown, prefix = ''): [string, string][] {
  const out: [string, string][] = [];
  if (typeof obj === 'string') return [[prefix, obj]];
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      out.push(...flatten(v, prefix ? `${prefix}.${k}` : k));
    }
  }
  return out;
}

/* Las dos reglas de puntuación comparten un solo miembro de la unión, así que descartarlas una a
   una no estrecha el tipo. Se comprueban en positivo las de longitud, que sí son su propio
   miembro, y lo que queda es puntuación. */
function describe(v: EvalViolation): string {
  if (v.rule === 'forbidden') return `«${v.match}» (raíz ${v.root})`;
  if (v.rule === 'length:under_min' || v.rule === 'length:over_max') {
    return `frase ${v.sentence}: ${v.count} palabras (límite ${v.limit})`;
  }
  return v.rule === 'punctuation:exclamation' ? 'signo de exclamación' : 'puntos suspensivos';
}

const hard: Finding[] = [];
const soft: Finding[] = [];
const pendientes: Finding[] = [];

function check(source: string, key: string, text: string, isProse: boolean, baselineId?: string) {
  if (!text.trim()) return;
  for (const v of evalText(text).violations) {
    const isLength = v.rule === 'length:under_min' || v.rule === 'length:over_max';
    if (isLength) {
      if (isProse) soft.push({ source, key, rule: v.rule, detail: describe(v) });
      continue;
    }
    if (QUOTES_FORBIDDEN.has(key)) continue; // el manual nombra la palabra para prohibirla
    const f = { source, key, rule: v.rule, detail: describe(v) };
    if (baselineId && PENDIENTE_DECISION.has(baselineId)) pendientes.push(f);
    else hard.push(f);
  }
}

// ── 1. Los tres ficheros de mensajes ─────────────────────────────────────────
for (const locale of ['es', 'en', 'ca']) {
  const file = join(ROOT, 'messages', `${locale}.json`);
  const json: unknown = JSON.parse(readFileSync(file, 'utf8'));
  for (const [key, value] of flatten(json)) {
    // El baseline es por clave, no por idioma: la misma frase traducida es la misma decisión.
    check(`messages/${locale}.json`, key, value, !NOT_PROSE.test(key), `messages:${key}`);
  }
}

// ── 2. Los formularios, que es lo que ve un cliente ──────────────────────────
const formsDir = join(ROOT, 'content', 'forms');
for (const name of readdirSync(formsDir).filter((f) => f.endsWith('.md'))) {
  const raw = readFileSync(join(formsDir, name), 'utf8');
  /* El frontmatter y el cuerpo se auditan igual: `success_title: ¡Gracias!` vivía en el
     frontmatter, y es lo último que un cliente ve de la marca. */
  for (const [i, line] of raw.split('\n').entries()) {
    const m = /^([a-z_]+):\s*(.+)$/.exec(line.trim());
    if (m && MACHINE_KEYS.has(m[1])) continue; // identificador, no copy
    const text = m ? m[2] : line;
    check(`content/forms/${name}`, `L${i + 1}`, text, false, `content/forms/${name}:${i + 1}`);
  }
}

// ── Informe ──────────────────────────────────────────────────────────────────
const pad = (s: string, n: number) => s.padEnd(n);

if (soft.length) {
  console.log(`\n${soft.length} avisos de longitud de frase (regla blanda, no bloquea):`);
  for (const f of soft.slice(0, 12)) {
    console.log(`  ${pad(f.source, 22)} ${pad(f.key, 34)} ${f.detail}`);
  }
  if (soft.length > 12) console.log(`  … y ${soft.length - 12} más`);
}

if (pendientes.length) {
  console.log(`\n${pendientes.length} incumplimientos CONOCIDOS, pendientes de decisión de marca:`);
  const vistos = new Set<string>();
  for (const f of pendientes) {
    const id = f.source.startsWith('messages') ? `messages:${f.key}` : `${f.source}:${f.key.slice(1)}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    console.log(`  ${pad(f.source, 26)} ${pad(f.key, 22)} ${f.detail}`);
    console.log(`      → ${PENDIENTE_DECISION.get(id) ?? ''}`);
  }
  console.log('  Ver audit/INFORME.md §4. No bloquean; uno nuevo sí lo haría.');
}

if (hard.length) {
  console.error(`\n✖ ${hard.length} incumplimientos de reglas DURAS de lib/tokens.ts:\n`);
  for (const f of hard) {
    console.error(`  ${pad(f.source, 26)} ${pad(f.key, 34)} ${pad(f.rule, 26)} ${f.detail}`);
  }
  console.error('\nSon reglas no negociables: vocabulario prohibido, exclamación y elipsis.');
  process.exit(1);
}

console.log(
  pendientes.length
    ? `\n✔ Sin incumplimientos nuevos. Quedan ${PENDIENTE_DECISION.size} pendientes de decisión (arriba).`
    : `\n✔ Copy conforme. Sin vocabulario prohibido, sin exclamaciones y sin elipsis.`,
);
