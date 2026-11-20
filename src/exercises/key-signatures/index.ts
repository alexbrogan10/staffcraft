import { formatPitch, keyFromFifths, type Clef } from '../../domain';
import type { StaffSpec } from '../../notation';
import { CLEF_SETTING, chooseClef, generateVaried } from '../shared';
import type { Difficulty, ExercisePlugin, GenerateContext, ResponseArea } from '../types';

export interface KeySignatureQuestion {
  readonly clef: Clef;
  /** Sharps (positive) or flats (negative). */
  readonly fifths: number;
  /** Whether to ask for the relative minor as well as the major key. */
  readonly includeMinor: boolean;
}

const LEVELS: Readonly<Record<Difficulty, { maxAccidentals: number; includeMinor: boolean }>> = {
  easy: { maxAccidentals: 2, includeMinor: false },
  medium: { maxAccidentals: 4, includeMinor: true },
  hard: { maxAccidentals: 7, includeMinor: true },
};

function makeQuestion({ rng, difficulty, settings }: GenerateContext): KeySignatureQuestion {
  const { maxAccidentals, includeMinor } = LEVELS[difficulty];
  return {
    clef: chooseClef(settings, rng),
    fifths: rng.int(-maxAccidentals, maxAccidentals),
    includeMinor,
  };
}

function staff(q: KeySignatureQuestion): StaffSpec {
  return { clef: q.clef, keySignature: q.fifths, elements: [] };
}

function tonic(fifths: number, mode: 'major' | 'minor'): string {
  return formatPitch(keyFromFifths(fifths, mode).tonic);
}

export const keySignatures: ExercisePlugin<KeySignatureQuestion> = {
  id: 'key-signatures',
  title: 'Key Signatures',
  description: 'Identify major and relative minor keys from their key signatures.',
  levels: {
    easy: 'Major keys with up to two sharps or flats.',
    medium: 'Major and relative minor keys, up to four sharps or flats.',
    hard: 'All fifteen major and minor keys.',
  },
  settings: [CLEF_SETTING],
  defaultCount: 9,
  maxCount: 30,
  columns: 3,

  instructions(difficulty) {
    return LEVELS[difficulty].includeMinor
      ? 'Name the major key and the relative minor key for each key signature.'
      : 'Name the major key for each key signature.';
  },

  generate(context) {
    return generateVaried(
      context.count,
      () => makeQuestion(context),
      (q) => `${q.clef}:${q.fifths}`,
    );
  },

  render(question) {
    const responses: ResponseArea[] = [{ kind: 'blank', label: 'Major' }];
    if (question.includeMinor) responses.push({ kind: 'blank', label: 'Minor' });
    return { notation: staff(question), responses };
  },

  renderAnswer(question) {
    const responses: ResponseArea[] = [
      { kind: 'text', label: 'Major', text: tonic(question.fifths, 'major') },
    ];
    if (question.includeMinor) {
      responses.push({ kind: 'text', label: 'Minor', text: tonic(question.fifths, 'minor') });
    }
    return { notation: staff(question), responses };
  },
};
