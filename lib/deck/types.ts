export type Theme = 'dark' | 'light';
export type Accent = 'opal' | 'bordeaux' | 'emerald';

export type ImageRef = { src?: string; alt?: string; prompt?: string };
export type GanttRow = { label: string; start: number; end: number; accent: Accent };
export type Column = { label: string; heading: string; body: string };

export type Slide =
  | { kind: 'cover'; theme: Theme; title: string; subtitle?: string; eyebrow?: string; client?: string; image?: ImageRef; footer?: string }
  | { kind: 'statement'; theme: Theme; eyebrow?: string; title: string }
  | { kind: 'bullets'; theme: Theme; title: string; items: string[] }
  | { kind: 'columns'; theme: Theme; title: string; columns: Column[] }
  | { kind: 'split'; theme: Theme; eyebrow?: string; title: string; body?: string; image?: ImageRef }
  | { kind: 'gantt'; theme: Theme; title: string; subtitle?: string; weeks: number; rows: GanttRow[]; milestones: number[]; note?: string }
  | { kind: 'paragraph'; theme: Theme; eyebrow?: string; body: string }
  | { kind: 'closing'; theme: Theme; title: string; url?: string }
  // Fixed brand pages (auto-inserted for commercial proposals; content is boilerplate).
  | { kind: 'manifesto'; theme: Theme }
  | { kind: 'team'; theme: Theme }
  | { kind: 'clients'; theme: Theme }
  | { kind: 'budget'; theme: Theme }
  | { kind: 'acceptance'; theme: Theme };

export type DeckType = 'comercial' | 'informe' | 'generica';

export type SlideKind = Slide['kind'];
export type Deck = { slides: Slide[] };

// Intermediate produced by parse.ts, consumed by classify.ts
export type Token =
  | { t: 'h'; level: number; text: string }
  | { t: 'caps'; text: string }
  | { t: 'p'; text: string }
  | { t: 'quote'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'image'; alt: string; src: string }
  | { t: 'fence'; lang: string; body: string };

export type SlideSource = { tokens: Token[]; index: number };
