import { parse } from './parse.ts';
import { compile as classifyAll } from './classify.ts';
import type { Deck, DeckType, Slide } from './types.ts';

export * from './types.ts';

/* Fixed brand pages inserted right after the cover in commercial proposals. */
const COMMERCIAL_FIXED: Slide[] = [
  { kind: 'manifesto', theme: 'light' },
  { kind: 'team', theme: 'light' },
  { kind: 'clients', theme: 'light' },
];

export function compileDeck(md: string, type: DeckType = 'comercial'): Deck {
  const sources = parse(md);
  const slides = classifyAll(md, sources);

  if (type === 'comercial') {
    const at = slides[0]?.kind === 'cover' ? 1 : 0;
    slides.splice(at, 0, ...COMMERCIAL_FIXED.map((s) => ({ ...s })));
  }

  return { slides };
}
