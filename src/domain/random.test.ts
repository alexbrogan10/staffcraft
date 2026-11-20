import { describe, expect, it } from 'vitest';
import { createRng, hashString, pickVaried } from './random';

const draw = (seed: string, n = 20) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng.next());
};

describe('createRng', () => {
  it('is deterministic for a seed', () => {
    expect(draw('staffcraft')).toEqual(draw('staffcraft'));
  });

  it('differs between seeds', () => {
    expect(draw('a')).not.toEqual(draw('b'));
  });

  it('accepts numeric seeds equivalently to their string form', () => {
    expect(draw('42')).toEqual(draw(String(42)));
  });

  it('stays in [0, 1)', () => {
    for (const x of draw('range', 10_000)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('produces inclusive integer ranges with every value reachable', () => {
    const rng = createRng('ints');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = rng.int(-2, 3);
      expect(Number.isInteger(n)).toBe(true);
      seen.add(n);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2, 3]);
    expect(() => rng.int(3, 1)).toThrow(RangeError);
  });

  it('shuffles without losing items', () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    const shuffled = createRng('shuffle').shuffle(items);
    expect(shuffled).not.toEqual(items);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });

  it('honours weights', () => {
    const rng = createRng('weights');
    const counts = { a: 0, b: 0, never: 0 };
    for (let i = 0; i < 4000; i++)
      counts[
        rng.weighted([
          ['a', 3],
          ['b', 1],
          ['never', 0],
        ] as const)
      ]++;
    expect(counts.never).toBe(0);
    expect(counts.a / counts.b).toBeGreaterThan(2.5);
    expect(counts.a / counts.b).toBeLessThan(3.5);
  });

  it('forks into independent, reproducible streams', () => {
    const a = createRng('root').fork('section-1');
    const b = createRng('root').fork('section-1');
    const c = createRng('root').fork('section-2');
    expect(a.next()).toBe(b.next());
    expect(createRng('root').fork('section-1').next()).not.toBe(c.next());
  });

  it('rejects empty picks', () => {
    expect(() => createRng('x').pick([])).toThrow();
  });
});

describe('hashString', () => {
  it('produces unsigned 32-bit hashes', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('hello')).toBe(hashString('hello'));
    expect(hashString('hello')).not.toBe(hashString('hellp'));
  });
});

describe('pickVaried', () => {
  it('uses every item before repeating', () => {
    const picks = pickVaried(createRng('v'), [1, 2, 3, 4], 8);
    expect(new Set(picks.slice(0, 4)).size).toBe(4);
    expect(new Set(picks.slice(4)).size).toBe(4);
  });

  it('never repeats an item twice in a row', () => {
    for (let seed = 0; seed < 50; seed++) {
      const picks = pickVaried(createRng(seed), ['a', 'b', 'c'], 30);
      for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
    }
  });
});
