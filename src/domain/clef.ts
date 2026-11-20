import { diatonicIndex, pitchFromDiatonicIndex, type Pitch } from './pitch';

export const CLEFS = ['treble', 'bass'] as const;
export type Clef = (typeof CLEFS)[number];

/** Diatonic index of the bottom staff line: E4 (treble) and G2 (bass). */
const BOTTOM_LINE: Readonly<Record<Clef, number>> = {
  treble: diatonicIndex({ letter: 'E', accidental: 0, octave: 4 }),
  bass: diatonicIndex({ letter: 'G', accidental: 0, octave: 2 }),
};

/** Steps from the bottom line to the top line of a five-line staff. */
export const TOP_LINE_STEP = 8;

/**
 * Staff position of a pitch: 0 = bottom line, 1 = first space, … 8 = top line.
 * Negative values are below the staff; values above 8 are above it.
 */
export function staffStep(p: Pitch, clef: Clef): number {
  return diatonicIndex(p) - BOTTOM_LINE[clef];
}

export function isOnLine(step: number): boolean {
  return step % 2 === 0;
}

/** The natural pitch at a staff step. */
export function pitchAtStep(step: number, clef: Clef): Pitch {
  return pitchFromDiatonicIndex(BOTTOM_LINE[clef] + step);
}

/** How many ledger lines a note at this step needs. */
export function ledgerLinesForStep(step: number): number {
  if (step < 0) return Math.floor(-step / 2);
  if (step > TOP_LINE_STEP) return Math.floor((step - TOP_LINE_STEP) / 2);
  return 0;
}

export function ledgerLineCount(p: Pitch, clef: Clef): number {
  return ledgerLinesForStep(staffStep(p, clef));
}

/**
 * Inclusive range of staff steps whose notes need at most `maxLedgerLines` ledger lines.
 * With 0 this includes the spaces just above and below the staff.
 */
export function stepRange(maxLedgerLines: number): { min: number; max: number } {
  if (!Number.isInteger(maxLedgerLines) || maxLedgerLines < 0) {
    throw new RangeError(`maxLedgerLines must be a non-negative integer, got ${maxLedgerLines}`);
  }
  return { min: -(2 * maxLedgerLines + 1), max: TOP_LINE_STEP + 2 * maxLedgerLines + 1 };
}

/** All natural pitches on a clef needing between `minLedgerLines` and `maxLedgerLines` ledger lines. */
export function naturalPitchesInRange(
  clef: Clef,
  maxLedgerLines: number,
  minLedgerLines = 0,
): Pitch[] {
  const { min, max } = stepRange(maxLedgerLines);
  const result: Pitch[] = [];
  for (let step = min; step <= max; step++) {
    if (ledgerLinesForStep(step) >= minLedgerLines) result.push(pitchAtStep(step, clef));
  }
  return result;
}
