import { describe, expect, it } from 'vitest';
import { createRng, duration, durationUnits, measureUnits, splitIntoMeasures } from '../../domain';
import type { Difficulty } from '../types';
import { rhythmAnswers, rhythmCounting, type RhythmQuestion } from './index';

const generate = (difficulty: Difficulty, count = 150) =>
  rhythmCounting.generate({ rng: createRng(`rc-${difficulty}`), difficulty, count, settings: {} });

const meters = (qs: RhythmQuestion[]) =>
  new Set(qs.map((q) => `${q.timeSignature.beats}/${q.timeSignature.beatValue}`));
const values = (qs: RhythmQuestion[]) =>
  new Set(
    qs.flatMap((q) => q.rhythm.map((d) => `${d.value}${d.dots ? '.' : ''}${d.rest ? 'r' : ''}`)),
  );

describe('rhythm counting', () => {
  it('always fills two complete measures', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (const q of generate(difficulty)) {
        const measures = splitIntoMeasures(q.rhythm, q.timeSignature);
        expect(measures).toHaveLength(2);
        for (const m of measures) {
          expect(m.reduce((s, d) => s + durationUnits(d), 0)).toBe(measureUnits(q.timeSignature));
          expect(m.some((d) => !d.rest)).toBe(true);
          expect(m.length).toBeLessThanOrEqual(10);
          expect(m.length).toBeGreaterThanOrEqual({ easy: 1, medium: 2, hard: 3 }[difficulty]);
        }
      }
    }
  });

  it('uses whole, half and quarter notes in 4/4 when easy', () => {
    const qs = generate('easy');
    expect(meters(qs)).toEqual(new Set(['4/4']));
    expect(values(qs)).toEqual(new Set(['w', 'h', 'q']));
  });

  it('adds eighths, dots, quarter rests and 3/4 at medium', () => {
    const qs = generate('medium');
    expect(meters(qs)).toEqual(new Set(['4/4', '3/4']));
    for (const v of ['8', 'q.', 'qr', 'h.']) expect(values(qs)).toContain(v);
    expect(values(qs)).not.toContain('16');
  });

  it('adds sixteenths, eighth rests, 2/4 and 6/8 when hard', () => {
    const qs = generate('hard');
    expect(meters(qs)).toEqual(new Set(['4/4', '3/4', '2/4', '6/8']));
    for (const v of ['16', '8.', '8r']) expect(values(qs)).toContain(v);
  });

  it('keeps half notes on strong beats in 4/4', () => {
    for (const q of generate('easy')) {
      let position = 0;
      for (const d of q.rhythm) {
        if (d.value === 'h' && !d.dots) expect(position % 16).toBe(0);
        position = (position + durationUnits(d)) % 32;
      }
    }
  });

  it('counts notes and puts rest counts in parentheses', () => {
    const q: RhythmQuestion = {
      timeSignature: { beats: 4, beatValue: 4 },
      rhythm: [
        duration('q'),
        duration('8'),
        duration('8'),
        duration('q', { rest: true }),
        duration('q'),
        duration('h'),
        duration('q', { dots: 1 }),
        duration('8'),
      ],
    };
    expect(rhythmAnswers(q)).toEqual(['1', '2', '&', '(3)', '4', '1', '3', '&']);
  });

  it('puts a barline between measures and a final barline at the end', () => {
    const [q] = generate('medium', 1);
    if (!q) throw new Error('no question');
    const spec = rhythmCounting.render(q).notation;
    expect(spec?.elements.filter((e) => e.kind === 'barline')).toHaveLength(1);
    expect(spec?.endBarline).toBe(true);
    expect(rhythmCounting.renderAnswer(q).responses[0]).toEqual({
      kind: 'under-notes',
      answers: rhythmAnswers(q),
    });
  });
});
