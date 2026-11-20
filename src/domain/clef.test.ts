import { describe, expect, it } from 'vitest';
import {
  isOnLine,
  ledgerLineCount,
  ledgerLinesForStep,
  naturalPitchesInRange,
  pitchAtStep,
  staffStep,
  stepRange,
} from './clef';
import { formatPitch, parsePitch } from './pitch';

const name = (text: string) => parsePitch(text);

describe('staffStep', () => {
  it('puts the line notes of the treble staff on even steps', () => {
    expect(['E4', 'G4', 'B4', 'D5', 'F5'].map((p) => staffStep(name(p), 'treble'))).toEqual([
      0, 2, 4, 6, 8,
    ]);
  });

  it('puts the line notes of the bass staff on even steps', () => {
    expect(['G2', 'B2', 'D3', 'F3', 'A3'].map((p) => staffStep(name(p), 'bass'))).toEqual([
      0, 2, 4, 6, 8,
    ]);
  });

  it('ignores accidentals', () => {
    expect(staffStep(name('F#4'), 'treble')).toBe(staffStep(name('Fb4'), 'treble'));
  });

  it('is inverted by pitchAtStep', () => {
    for (let step = -8; step <= 16; step++) {
      expect(staffStep(pitchAtStep(step, 'bass'), 'bass')).toBe(step);
    }
    expect(formatPitch(pitchAtStep(1, 'treble'), { octave: true })).toBe('F4');
  });

  it('reports lines and spaces', () => {
    expect(isOnLine(0)).toBe(true);
    expect(isOnLine(-2)).toBe(true);
    expect(isOnLine(3)).toBe(false);
    expect(isOnLine(-1)).toBe(false);
  });
});

describe('ledger lines', () => {
  it.each([
    ['D4', 'treble', 0],
    ['C4', 'treble', 1],
    ['B3', 'treble', 1],
    ['A3', 'treble', 2],
    ['G5', 'treble', 0],
    ['A5', 'treble', 1],
    ['C6', 'treble', 2],
    ['C4', 'bass', 1],
    ['B3', 'bass', 0],
    ['E2', 'bass', 1],
  ] as const)('%s in %s clef needs %i', (p, clef, expected) => {
    expect(ledgerLineCount(name(p), clef)).toBe(expected);
  });

  it('matches stepRange limits', () => {
    for (const max of [0, 1, 2, 3]) {
      const { min, max: top } = stepRange(max);
      expect(ledgerLinesForStep(min)).toBe(max);
      expect(ledgerLinesForStep(top)).toBe(max);
      expect(ledgerLinesForStep(min - 1)).toBe(max + 1);
      expect(ledgerLinesForStep(top + 1)).toBe(max + 1);
    }
  });

  it('rejects invalid ranges', () => {
    expect(() => stepRange(-1)).toThrow(RangeError);
  });

  it('lists natural pitches by ledger-line range', () => {
    const onStaff = naturalPitchesInRange('treble', 0).map((p) => formatPitch(p, { octave: true }));
    expect(onStaff).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5']);

    const ledgerOnly = naturalPitchesInRange('treble', 1, 1).map((p) =>
      formatPitch(p, { octave: true }),
    );
    expect(ledgerOnly).toEqual(['B3', 'C4', 'A5', 'B5']);
  });
});
