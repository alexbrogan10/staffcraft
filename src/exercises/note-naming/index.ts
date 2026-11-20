import {
  formatPitch,
  ledgerLinesForStep,
  pitchAtStep,
  stepRange,
  type Accidental,
  type Clef,
  type Pitch,
} from '../../domain';
import { CLEF_SETTING, chooseClef, generateVaried } from '../shared';
import type { StaffSpec } from '../../notation';
import type { Difficulty, ExercisePlugin, GenerateContext } from '../types';

export interface NoteNamingQuestion {
  readonly clef: Clef;
  readonly pitch: Pitch;
}

/** Spellings that confuse beginners more than they teach (E♯, F♭, B♯, C♭). */
const AWKWARD: ReadonlySet<string> = new Set(['E1', 'F-1', 'B1', 'C-1']);

interface Level {
  readonly maxLedgerLines: number;
  /** Probability that a question uses a ledger-line note, when allowed. */
  readonly ledgerShare: number;
  readonly accidentalShare: number;
}

const LEVELS: Readonly<Record<Difficulty, Level>> = {
  easy: { maxLedgerLines: 0, ledgerShare: 0, accidentalShare: 0 },
  medium: { maxLedgerLines: 0, ledgerShare: 0, accidentalShare: 0.4 },
  hard: { maxLedgerLines: 3, ledgerShare: 0.6, accidentalShare: 0.35 },
};

function makeQuestion({ rng, difficulty, settings }: GenerateContext): NoteNamingQuestion {
  const level = LEVELS[difficulty];
  const clef = chooseClef(settings, rng);
  const { min, max } = stepRange(level.maxLedgerLines);
  const steps: number[] = [];
  for (let s = min; s <= max; s++) steps.push(s);
  const useLedger = rng.chance(level.ledgerShare);
  const pool = steps.filter((s) => ledgerLinesForStep(s) > 0 === useLedger);
  const natural = pitchAtStep(rng.pick(pool), clef);

  let accidental: Accidental = 0;
  if (rng.chance(level.accidentalShare)) {
    const choice: Accidental = rng.chance(0.5) ? 1 : -1;
    if (!AWKWARD.has(`${natural.letter}${choice}`)) accidental = choice;
  }
  return { clef, pitch: { ...natural, accidental } };
}

function staff(question: NoteNamingQuestion): StaffSpec {
  return {
    clef: question.clef,
    elements: [
      { kind: 'note', pitches: [question.pitch], duration: { value: 'w', dots: 0, rest: false } },
    ],
  };
}

export const noteNaming: ExercisePlugin<NoteNamingQuestion> = {
  id: 'note-naming',
  title: 'Note Naming',
  description: 'Name notes on the treble or bass staff, with accidentals and ledger lines.',
  settings: [CLEF_SETTING],
  defaultCount: 12,
  maxCount: 40,
  columns: 4,

  instructions(difficulty) {
    return difficulty === 'easy'
      ? 'Write the letter name of each note on the line below it.'
      : 'Write the letter name of each note, including any sharp or flat.';
  },

  generate(context) {
    return generateVaried(
      context.count,
      () => makeQuestion(context),
      (q) => `${q.clef}:${formatPitch(q.pitch, { octave: true, style: 'ascii' })}`,
    );
  },

  render(question) {
    return { notation: staff(question), responses: [{ kind: 'blank' }] };
  },

  renderAnswer(question) {
    return {
      notation: staff(question),
      responses: [{ kind: 'text', text: formatPitch(question.pitch) }],
    };
  },
};
