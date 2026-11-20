import { describe, expect, it } from 'vitest';
import {
  createRng,
  intervalBetween,
  intervalShortName,
  isCompound,
  ledgerLineCount,
} from '../../domain';
import type { Difficulty } from '../types';
import { intervals } from './index';

const generate = (difficulty: Difficulty, settings = {}, count = 300) =>
  intervals.generate({ rng: createRng(`iv-${difficulty}`), difficulty, count, settings });

const qualities = (difficulty: Difficulty) =>
  new Set(generate(difficulty).map((q) => q.interval.quality));

describe('intervals', () => {
  it('spells the notes so they form the stated interval', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (const q of generate(difficulty)) {
        expect(intervalBetween(q.lower, q.upper)).toEqual(q.interval);
        expect(Math.abs(q.lower.accidental)).toBeLessThanOrEqual(1);
        expect(Math.abs(q.upper.accidental)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('uses only natural notes and major or perfect intervals when easy', () => {
    expect(qualities('easy')).toEqual(new Set(['M', 'P']));
    for (const q of generate('easy')) {
      expect(q.lower.accidental).toBe(0);
      expect(q.upper.accidental).toBe(0);
      expect(q.interval.number).toBeGreaterThanOrEqual(2);
      expect(q.interval.number).toBeLessThanOrEqual(8);
    }
  });

  it('adds minor intervals at medium and altered and compound ones when hard', () => {
    expect(qualities('medium')).toEqual(new Set(['M', 'P', 'm']));
    expect(qualities('hard')).toEqual(new Set(['M', 'P', 'm', 'A', 'd']));
    expect(generate('hard').some((q) => isCompound(q.interval))).toBe(true);
    expect(generate('medium').some((q) => isCompound(q.interval))).toBe(false);
  });

  it('respects ledger-line limits', () => {
    for (const [difficulty, limit] of [
      ['easy', 1],
      ['medium', 1],
      ['hard', 2],
    ] as const) {
      for (const q of generate(difficulty, { clef: 'both' })) {
        expect(ledgerLineCount(q.lower, q.clef)).toBeLessThanOrEqual(limit);
        expect(ledgerLineCount(q.upper, q.clef)).toBeLessThanOrEqual(limit);
      }
    }
  });

  it('writes intervals harmonically, melodically or both', () => {
    expect(generate('easy', { style: 'harmonic' }).every((q) => q.harmonic)).toBe(true);
    expect(generate('easy', { style: 'melodic' }).every((q) => !q.harmonic)).toBe(true);
    expect(new Set(generate('easy', { style: 'both' }).map((q) => q.harmonic)).size).toBe(2);
  });

  it('draws harmonic intervals as one chord and melodic ones as two notes', () => {
    const [q] = generate('medium', { style: 'harmonic' }, 1);
    if (!q) throw new Error('no question');
    expect(intervals.render(q).notation?.elements).toHaveLength(1);
    expect(intervals.render({ ...q, harmonic: false }).notation?.elements).toHaveLength(2);
    expect(intervals.renderAnswer(q).responses).toEqual([
      { kind: 'text', text: intervalShortName(q.interval) },
    ]);
  });
});
