import {
  comparePitch,
  diatonicIndex,
  isAccidental,
  midi,
  naturalSemitone,
  pitchFromDiatonicIndex,
  type Pitch,
} from './pitch';

export type IntervalQuality = 'dd' | 'd' | 'm' | 'M' | 'P' | 'A' | 'AA';

export interface Interval {
  readonly quality: IntervalQuality;
  /** Diatonic size, 1 = unison, 8 = octave, 10 = compound third. */
  readonly number: number;
}

const PERFECT_SIMPLE = new Set([1, 4, 5]);

/** Semitones of the perfect or major form of each simple interval number. */
const BASE_SEMITONES: Readonly<Record<number, number>> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

const PERFECT_OFFSETS: Partial<Record<IntervalQuality, number>> = {
  dd: -2,
  d: -1,
  P: 0,
  A: 1,
  AA: 2,
};
const MAJOR_OFFSETS: Partial<Record<IntervalQuality, number>> = {
  dd: -3,
  d: -2,
  m: -1,
  M: 0,
  A: 1,
  AA: 2,
};

/** The simple (within an octave) interval number: 10 → 3. Octave (8) → 1. */
export function simpleNumber(n: number): number {
  return ((n - 1) % 7) + 1;
}

export function isPerfectType(n: number): boolean {
  return PERFECT_SIMPLE.has(simpleNumber(n));
}

export function isCompound(interval: Interval): boolean {
  return interval.number > 8;
}

export function isValidInterval(interval: Interval): boolean {
  const { quality, number } = interval;
  if (!Number.isInteger(number) || number < 1) return false;
  const offsets = isPerfectType(number) ? PERFECT_OFFSETS : MAJOR_OFFSETS;
  if (offsets[quality] === undefined) return false;
  // A diminished unison would be negative.
  return semitonesUnchecked(interval) >= 0;
}

function semitonesUnchecked({ quality, number }: Interval): number {
  const offsets = isPerfectType(number) ? PERFECT_OFFSETS : MAJOR_OFFSETS;
  const octaves = Math.floor((number - 1) / 7);
  return (BASE_SEMITONES[simpleNumber(number)] ?? 0) + 12 * octaves + (offsets[quality] ?? NaN);
}

export function semitones(interval: Interval): number {
  if (!isValidInterval(interval)) {
    throw new Error(`Invalid interval: ${interval.quality}${interval.number}`);
  }
  return semitonesUnchecked(interval);
}

/** The interval between two pitches, regardless of their order. */
export function intervalBetween(a: Pitch, b: Pitch): Interval {
  const [low, high] = comparePitch(a, b) <= 0 ? [a, b] : [b, a];
  const number = diatonicIndex(high) - diatonicIndex(low) + 1;
  const octaves = Math.floor((number - 1) / 7);
  const base = (BASE_SEMITONES[simpleNumber(number)] ?? 0) + 12 * octaves;
  const diff = midi(high) - midi(low) - base;
  const offsets = isPerfectType(number) ? PERFECT_OFFSETS : MAJOR_OFFSETS;
  const quality = (Object.keys(offsets) as IntervalQuality[]).find((q) => offsets[q] === diff);
  if (quality === undefined) {
    throw new Error(`Interval between these pitches is beyond doubly augmented/diminished`);
  }
  return { quality, number };
}

/** Transposes a pitch by an interval, keeping correct spelling (C up m3 → E♭). */
export function transpose(p: Pitch, interval: Interval, direction: 'up' | 'down' = 'up'): Pitch {
  const sign = direction === 'up' ? 1 : -1;
  const target = pitchFromDiatonicIndex(diatonicIndex(p) + sign * (interval.number - 1));
  const naturalMidi = (target.octave + 1) * 12 + naturalSemitone(target.letter);
  const accidental = midi(p) + sign * semitones(interval) - naturalMidi;
  if (!isAccidental(accidental)) {
    throw new Error(`Transposition needs an accidental beyond a double sharp or flat`);
  }
  return { ...target, accidental };
}

const QUALITY_NAMES: Readonly<Record<IntervalQuality, string>> = {
  dd: 'Doubly diminished',
  d: 'Diminished',
  m: 'Minor',
  M: 'Major',
  P: 'Perfect',
  A: 'Augmented',
  AA: 'Doubly augmented',
};

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function numberName(n: number): string {
  if (n === 1) return 'unison';
  if (n === 8) return 'octave';
  return ordinal(n);
}

/** "Major 3rd", "Perfect octave", "Augmented 4th". */
export function intervalName(interval: Interval): string {
  return `${QUALITY_NAMES[interval.quality]} ${numberName(interval.number)}`;
}

/** "M3", "P8", "A4". */
export function intervalShortName(interval: Interval): string {
  return `${interval.quality}${interval.number}`;
}
