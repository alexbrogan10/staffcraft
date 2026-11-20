import { FONT_WIDTHS } from './fontMetrics';

export type FontWeight = 'regular' | 'bold';

/** Width used for characters missing from the subset font (the renderer falls back too). */
const FALLBACK_EM = 0.6;

/** Width of a string in the worksheet font, in the same units as `size`. */
export function measureText(text: string, size: number, weight: FontWeight = 'regular'): number {
  const table = FONT_WIDTHS[weight];
  let ems = 0;
  for (const char of text) ems += table[char.codePointAt(0) ?? 0] ?? FALLBACK_EM;
  return ems * size;
}

/** Greedy word wrap. Words longer than the line are broken by character. */
export function wrapText(
  text: string,
  size: number,
  maxWidth: number,
  weight: FontWeight = 'regular',
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    if (word === '') continue;
    const candidate = line === '' ? word : `${line} ${word}`;
    if (measureText(candidate, size, weight) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line !== '') lines.push(line);
    line = '';
    for (const char of word) {
      if (line !== '' && measureText(line + char, size, weight) > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}
