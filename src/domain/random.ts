/**
 * Deterministic pseudo-random numbers. Every worksheet is generated from a seed,
 * so the same seed always produces the same questions.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Picks using relative weights. */
  weighted<T>(items: readonly (readonly [T, number])[]): T;
  /** A new shuffled copy. */
  shuffle<T>(items: readonly T[]): T[];
  /** An independent generator derived from this one's seed and a label. */
  fork(label: string): Rng;
}

/** 32-bit FNV-1a hash of a string. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number): Rng {
  const seedText = String(seed);
  const next = mulberry32(hashString(seedText));

  const rng: Rng = {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError(`Invalid integer range [${min}, ${max}]`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new Error('Cannot pick from an empty list');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    weighted(items) {
      const total = items.reduce((sum, [, w]) => sum + w, 0);
      if (!(total > 0)) throw new Error('Weights must add up to more than zero');
      let r = next() * total;
      for (const [item, w] of items) {
        r -= w;
        if (r < 0) return item;
      }
      return (items[items.length - 1] as (typeof items)[number])[0];
    },
    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j] as (typeof copy)[number], copy[i] as (typeof copy)[number]];
      }
      return copy;
    },
    fork(label) {
      return createRng(`${seedText}/${label}`);
    },
  };
  return rng;
}

/**
 * Picks `count` items, avoiding repeats while possible and never placing the same
 * item twice in a row (unless the pool has a single item).
 */
export function pickVaried<T>(
  rng: Rng,
  pool: readonly T[],
  count: number,
  key: (item: T) => string = (item) => JSON.stringify(item),
): T[] {
  if (pool.length === 0) throw new Error('Cannot pick from an empty list');
  const result: T[] = [];
  let bag: T[] = [];
  while (result.length < count) {
    if (bag.length === 0) bag = rng.shuffle(pool);
    const previous = result[result.length - 1];
    let index = 0;
    if (previous !== undefined && pool.length > 1) {
      const found = bag.findIndex((item) => key(item) !== key(previous));
      index = found === -1 ? 0 : found;
    }
    const [item] = bag.splice(index, 1) as [T];
    result.push(item);
  }
  return result;
}
