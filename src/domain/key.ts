import { transpose } from './interval';
import { formatPitch, LETTERS, type AccidentalStyle, type Letter, type PitchClass } from './pitch';

export type Mode = 'major' | 'minor';

export interface Key {
  readonly tonic: PitchClass;
  readonly mode: Mode;
}

/** Order in which sharps appear in a key signature (flats are the reverse). */
export const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER: readonly Letter[] = [...SHARP_ORDER].reverse();

export const MIN_FIFTHS = -7;
export const MAX_FIFTHS = 7;

/** Letters of the line of fifths starting at F (F C G D A E B). */
const FIFTHS_LETTERS = SHARP_ORDER;

function checkFifths(fifths: number): void {
  if (!Number.isInteger(fifths) || fifths < MIN_FIFTHS || fifths > MAX_FIFTHS) {
    throw new RangeError(`Key signature must have 0–7 sharps or flats, got ${fifths}`);
  }
}

/**
 * Pitch class at a position on the line of fifths, where 0 = C, 1 = G, -1 = F, …
 */
function pitchClassOnLineOfFifths(position: number): PitchClass {
  const shifted = position + 1; // F = 0
  const accidental = Math.floor(shifted / 7);
  const letter = FIFTHS_LETTERS[shifted - accidental * 7] as Letter;
  return { letter, accidental: accidental as PitchClass['accidental'] };
}

/**
 * The key with a given signature. `fifths` is the number of sharps (positive) or
 * flats (negative): 0 = C major / A minor, -3 = E♭ major / C minor.
 */
export function keyFromFifths(fifths: number, mode: Mode): Key {
  checkFifths(fifths);
  return { tonic: pitchClassOnLineOfFifths(mode === 'major' ? fifths : fifths + 3), mode };
}

/** Number of sharps (positive) or flats (negative) in the key's signature. */
export function fifthsOf(key: Key): number {
  const position = FIFTHS_LETTERS.indexOf(key.tonic.letter) - 1 + key.tonic.accidental * 7;
  const fifths = key.mode === 'major' ? position : position - 3;
  checkFifths(fifths);
  return fifths;
}

/** The accidentals in a key signature, in the order they are written. */
export function keySignatureAccidentals(fifths: number): PitchClass[] {
  checkFifths(fifths);
  if (fifths >= 0) return SHARP_ORDER.slice(0, fifths).map((letter) => ({ letter, accidental: 1 }));
  return FLAT_ORDER.slice(0, -fifths).map((letter) => ({ letter, accidental: -1 }));
}

/** The accidental a letter takes in a given key signature. */
export function accidentalInKey(letter: Letter, fifths: number): PitchClass['accidental'] {
  return keySignatureAccidentals(fifths).find((pc) => pc.letter === letter)?.accidental ?? 0;
}

export function relativeKey(key: Key): Key {
  return keyFromFifths(fifthsOf(key), key.mode === 'major' ? 'minor' : 'major');
}

/** All 15 keys of a mode, from 7 flats to 7 sharps. */
export function allKeys(mode: Mode): Key[] {
  const keys: Key[] = [];
  for (let f = MIN_FIFTHS; f <= MAX_FIFTHS; f++) keys.push(keyFromFifths(f, mode));
  return keys;
}

/** "E♭ major", "C♯ minor". */
export function keyName(key: Key, style: AccidentalStyle = 'unicode'): string {
  return `${formatPitch(key.tonic, { style })} ${key.mode}`;
}

/** "no sharps or flats", "1 sharp", "3 flats". */
export function describeSignature(fifths: number): string {
  checkFifths(fifths);
  if (fifths === 0) return 'no sharps or flats';
  const n = Math.abs(fifths);
  return `${n} ${fifths > 0 ? 'sharp' : 'flat'}${n === 1 ? '' : 's'}`;
}

/** The scale of a key as pitch classes (natural minor for minor keys). */
export function scaleOf(key: Key): PitchClass[] {
  const fifths = fifthsOf(key);
  const start = LETTERS.indexOf(key.tonic.letter);
  return Array.from({ length: 7 }, (_, i) => {
    const letter = LETTERS[(start + i) % 7] as Letter;
    return { letter, accidental: accidentalInKey(letter, fifths) };
  });
}

/** The tonic of the relative minor, spelled from the major tonic (down a minor third). */
export function relativeMinorTonic(majorTonic: PitchClass): PitchClass {
  const { letter, accidental } = transpose(
    { ...majorTonic, octave: 4 },
    { quality: 'm', number: 3 },
    'down',
  );
  return { letter, accidental };
}
