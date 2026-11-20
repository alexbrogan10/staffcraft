import {
  countRhythm,
  duration,
  durationUnits,
  isCompoundMeter,
  measureUnits,
  beamGroupUnits,
  type Duration,
  type DurationValue,
  type Rng,
  type TimeSignature,
} from '../../domain';
import type { StaffElement, StaffSpec } from '../../notation';
import { generateVaried } from '../shared';
import type { Difficulty, ExercisePlugin, GenerateContext } from '../types';

export interface RhythmQuestion {
  readonly timeSignature: TimeSignature;
  /** Notes and rests across all measures; every measure is exactly full. */
  readonly rhythm: readonly Duration[];
}

/**
 * A rhythmic figure that fills one or more whole beats (dotted-quarter beats in 6/8),
 * so figures never straddle a beat and beaming stays conventional.
 */
interface Cell {
  readonly notes: readonly Duration[];
  readonly weight: number;
  /** Only start on a beat that is a multiple of this (e.g. half notes on 1 or 3). */
  readonly alignBeats?: number;
}

const n = (value: DurationValue, dots: 0 | 1 = 0): Duration => duration(value, { dots });
const r = (value: DurationValue, dots: 0 | 1 = 0): Duration =>
  duration(value, { dots, rest: true });

const cell = (notes: Duration[], weight: number, alignBeats?: number): Cell =>
  alignBeats === undefined ? { notes, weight } : { notes, weight, alignBeats };

/** Cells for meters counted in quarter notes, by difficulty. */
const SIMPLE_CELLS: Readonly<Record<Difficulty, readonly Cell[]>> = {
  easy: [cell([n('q')], 5), cell([n('h')], 3, 2), cell([n('w')], 1, 4)],
  medium: [
    cell([n('q')], 4),
    cell([n('8'), n('8')], 4),
    cell([n('h')], 2, 2),
    cell([r('q')], 1.5),
    cell([n('q', 1), n('8')], 2, 2),
    cell([n('h', 1)], 1, 4),
  ],
  hard: [
    cell([n('q')], 2),
    cell([n('8'), n('8')], 3),
    cell([n('16'), n('16'), n('16'), n('16')], 2),
    cell([n('8'), n('16'), n('16')], 2),
    cell([n('16'), n('16'), n('8')], 2),
    cell([n('8', 1), n('16')], 2),
    cell([r('8'), n('8')], 1.5),
    cell([r('q')], 1),
    cell([n('q', 1), n('8')], 1.5, 2),
    cell([n('h')], 1, 2),
  ],
};

/** Cells for 6/8, each filling one or two dotted-quarter beats. */
const COMPOUND_CELLS: readonly Cell[] = [
  cell([n('8'), n('8'), n('8')], 4),
  cell([n('q'), n('8')], 3),
  cell([n('q', 1)], 2),
  cell([n('16'), n('16'), n('8'), n('8')], 2),
  cell([n('8'), n('8'), n('16'), n('16')], 1.5),
  cell([r('8'), n('8'), n('8')], 1.5),
  cell([n('h', 1)], 1, 2),
];

const METERS: Readonly<Record<Difficulty, readonly TimeSignature[]>> = {
  easy: [{ beats: 4, beatValue: 4 }],
  medium: [
    { beats: 4, beatValue: 4 },
    { beats: 3, beatValue: 4 },
  ],
  hard: [
    { beats: 4, beatValue: 4 },
    { beats: 3, beatValue: 4 },
    { beats: 2, beatValue: 4 },
    { beats: 6, beatValue: 8 },
  ],
};

const MEASURES = 2;
/** Harder levels need busier measures; two dotted halves are not a hard rhythm. */
const MIN_NOTES_PER_MEASURE: Readonly<Record<Difficulty, number>> = { easy: 1, medium: 2, hard: 3 };
/** Keeps notes far enough apart to write a count under each one. */
const MAX_NOTES_PER_MEASURE = 10;

function cellUnits(c: Cell): number {
  return c.notes.reduce((sum, d) => sum + durationUnits(d), 0);
}

function fillMeasure(
  rng: Rng,
  ts: TimeSignature,
  cells: readonly Cell[],
  minNotes: number,
): Duration[] {
  const beat = beamGroupUnits(ts);
  const total = measureUnits(ts);
  for (;;) {
    const notes: Duration[] = [];
    let position = 0;
    while (position < total) {
      const beatIndex = position / beat;
      const options = cells.filter(
        (c) =>
          position + cellUnits(c) <= total &&
          (c.alignBeats === undefined || beatIndex % c.alignBeats === 0),
      );
      const chosen = rng.weighted(options.map((c) => [c, c.weight] as const));
      notes.push(...chosen.notes);
      position += cellUnits(chosen);
    }
    // A measure of only rests teaches nothing.
    const hasNote = notes.some((d) => !d.rest);
    if (hasNote && notes.length >= minNotes && notes.length <= MAX_NOTES_PER_MEASURE) return notes;
  }
}

function makeQuestion({ rng, difficulty }: GenerateContext): RhythmQuestion {
  const timeSignature = rng.pick(METERS[difficulty]);
  const cells = isCompoundMeter(timeSignature) ? COMPOUND_CELLS : SIMPLE_CELLS[difficulty];
  const rhythm: Duration[] = [];
  const minNotes = MIN_NOTES_PER_MEASURE[difficulty];
  for (let m = 0; m < MEASURES; m++) {
    rhythm.push(...fillMeasure(rng, timeSignature, cells, minNotes));
  }
  return { timeSignature, rhythm };
}

function staff(q: RhythmQuestion): StaffSpec {
  const elements: StaffElement[] = [];
  const counted = countRhythm(q.rhythm, q.timeSignature);
  counted.forEach((note, i) => {
    if (i > 0 && note.measure !== counted[i - 1]?.measure) elements.push({ kind: 'barline' });
    elements.push({ kind: 'note', pitches: [], duration: note.duration });
  });
  return { clef: 'rhythm', timeSignature: q.timeSignature, elements, endBarline: true };
}

/** The count written under each note; rests are shown in parentheses. */
export function rhythmAnswers(q: RhythmQuestion): string[] {
  return countRhythm(q.rhythm, q.timeSignature).map((note) =>
    note.duration.rest ? `(${note.count})` : note.count,
  );
}

const key = (q: RhythmQuestion) =>
  `${q.timeSignature.beats}/${q.timeSignature.beatValue}:` +
  q.rhythm.map((d) => `${d.value}${d.dots ? '.' : ''}${d.rest ? 'r' : ''}`).join(' ');

export const rhythmCounting: ExercisePlugin<RhythmQuestion> = {
  id: 'rhythm-counting',
  title: 'Rhythm Counting',
  description: 'Write the counts (1 e & a) under each note and rest.',
  levels: {
    easy: 'Whole, half and quarter notes in 4/4.',
    medium: 'Adds eighth notes, dotted notes, quarter rests and 3/4.',
    hard: 'Adds sixteenth notes, eighth rests, 2/4 and 6/8.',
  },
  settings: [],
  defaultCount: 4,
  maxCount: 12,
  columns: 1,

  instructions(difficulty) {
    const base = 'Write the counts under each note. Put the counts for rests in parentheses.';
    if (difficulty === 'easy') return 'Write the beat number under each note.';
    if (difficulty === 'medium') return `${base} Use “&” for the second half of a beat.`;
    return `${base} Use “1 e & a” for sixteenths. In 6/8, give each eighth note its own number.`;
  },

  generate(context) {
    return generateVaried(context.count, () => makeQuestion(context), key);
  },

  render(question) {
    return { notation: staff(question), responses: [{ kind: 'under-notes' }] };
  },

  renderAnswer(question) {
    return {
      notation: staff(question),
      responses: [{ kind: 'under-notes', answers: rhythmAnswers(question) }],
    };
  },
};
