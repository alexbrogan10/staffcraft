/**
 * Note durations, time signatures and counting.
 * Time is measured in "units" of a thirty-second note so that dotted values are integers.
 */

export const DURATION_VALUES = ['w', 'h', 'q', '8', '16'] as const;
/** w = whole, h = half, q = quarter, 8 = eighth, 16 = sixteenth. */
export type DurationValue = (typeof DURATION_VALUES)[number];

export interface Duration {
  readonly value: DurationValue;
  readonly dots: 0 | 1;
  readonly rest: boolean;
}

export function duration(
  value: DurationValue,
  options: { dots?: 0 | 1; rest?: boolean } = {},
): Duration {
  return { value, dots: options.dots ?? 0, rest: options.rest ?? false };
}

const VALUE_UNITS: Readonly<Record<DurationValue, number>> = {
  w: 32,
  h: 16,
  q: 8,
  '8': 4,
  '16': 2,
};

export const UNITS_PER_WHOLE = 32;

export function durationUnits(d: Duration): number {
  const base = VALUE_UNITS[d.value];
  return d.dots === 1 ? base + base / 2 : base;
}

export interface TimeSignature {
  readonly beats: number;
  /** The note value that gets one count: 2, 4 or 8. */
  readonly beatValue: 2 | 4 | 8;
}

export function measureUnits(ts: TimeSignature): number {
  return ts.beats * (UNITS_PER_WHOLE / ts.beatValue);
}

/** Compound meters (6/8, 9/8, 12/8) group beats in threes. */
export function isCompoundMeter(ts: TimeSignature): boolean {
  return ts.beatValue === 8 && ts.beats % 3 === 0 && ts.beats > 3;
}

/** Units of one count, i.e. the note value named by the bottom number. */
export function countUnits(ts: TimeSignature): number {
  return UNITS_PER_WHOLE / ts.beatValue;
}

/** Units in one beaming group: a beat in simple meter, a dotted beat in compound. */
export function beamGroupUnits(ts: TimeSignature): number {
  return isCompoundMeter(ts) ? 3 * countUnits(ts) : countUnits(ts);
}

/**
 * The count spoken at a position within a measure, using the common
 * "1 e & a" system on the bottom-number note value:
 * in 4/4, an eighth after beat 2 is "&"; in 6/8 each eighth gets a number.
 */
export function countAt(position: number, ts: TimeSignature): string {
  const unit = countUnits(ts);
  if (position < 0 || position >= measureUnits(ts)) {
    throw new RangeError(`Position ${position} is outside a ${ts.beats}/${ts.beatValue} measure`);
  }
  const beat = Math.floor(position / unit) + 1;
  const fraction = (position % unit) / unit;
  if (fraction === 0) return String(beat);
  if (fraction === 0.5) return '&';
  if (fraction === 0.25) return 'e';
  if (fraction === 0.75) return 'a';
  throw new Error(`No count syllable for position ${position} in ${ts.beats}/${ts.beatValue}`);
}

/**
 * Splits a rhythm into measures. Throws if a note would cross a barline
 * or the last measure is incomplete.
 */
export function splitIntoMeasures(rhythm: readonly Duration[], ts: TimeSignature): Duration[][] {
  const capacity = measureUnits(ts);
  const measures: Duration[][] = [];
  let current: Duration[] = [];
  let filled = 0;
  for (const d of rhythm) {
    filled += durationUnits(d);
    if (filled > capacity) throw new Error('A note crosses a barline');
    current.push(d);
    if (filled === capacity) {
      measures.push(current);
      current = [];
      filled = 0;
    }
  }
  if (current.length > 0) throw new Error('The last measure is incomplete');
  return measures;
}

export interface CountedNote {
  readonly duration: Duration;
  readonly measure: number;
  /** Position of the note's onset within its measure, in units. */
  readonly position: number;
  /** Count spoken on the note's onset, e.g. "2" or "&". */
  readonly count: string;
}

/** Labels every note (and rest) of a rhythm with the count on which it starts. */
export function countRhythm(rhythm: readonly Duration[], ts: TimeSignature): CountedNote[] {
  const result: CountedNote[] = [];
  splitIntoMeasures(rhythm, ts).forEach((notes, measure) => {
    let position = 0;
    for (const d of notes) {
      result.push({ duration: d, measure, position, count: countAt(position, ts) });
      position += durationUnits(d);
    }
  });
  return result;
}

const VALUE_NAMES: Readonly<Record<DurationValue, string>> = {
  w: 'whole',
  h: 'half',
  q: 'quarter',
  '8': 'eighth',
  '16': 'sixteenth',
};

/** "dotted quarter note", "eighth rest". */
export function durationName(d: Duration): string {
  return `${d.dots ? 'dotted ' : ''}${VALUE_NAMES[d.value]} ${d.rest ? 'rest' : 'note'}`;
}
