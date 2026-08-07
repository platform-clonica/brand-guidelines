export type Theme = 'dark' | 'light';
export type Accent = 'opal' | 'bordeaux' | 'emerald';

export type ImageRef = { src?: string; alt?: string; prompt?: string };
// A row is a list of spans, not a single range: a phase can be discontinuous
// (`Descubrimiento: 4, 6, 9` draws three separate bars). All spans of a row
// share the row's accent — it is one phase, not three.
export type GanttSpan = [start: number, end: number];
export type GanttRow = { label: string; spans: GanttSpan[]; accent: Accent };
export type Column = { label: string; heading: string; body: string };
export type Phase = { name: string; body: string; itemsHeader?: string; items: string[] };
export type BudgetItem = { label: string; amount: string };
export type Signer = { name?: string; role?: string; company?: string; nif?: string; address?: string };

/* An ordered rich-text flow: paragraphs, lists, quotes, sub-headings and eyebrows kept in
   document order, each supporting inline formatting. Used where a layout renders free-form
   markdown (the team text column). */
export type RichNode =
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'quote'; text: string }
  | { t: 'h'; level: number; text: string }
  | { t: 'caps'; text: string };

/* Background fill an author can pick for a light slide (dark stays reserved for the canonical hero
   slides). All three take dark text, so only the fill changes, never the text colour. */
export type Background = 'warm-light' | 'warm-dark' | 'white';

type SlideVariant =
  | { kind: 'cover'; theme: Theme; title: string; subtitle?: string; eyebrow?: string; client?: string; image?: ImageRef; footer?: string }
  | { kind: 'statement'; theme: Theme; eyebrow?: string; title: string }
  | { kind: 'bullets'; theme: Theme; title: string; items: string[] }
  | { kind: 'columns'; theme: Theme; title: string; columns: Column[] }
  | { kind: 'split'; theme: Theme; eyebrow?: string; title: string; body?: RichNode[]; image?: ImageRef; imageSide?: 'left' | 'right' }
  | { kind: 'gantt'; theme: Theme; title: string; subtitle?: string; weeks: number; unit?: string; rows: GanttRow[]; milestones: number[]; milestoneLabel?: string; note?: string }
  | { kind: 'paragraph'; theme: Theme; eyebrow?: string; body: RichNode[] }
  | { kind: 'closing'; theme: Theme; title: string; url?: string }
  // Brand pages: content is editable from the markdown; missing fields fall back to defaults.
  | { kind: 'manifesto'; theme: Theme; title?: string; subtitle?: string }
  | { kind: 'team'; theme: Theme; content?: RichNode[]; image?: ImageRef }
  // Client logo wall: the category labels live as translatable text on top of the logo-wall image
  // (the image no longer carries them), so they translate and stay in the system. Empty `labels`
  // (a marker-only block) falls back to the canonical categories in the component.
  | { kind: 'clients'; theme: Theme; labels: string[]; image?: ImageRef }
  // `total` absent = the `nototal` marker: the slide prints no total row.
  | { kind: 'budget'; theme: Theme; title?: string; items: BudgetItem[]; total?: string; conditions: string[]; conditionsLabel?: string }
  | { kind: 'acceptance'; theme: Theme; title?: string; signer?: Signer; note?: string; cta?: string; signatureImage?: ImageRef }
  // Keyword-mapped commercial sections (ref slides 22/29/31/32/35)
  | { kind: 'contexto'; theme: Theme; eyebrow?: string; body: RichNode[]; long: boolean }
  | { kind: 'elreto'; theme: Theme; eyebrow?: string; title: string; image?: ImageRef }
  | { kind: 'objetivos'; theme: Theme; title: string; items: string[]; image?: ImageRef }
  | { kind: 'roadmapPhases'; theme: Theme; title: string; subtitle?: string; faseLabel?: string; phases: Phase[] };

/* `bg` is orthogonal to kind, so it rides on every variant via intersection — narrowing on `kind`
   still works, and no per-layout change is needed. */
export type Slide = SlideVariant & { bg?: Background };

export type DeckType = 'comercial' | 'informe' | 'generica';

export type SlideKind = Slide['kind'];
/* `provenance[i]` is the source-block index that produced slide i, or null when the
   slide was injected by compileDeck (manifesto/team/clients/acceptance). */
export type Deck = { slides: Slide[]; provenance?: (number | null)[] };

// Intermediate produced by parse.ts, consumed by classify.ts
export type Token =
  | { t: 'h'; level: number; text: string }
  | { t: 'caps'; text: string }
  | { t: 'p'; text: string }
  | { t: 'quote'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'image'; alt: string; src: string }
  | { t: 'fence'; lang: string; body: string }
  | { t: 'layout'; name: string; mod?: string };

export type SlideSource = { tokens: Token[]; index: number };
