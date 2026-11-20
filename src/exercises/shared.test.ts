import { describe, expect, it } from 'vitest';
import { createRng } from '../domain';
import { chooseClef, generateVaried } from './shared';

describe('generateVaried', () => {
  it('avoids duplicates while the pool allows', () => {
    const rng = createRng('varied');
    const items = generateVaried(10, () => rng.int(1, 10));
    expect(new Set(items).size).toBe(10);
  });

  it('never repeats the previous item when alternatives exist', () => {
    const rng = createRng('small pool');
    const items = generateVaried(40, () => rng.int(1, 3));
    for (let i = 1; i < items.length; i++) expect(items[i]).not.toBe(items[i - 1]);
  });

  it('still fills the count from a single-item pool', () => {
    expect(generateVaried(3, () => 'only')).toEqual(['only', 'only', 'only']);
  });
});

describe('chooseClef', () => {
  it('follows the setting', () => {
    const rng = createRng('clef');
    expect(chooseClef({ clef: 'bass' }, rng)).toBe('bass');
    expect(chooseClef({ clef: 'treble' }, rng)).toBe('treble');
    const mixed = new Set(Array.from({ length: 50 }, () => chooseClef({ clef: 'both' }, rng)));
    expect(mixed).toEqual(new Set(['treble', 'bass']));
  });
});
