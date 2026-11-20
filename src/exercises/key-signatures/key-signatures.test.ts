import { describe, expect, it } from 'vitest';
import { createRng } from '../../domain';
import type { Difficulty } from '../types';
import { keySignatures } from './index';

const generate = (difficulty: Difficulty, clef = 'treble', count = 200) =>
  keySignatures.generate({
    rng: createRng(`ks-${difficulty}`),
    difficulty,
    count,
    settings: { clef },
  });

describe('key signatures', () => {
  it.each([
    ['easy', 2],
    ['medium', 4],
    ['hard', 7],
  ] as const)('uses up to %s accidentals at %s', (difficulty, max) => {
    const fifths = new Set(generate(difficulty).map((q) => q.fifths));
    expect(Math.max(...fifths)).toBe(max);
    expect(Math.min(...fifths)).toBe(-max);
    expect(fifths.size).toBe(2 * max + 1);
  });

  it('asks only for the major key when easy', () => {
    const [q] = generate('easy', 'treble', 1);
    if (!q) throw new Error('no question');
    expect(keySignatures.render(q).responses).toEqual([{ kind: 'blank', label: 'Major' }]);
  });

  it('answers with the major and relative minor tonics', () => {
    expect(
      keySignatures.renderAnswer({ clef: 'bass', fifths: -3, includeMinor: true }).responses,
    ).toEqual([
      { kind: 'text', label: 'Major', text: 'E♭' },
      { kind: 'text', label: 'Minor', text: 'C' },
    ]);
    expect(
      keySignatures.renderAnswer({ clef: 'treble', fifths: 6, includeMinor: true }).responses,
    ).toEqual([
      { kind: 'text', label: 'Major', text: 'F♯' },
      { kind: 'text', label: 'Minor', text: 'D♯' },
    ]);
  });

  it('shows the signature with no notes', () => {
    const block = keySignatures.render({ clef: 'treble', fifths: 2, includeMinor: false });
    expect(block.notation).toEqual({ clef: 'treble', keySignature: 2, elements: [] });
  });

  it('does not repeat a key until the pool is used up', () => {
    const questions = generate('easy', 'treble', 5);
    expect(new Set(questions.map((q) => q.fifths)).size).toBe(5);
  });
});
