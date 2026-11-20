/**
 * Pitches in scientific pitch notation: C4 is middle C.
 * Pure data and functions only — no rendering concerns.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

/** Semitone offset of each natural letter above C. */
const NATURAL_SEMITONES: Readonly<Record<Letter, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Accidental as a semitone offset: -2 = double flat … +2 = double sharp. */
export type Accidental = -2 | -1 | 0 | 1 | 2;

/** A letter + accidental with no octave, e.g. the tonic of a key. */
export interface PitchClass {
  readonly letter: Letter;
  readonly accidental: Accidental;
}

export interface Pitch extends PitchClass {
  readonly octave: number;
}

export function isAccidental(n: number): n is Accidental {
  return Number.isInteger(n) && n >= -2 && n <= 2;
}

export function pitch(letter: Letter, accidental: Accidental = 0, octave = 4): Pitch {
  return { letter, accidental, octave };
}

export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

/** Number of diatonic (letter) steps above C0. C4 → 28. Ignores accidentals. */
export function diatonicIndex(p: Pitch): number {
  return p.octave * 7 + letterIndex(p.letter);
}

/** The natural pitch at a diatonic index (inverse of {@link diatonicIndex}). */
export function pitchFromDiatonicIndex(index: number, accidental: Accidental = 0): Pitch {
  const octave = Math.floor(index / 7);
  const letter = LETTERS[index - octave * 7] as Letter;
  return { letter, accidental, octave };
}

export function naturalSemitone(letter: Letter): number {
  return NATURAL_SEMITONES[letter];
}

/** MIDI note number. C4 → 60. */
export function midi(p: Pitch): number {
  return (p.octave + 1) * 12 + NATURAL_SEMITONES[p.letter] + p.accidental;
}

/** Pitch class number 0–11 (C = 0). */
export function chroma(p: PitchClass): number {
  return (((NATURAL_SEMITONES[p.letter] + p.accidental) % 12) + 12) % 12;
}

export function isEnharmonic(a: Pitch, b: Pitch): boolean {
  return midi(a) === midi(b);
}

export function pitchEquals(a: Pitch, b: Pitch): boolean {
  return a.letter === b.letter && a.accidental === b.accidental && a.octave === b.octave;
}

/** Orders by staff position first, then by sounding pitch. */
export function comparePitch(a: Pitch, b: Pitch): number {
  return diatonicIndex(a) - diatonicIndex(b) || midi(a) - midi(b);
}

export type AccidentalStyle = 'ascii' | 'unicode';

const ACCIDENTAL_TEXT: Readonly<Record<AccidentalStyle, Readonly<Record<Accidental, string>>>> = {
  ascii: { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: 'x' },
  unicode: { [-2]: '\u{1D12B}', [-1]: '♭', 0: '', 1: '♯', 2: '\u{1D12A}' },
};

export function accidentalText(acc: Accidental, style: AccidentalStyle = 'unicode'): string {
  return ACCIDENTAL_TEXT[style][acc];
}

export interface FormatOptions {
  /** Include the octave number (default false). */
  octave?: boolean;
  style?: AccidentalStyle;
}

/** "E♭", "F#4", … */
export function formatPitch(p: PitchClass | Pitch, options: FormatOptions = {}): string {
  const { octave = false, style = 'unicode' } = options;
  const base = p.letter + accidentalText(p.accidental, style);
  return octave && 'octave' in p ? `${base}${p.octave}` : base;
}

const PITCH_PATTERN = /^([A-Ga-g])(bb|b|##|#|x|♭|♯|\u{1D12B}|\u{1D12A})?(-?\d+)$/u;

const ACCIDENTAL_TOKENS: Readonly<Record<string, Accidental>> = {
  bb: -2,
  b: -1,
  '#': 1,
  '##': 2,
  x: 2,
  '♭': -1,
  '♯': 1,
  '\u{1D12B}': -2,
  '\u{1D12A}': 2,
};

/** Parses "C4", "Bb3", "F#5", "Ebb2", "Gx4". Throws on invalid input. */
export function parsePitch(text: string): Pitch {
  const match = PITCH_PATTERN.exec(text.trim());
  if (!match) throw new Error(`Invalid pitch: "${text}"`);
  const [, letterText = '', accidentalToken, octaveText = ''] = match;
  const accidental = accidentalToken === undefined ? 0 : ACCIDENTAL_TOKENS[accidentalToken];
  if (accidental === undefined) throw new Error(`Invalid accidental in "${text}"`);
  return { letter: letterText.toUpperCase() as Letter, accidental, octave: Number(octaveText) };
}
