import {
  intervalShortName,
  ledgerLineCount,
  pitchAtStep,
  stepRange,
  transpose,
  type Accidental,
  type Clef,
  type Interval,
  type IntervalQuality,
  type Pitch,
  type Rng,
} from '../../domain';
import type { StaffSpec } from '../../notation';
import { CLEF_SETTING, chooseClef, generateVaried } from '../shared';
import type { Difficulty, ExercisePlugin, GenerateContext } from '../types';

export interface IntervalQuestion {
  readonly clef: Clef;
  readonly lower: Pitch;
  readonly upper: Pitch;
  readonly interval: Interval;
  /** Harmonic intervals are stacked; melodic ones are written one after the other. */
  readonly harmonic: boolean;
}

interface Level {
  readonly intervals: readonly Interval[];
  readonly maxLedgerLines: number;
  /** Chance that the lower note carries a sharp or flat. */
  readonly lowerAccidentalShare: number;
  /** Whether the upper note may need an accidental. */
  readonly upperAccidentals: boolean;
}

const iv = (quality: IntervalQuality, number: number): Interval => ({ quality, number });

const MAJOR_PERFECT = [
  iv('M', 2),
  iv('M', 3),
  iv('P', 4),
  iv('P', 5),
  iv('M', 6),
  iv('M', 7),
  iv('P', 8),
];
const MINOR = [iv('m', 2), iv('m', 3), iv('m', 6), iv('m', 7)];
const ALTERED = [
  iv('A', 4),
  iv('d', 5),
  iv('A', 2),
  iv('d', 7),
  iv('A', 5),
  iv('d', 4),
  iv('A', 6),
];
const COMPOUND = [iv('M', 9), iv('m', 10), iv('M', 10), iv('P', 11), iv('P', 12)];

const LEVELS: Readonly<Record<Difficulty, Level>> = {
  easy: {
    intervals: MAJOR_PERFECT,
    maxLedgerLines: 1,
    lowerAccidentalShare: 0,
    upperAccidentals: false,
  },
  medium: {
    intervals: [...MAJOR_PERFECT, ...MINOR],
    maxLedgerLines: 1,
    lowerAccidentalShare: 0.2,
    upperAccidentals: true,
  },
  hard: {
    intervals: [...MAJOR_PERFECT, ...MINOR, ...ALTERED, ...ALTERED, ...COMPOUND],
    maxLedgerLines: 2,
    lowerAccidentalShare: 0.3,
    upperAccidentals: true,
  },
};

/** Spellings avoided as the written notes (E♯, F♭, B♯, C♭). */
const AWKWARD: ReadonlySet<string> = new Set(['E1', 'F-1', 'B1', 'C-1']);

const isPlain = (p: Pitch) =>
  !AWKWARD.has(`${p.letter}${p.accidental}`) && Math.abs(p.accidental) <= 1;

function tryQuestion(
  rng: Rng,
  level: Level,
  clef: Clef,
  harmonic: boolean,
): IntervalQuestion | null {
  const interval = rng.pick(level.intervals);
  const { min, max } = stepRange(level.maxLedgerLines);
  const natural = pitchAtStep(rng.int(min, max - (interval.number - 1)), clef);
  const accidental: Accidental = rng.chance(level.lowerAccidentalShare)
    ? rng.pick([-1, 1] as const)
    : 0;
  const lower: Pitch = { ...natural, accidental };
  let upper: Pitch;
  try {
    upper = transpose(lower, interval);
  } catch {
    return null;
  }
  if (!isPlain(lower) || !isPlain(upper)) return null;
  if (!level.upperAccidentals && upper.accidental !== 0) return null;
  if (ledgerLineCount(upper, clef) > level.maxLedgerLines) return null;
  return { clef, lower, upper, interval, harmonic };
}

function makeQuestion({ rng, difficulty, settings }: GenerateContext): IntervalQuestion {
  const level = LEVELS[difficulty];
  const clef = chooseClef(settings, rng);
  const harmonic =
    settings.style === 'harmonic' ? true : settings.style === 'melodic' ? false : rng.chance(0.5);
  // Every level has many valid combinations, so this always finishes quickly.
  for (;;) {
    const question = tryQuestion(rng, level, clef, harmonic);
    if (question) return question;
  }
}

function staff(q: IntervalQuestion): StaffSpec {
  const whole = { value: 'w', dots: 0, rest: false } as const;
  return {
    clef: q.clef,
    elements: q.harmonic
      ? [{ kind: 'note', pitches: [q.lower, q.upper], duration: whole }]
      : [
          { kind: 'note', pitches: [q.lower], duration: whole },
          { kind: 'note', pitches: [q.upper], duration: whole },
        ],
  };
}

export const intervals: ExercisePlugin<IntervalQuestion> = {
  id: 'intervals',
  title: 'Interval Identification',
  description: 'Name melodic and harmonic intervals by quality and number.',
  levels: {
    easy: 'Major and perfect intervals from a 2nd to an octave.',
    medium: 'Adds minor intervals and sharps or flats on either note.',
    hard: 'Adds augmented, diminished and compound intervals.',
  },
  settings: [
    CLEF_SETTING,
    {
      id: 'style',
      label: 'Written as',
      choices: [
        { value: 'both', label: 'Both' },
        { value: 'harmonic', label: 'Harmonic' },
        { value: 'melodic', label: 'Melodic' },
      ],
      defaultValue: 'both',
    },
  ],
  defaultCount: 9,
  maxCount: 30,
  columns: 3,

  instructions(difficulty: Difficulty) {
    switch (difficulty) {
      case 'easy':
        return 'Name each interval by quality and number, for example M3 or P5. Every interval is major or perfect.';
      case 'medium':
        return 'Name each interval by quality and number, for example m3, M6 or P5.';
      case 'hard':
        return 'Name each interval by quality and number. Use A for augmented and d for diminished, for example A4 or d5.';
    }
  },

  generate(context) {
    return generateVaried(
      context.count,
      () => makeQuestion(context),
      (q) =>
        `${q.clef}:${q.lower.letter}${q.lower.accidental}${q.lower.octave}:${intervalShortName(q.interval)}`,
    );
  },

  render(question) {
    return { notation: staff(question), responses: [{ kind: 'blank' }] };
  },

  renderAnswer(question) {
    return {
      notation: staff(question),
      responses: [{ kind: 'text', text: intervalShortName(question.interval) }],
    };
  },
};
