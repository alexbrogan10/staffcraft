import { describe, expect, it } from 'vitest';
import {
  beamGroupUnits,
  countAt,
  countRhythm,
  duration,
  durationName,
  durationUnits,
  isCompoundMeter,
  measureUnits,
  splitIntoMeasures,
  type TimeSignature,
} from './duration';

const FOUR_FOUR: TimeSignature = { beats: 4, beatValue: 4 };
const SIX_EIGHT: TimeSignature = { beats: 6, beatValue: 8 };
const q = duration('q');
const h = duration('h');
const e = duration('8');
const s = duration('16');
const dq = duration('q', { dots: 1 });

describe('durations', () => {
  it('measures values in thirty-second units', () => {
    expect([duration('w'), h, q, e, s].map(durationUnits)).toEqual([32, 16, 8, 4, 2]);
    expect(durationUnits(dq)).toBe(12);
    expect(durationUnits(duration('8', { dots: 1 }))).toBe(6);
  });

  it('names durations', () => {
    expect(durationName(dq)).toBe('dotted quarter note');
    expect(durationName(duration('8', { rest: true }))).toBe('eighth rest');
  });
});

describe('time signatures', () => {
  it('computes measure lengths', () => {
    expect(measureUnits(FOUR_FOUR)).toBe(32);
    expect(measureUnits({ beats: 3, beatValue: 4 })).toBe(24);
    expect(measureUnits(SIX_EIGHT)).toBe(24);
  });

  it('detects compound meter', () => {
    expect(isCompoundMeter(SIX_EIGHT)).toBe(true);
    expect(isCompoundMeter({ beats: 3, beatValue: 8 })).toBe(false);
    expect(isCompoundMeter(FOUR_FOUR)).toBe(false);
    expect(beamGroupUnits(SIX_EIGHT)).toBe(12);
    expect(beamGroupUnits(FOUR_FOUR)).toBe(8);
  });
});

describe('countAt', () => {
  it('uses 1 e & a in simple meter', () => {
    expect([0, 2, 4, 6, 8, 12, 30].map((p) => countAt(p, FOUR_FOUR))).toEqual([
      '1',
      'e',
      '&',
      'a',
      '2',
      '&',
      'a',
    ]);
  });

  it('counts each eighth in 6/8', () => {
    expect([0, 4, 8, 12, 20, 22].map((p) => countAt(p, SIX_EIGHT))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '6',
      '&',
    ]);
  });

  it('rejects positions outside the measure or between syllables', () => {
    expect(() => countAt(32, FOUR_FOUR)).toThrow(RangeError);
    expect(() => countAt(1, FOUR_FOUR)).toThrow();
  });
});

describe('countRhythm', () => {
  it('labels each note with its onset count', () => {
    const rhythm = [q, e, e, dq, e, h, s, s, e, q];
    // | q  e  e  q.  e | h  s  s  e  q |
    expect(countRhythm(rhythm, FOUR_FOUR).map((n) => n.count)).toEqual([
      '1',
      '2',
      '&',
      '3',
      '&',
      '1',
      '3',
      'e',
      '&',
      '4',
    ]);
  });

  it('restarts counting in each measure', () => {
    const counted = countRhythm([h, h, q, q, h], FOUR_FOUR);
    expect(counted.map((n) => `${n.measure}:${n.count}`)).toEqual([
      '0:1',
      '0:3',
      '1:1',
      '1:2',
      '1:3',
    ]);
  });

  it('rejects rhythms that do not fill measures exactly', () => {
    expect(() => splitIntoMeasures([h, dq, q], FOUR_FOUR)).toThrow(/barline/);
    expect(() => splitIntoMeasures([h, q], FOUR_FOUR)).toThrow(/incomplete/);
  });
});
