import type { Background, ImageRef, Slide, Theme, Token } from './types.ts';

/* A `###`(+) heading with the body paragraphs and list items that follow it (until the next
   `###`). Drives columns, roadmap phases and the budget "Condiciones" section. */
export type Section = { heading: string; level: number; body: string[]; items: string[] };

/* Canonical, normalized view of ONE markdown block (one slide), produced once by parseBlock().
   Every token is captured here so nothing is silently dropped at the data layer; each layout
   then maps the roles it needs into its fixed design slots. Markdown semantics are uniform:
   `#`=title, `##`=subtitle, `###`=sections, `-`=list, `>`=quote, `![]()`=image,
   UPPERCASE line=eyebrow, `clave: valor`=meta. */
export type BlockModel = {
  tokens: Token[];                 // raw tokens (kept for structured sub-parsers like parseBudget)
  marker?: string;                 // [ly: …] name
  headings: { level: number; text: string }[];
  hasHeading: boolean;
  eyebrow?: string;                // first UPPERCASE line
  title: string;                   // primary heading (highest level present), theme suffix stripped
  subtitle?: string;               // next heading below the primary, before any ### section
  themeOverride?: Theme;           // {oscuro|dark} — from the [ly:] line or the heading suffix
  bg?: Background;                  // {blanco|warm-dark|warm-light} background fill (light slides)
  body: string[];                  // every paragraph, in order
  quotes: string[];                // every `>` quote, in order
  items?: string[];                // first list's items (undefined if no list)
  lists: string[][];               // every list, preserved as groups
  sections: Section[];             // every ### (+) heading block
  images: ImageRef[];              // every image, in order
  image?: ImageRef;                // first image
  meta: Record<string, string>;    // `clave: valor` lines (cliente, nombre, cargo, …)
  client?: string;                 // value of the first `> cliente: …` quote
  fences: { lang: string; body: string }[];
  fence?: { lang: string; body: string };  // first fence
  isFirst: boolean;
  isLast: boolean;
};

const find = <T extends Token['t']>(tokens: Token[], t: T) =>
  tokens.find((x) => x.t === t) as Extract<Token, { t: T }> | undefined;

/* Resolve an appearance modifier to a theme and/or background.
   CANÓNICOS (los que se emiten y se documentan), una sola familia, la de los tokens de marca:
     {warm-light} · {warm-dark} · {white} · {dark}
   El resto son ALIAS que se siguen aceptando para no romper decks ya escritos — no los emitas.
   Los tres rellenos claros conservan la tinta oscura; solo `dark` cambia de tema (y con él la
   tinta, ver deck.css → --ink*). Token desconocido → {}. */
export function resolveAppearance(tok?: string): { theme?: Theme; bg?: Background } {
  switch (tok?.trim().toLowerCase()) {
    case 'dark': case 'oscuro': return { theme: 'dark' };
    case 'warm-light': case 'light': case 'claro': case 'crema': return { theme: 'light', bg: 'warm-light' };
    case 'white': case 'blanco': return { theme: 'light', bg: 'white' };
    case 'warm-dark': case 'arena': return { theme: 'light', bg: 'warm-dark' };
    default: return {};
  }
}

/* Strip a trailing `{…}` appearance override off a heading. Leaves the text untouched if the token
   isn't a known modifier, so stray braces aren't eaten. */
export function overrideTheme(text: string): { clean: string; theme?: Theme; bg?: Background } {
  const m = text.match(/\s*\{([a-z-]+)\}\s*$/i);
  if (!m) return { clean: text };
  const app = resolveAppearance(m[1]);
  if (app.theme === undefined && app.bg === undefined) return { clean: text };
  return { clean: text.replace(m[0], '').trim(), ...app };
}

/* `clave: valor` lines (from paragraphs, quotes or list items) — used by acceptance/cover. */
export function kvLines(tokens: Token[]): Record<string, string> {
  const out: Record<string, string> = {};
  const lines: string[] = [];
  for (const t of tokens) {
    if (t.t === 'p' || t.t === 'quote') lines.push(t.text);
    if (t.t === 'ul') lines.push(...t.items);
  }
  for (const l of lines) {
    const m = l.match(/^([\p{L} ]+):\s*(.+)$/u);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

/* Group each `###`(+) heading with the paragraphs/lists that follow it (until the next ###). */
function extractSections(tokens: Token[]): Section[] {
  const sections: Section[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.t === 'h' && t.level >= 3) {
      const body: string[] = [];
      const items: string[] = [];
      for (let j = i + 1; j < tokens.length; j++) {
        const u = tokens[j];
        if (u.t === 'h' && u.level >= 3) break;
        if (u.t === 'p') body.push(u.text);
        if (u.t === 'ul') items.push(...u.items);
      }
      sections.push({ heading: t.text, level: t.level, body, items });
    }
  }
  return sections;
}

/* Parse one block's tokens into the canonical BlockModel. Single linear pass; captures
   everything. The heading rule is backward-compatible: the highest-level heading present is the
   title, the next-lower one (above section level) is the subtitle — so `#`→title and `##`→subtitle
   when both exist, but a lone `## Título` still acts as the title. */
export function parseBlock(tokens: Token[], position: number, total: number): BlockModel {
  const layoutTok = find(tokens, 'layout') as Extract<Token, { t: 'layout' }> | undefined;
  const marker = layoutTok?.name;
  const fromMarker = resolveAppearance(layoutTok?.mod);   // {} when the [ly:] line has no modifier
  const headings = tokens.filter((t): t is Extract<Token, { t: 'h' }> => t.t === 'h').map((h) => ({ level: h.level, text: h.text }));

  // Title = the FIRST heading (document order) — robust and backward-compatible: a stray
  // higher-level heading later in the block (e.g. a `# Subhead` inside a roadmap) never hijacks
  // the title. Subtitle = the next heading DEEPER than the title that appears before any `###`
  // section — so `# Título` + `## Subtítulo` reads as title+subtitle, while a lone `## Título`
  // still acts as the title.
  const primary = headings[0];
  const ov = overrideTheme(primary?.text ?? '');
  let subtitle: string | undefined;
  if (primary) {
    for (let i = 1; i < headings.length; i++) {
      const h = headings[i];
      if (h.level >= 3) break;        // ### and deeper are sections, never a subtitle
      if (h.level > primary.level) { subtitle = overrideTheme(h.text).clean; break; }
    }
  }

  const body = tokens.filter((t) => t.t === 'p').map((t) => (t as Extract<Token, { t: 'p' }>).text);
  const quotes = tokens.filter((t) => t.t === 'quote').map((t) => (t as Extract<Token, { t: 'quote' }>).text);
  const lists = tokens.filter((t) => t.t === 'ul').map((t) => (t as Extract<Token, { t: 'ul' }>).items);
  const images: ImageRef[] = tokens
    .filter((t) => t.t === 'image')
    .map((t) => ({ src: (t as Extract<Token, { t: 'image' }>).src, alt: (t as Extract<Token, { t: 'image' }>).alt }));
  const fences = tokens
    .filter((t) => t.t === 'fence')
    .map((t) => ({ lang: (t as Extract<Token, { t: 'fence' }>).lang, body: (t as Extract<Token, { t: 'fence' }>).body }));
  const caps = find(tokens, 'caps');
  const clientLine = quotes.map((q) => q.match(/^cliente:\s*(.+)$/i)).find(Boolean);

  return {
    tokens,
    marker,
    headings,
    hasHeading: headings.length > 0,
    eyebrow: caps?.text,
    title: ov.clean,
    subtitle,
    // The [ly:] line modifier wins over the heading suffix — it's explicit and works on the
    // marker-only brand pages too, which have no heading to carry a `{…}`.
    themeOverride: fromMarker.theme ?? ov.theme,
    bg: fromMarker.bg ?? ov.bg,
    body,
    quotes,
    items: lists[0],
    lists,
    sections: extractSections(tokens),
    images,
    image: images[0],
    meta: kvLines(tokens),
    client: clientLine?.[1]?.trim(),
    fences,
    fence: fences[0],
    isFirst: position === 0,
    isLast: position === total - 1,
  };
}

/* What each layout actually renders, so validateBlock can flag content it would silently drop.
   `body`: max paragraphs shown (Infinity = all; 'spec'/'url' = consumed specially). */
type Shows = { subtitle: boolean; eyebrow: boolean; image: number; body: number | 'spec' | 'url'; list: boolean; sections: boolean };
const SHOWS: Record<Slide['kind'], Shows> = {
  cover:         { subtitle: true,  eyebrow: true,  image: 1, body: 1,        list: false, sections: false },
  statement:     { subtitle: false, eyebrow: true,  image: 0, body: 0,        list: false, sections: false },
  paragraph:     { subtitle: false, eyebrow: true,  image: 0, body: Infinity, list: true,  sections: false },
  bullets:       { subtitle: false, eyebrow: false, image: 0, body: 0,        list: true,  sections: false },
  columns:       { subtitle: false, eyebrow: false, image: 0, body: 0,        list: false, sections: true },
  split:         { subtitle: false, eyebrow: true,  image: 1, body: Infinity, list: true,  sections: false },
  gantt:         { subtitle: true,  eyebrow: false, image: 0, body: 'spec',   list: false, sections: false },
  closing:       { subtitle: false, eyebrow: false, image: 0, body: 'url',    list: false, sections: false },
  manifesto:     { subtitle: true,  eyebrow: false, image: 0, body: 2,        list: false, sections: false },
  team:          { subtitle: true,  eyebrow: true,  image: 1, body: Infinity, list: true,  sections: true  },
  clients:       { subtitle: false, eyebrow: false, image: 1, body: 0,        list: true,  sections: false },
  budget:        { subtitle: false, eyebrow: false, image: 0, body: 0,        list: true,  sections: true },
  acceptance:    { subtitle: false, eyebrow: false, image: 1, body: 0,        list: false, sections: false },
  contexto:      { subtitle: false, eyebrow: true,  image: 0, body: Infinity, list: true,  sections: false },
  elreto:        { subtitle: false, eyebrow: true,  image: 1, body: 0,        list: false, sections: false },
  objetivos:     { subtitle: false, eyebrow: false, image: 1, body: 0,        list: true,  sections: false },
  roadmapPhases: { subtitle: true,  eyebrow: false, image: 0, body: 1,        list: false, sections: true },
};

/* Human-readable warnings about content the chosen layout will NOT render (so nothing is lost
   silently — the editor surfaces these). The design itself is never altered; this is advisory. */
export function validateBlock(m: BlockModel, kind: Slide['kind']): string[] {
  const s = SHOWS[kind];
  const w: string[] = [];

  // Only "loose" content can be dropped: paragraphs/lists BEFORE the first ### section (section
  // content is rendered by columns/roadmap/budget) and, for paragraphs, excluding `clave: valor`
  // lines (consumed as meta by acceptance/gantt/cover).
  const firstSection = m.tokens.findIndex((t) => t.t === 'h' && t.level >= 3);
  const cut = firstSection === -1 ? m.tokens.length : firstSection;
  const loose = m.tokens.slice(0, cut);
  const looseParas = loose
    .filter((t): t is Extract<Token, { t: 'p' }> => t.t === 'p')
    .map((t) => t.text)
    .filter((t) => !/^[\p{L} ]+:\s*.+$/u.test(t));
  const looseLists = loose.filter((t) => t.t === 'ul');

  if (m.subtitle && !s.subtitle) w.push('un subtítulo (##)');
  if (m.eyebrow && !s.eyebrow) w.push('un antetítulo (MAYÚSCULAS)');
  if (m.images.length > s.image) w.push(`${m.images.length - s.image} imagen(es) de más`);
  if (looseLists.length > 0 && !s.list && s.body !== 'spec') w.push('una lista (- …)');
  if (m.sections.length > 0 && !s.sections) w.push(`${m.sections.length} sección(es) (###)`);
  if (typeof s.body === 'number' && looseParas.length > s.body) w.push(`${looseParas.length - s.body} párrafo(s) de más`);
  // Only the gantt fence is rendered; any other fenced block is dropped.
  const extraFences = m.fences.filter((f) => !(kind === 'gantt' && f.lang === 'gantt'));
  if (extraFences.length > 0) w.push(`${extraFences.length} bloque(s) de código`);
  return w;
}
