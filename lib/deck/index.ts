import { parse } from './parse.ts';
import { compile as classifyAll } from './classify.ts';
import type { Deck, DeckType, Slide } from './types.ts';

export * from './types.ts';

/* Fixed brand pages for commercial proposals: 3 after the cover, 2 before the closing. */
const COMMERCIAL_INTRO: Slide[] = [
  { kind: 'manifesto', theme: 'light' },
  { kind: 'team', theme: 'light' },
  { kind: 'clients', theme: 'light' },
];
const COMMERCIAL_END: Slide[] = [
  { kind: 'budget', theme: 'light' },
  { kind: 'acceptance', theme: 'light' },
];

export function compileDeck(md: string, type: DeckType = 'comercial'): Deck {
  const sources = parse(md);
  const slides = classifyAll(md, sources);

  if (type === 'comercial') {
    const introAt = slides[0]?.kind === 'cover' ? 1 : 0;
    slides.splice(introAt, 0, ...COMMERCIAL_INTRO.map((s) => ({ ...s })));

    const endAt = slides[slides.length - 1]?.kind === 'closing' ? slides.length - 1 : slides.length;
    slides.splice(endAt, 0, ...COMMERCIAL_END.map((s) => ({ ...s })));
  }

  return { slides };
}
