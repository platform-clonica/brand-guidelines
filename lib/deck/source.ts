/* Split the Markdown into source blocks (the same `---` boundaries parse() uses),
   tracking each block's character range so the editor can jump to a slide's source. */

export interface SourceBlock {
  index: number;
  start: number;
  end: number;
  text: string;
}

const SEP = /\n-{3,}\n/g;

export function splitSourceBlocks(md: string): SourceBlock[] {
  const blocks: SourceBlock[] = [];
  let start = 0;
  let index = 0;
  let m: RegExpExecArray | null;
  SEP.lastIndex = 0;
  while ((m = SEP.exec(md)) !== null) {
    blocks.push({ index: index++, start, end: m.index, text: md.slice(start, m.index) });
    start = m.index + m[0].length;
  }
  blocks.push({ index, start, end: md.length, text: md.slice(start) });
  return blocks;
}

/* Write an image URL into the source block of slide `slideIndex` (slides are 1:1 with
   blocks — see compileDeck's provenance). Replaces the block's first `![alt](…)` keeping
   its alt text, or appends a new image line when the block has none yet. Returns the new md. */
const IMG_RE = /!\[(.*?)\]\([^)]*\)/;

export function setBlockImage(md: string, slideIndex: number, url: string): string {
  const blocks = splitSourceBlocks(md);
  const b = blocks[slideIndex];
  if (!b) return md;
  const text = IMG_RE.test(b.text)
    ? b.text.replace(IMG_RE, (_m, alt: string) => `![${alt}](${url})`)
    : `${b.text.replace(/\s*$/, '')}\n\n![](${url})`;
  return md.slice(0, b.start) + text + md.slice(b.end);
}
