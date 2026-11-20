import { describe, expect, it } from 'vitest';
import {
  intervalBetween,
  intervalName,
  intervalShortName,
  isCompound,
  isValidInterval,
  ordinal,
  semitones,
  simpleNumber,
  transpose,
  type Interval,
} from './interval';
import { formatPitch, LETTERS, parsePitch, type Accidental, type Pitch } from './pitch';

const between = (a: string, b: string) =>
  intervalShortName(intervalBetween(parsePitch(a), parsePitch(b)));
const up = (p: string, i: Interval) =>
  formatPitch(transpose(parsePitch(p), i), { octave: true, style: 'ascii' });
const down = (p: string, i: Interval) =>
  formatPitch(transpose(parsePitch(p), i, 'down'), { octave: true, style: 'ascii' });

describe('intervalBetween', () => {
  it.each([
    ['C4', 'C4', 'P1'],
    ['C4', 'C#4', 'A1'],
    ['C4', 'D4', 'M2'],
    ['E4', 'F4', 'm2'],
    ['C4', 'Eb4', 'm3'],
    ['C4', 'E4', 'M3'],
    ['C4', 'F4', 'P4'],
    ['F4', 'B4', 'A4'],
    ['B4', 'F5', 'd5'],
    ['C4', 'G4', 'P5'],
    ['C4', 'G#4', 'A5'],
    ['C4', 'Ab4', 'm6'],
    ['C4', 'A4', 'M6'],
    ['C#4', 'Bb4', 'd7'],
    ['C4', 'B4', 'M7'],
    ['C4', 'C5', 'P8'],
    ['C4', 'E5', 'M10'],
    ['C4', 'G5', 'P12'],
    ['C4', 'C6', 'P15'],
    ['Cb4', 'F#4', 'AA4'],
  ])('%s → %s is %s', (a, b, expected) => {
    expect(between(a, b)).toBe(expected);
  });

  it('is symmetric', () => {
    expect(between('G4', 'C4')).toBe('P5');
  });

  it('spells enharmonic intervals differently', () => {
    expect(between('C4', 'D#4')).toBe('A2');
    expect(between('C4', 'Eb4')).toBe('m3');
  });
});

describe('transpose', () => {
  it('keeps correct spelling', () => {
    expect(up('C4', { quality: 'm', number: 3 })).toBe('Eb4');
    expect(up('D4', { quality: 'M', number: 3 })).toBe('F#4');
    expect(up('B3', { quality: 'm', number: 2 })).toBe('C4');
    expect(up('F4', { quality: 'A', number: 4 })).toBe('B4');
    expect(up('A4', { quality: 'P', number: 8 })).toBe('A5');
    expect(up('C4', { quality: 'M', number: 10 })).toBe('E5');
    expect(down('C4', { quality: 'm', number: 3 })).toBe('A3');
    expect(down('Eb4', { quality: 'P', number: 5 })).toBe('Ab3');
  });

  it('round-trips with intervalBetween for every simple interval from every note', () => {
    const intervals: Interval[] = [
      { quality: 'P', number: 1 },
      { quality: 'm', number: 2 },
      { quality: 'M', number: 2 },
      { quality: 'm', number: 3 },
      { quality: 'M', number: 3 },
      { quality: 'P', number: 4 },
      { quality: 'A', number: 4 },
      { quality: 'd', number: 5 },
      { quality: 'P', number: 5 },
      { quality: 'm', number: 6 },
      { quality: 'M', number: 6 },
      { quality: 'm', number: 7 },
      { quality: 'M', number: 7 },
      { quality: 'P', number: 8 },
    ];
    for (const letter of LETTERS) {
      for (const accidental of [-1, 0, 1] as Accidental[]) {
        const start: Pitch = { letter, accidental, octave: 4 };
        for (const interval of intervals) {
          const end = transpose(start, interval);
          expect(intervalBetween(start, end)).toEqual(interval);
          expect(transpose(end, interval, 'down')).toEqual(start);
        }
      }
    }
  });

  it('throws when the result needs a triple accidental', () => {
    expect(() => transpose(parsePitch('Fbb4'), { quality: 'd', number: 4 })).toThrow();
  });
});

describe('interval helpers', () => {
  it('computes semitones', () => {
    expect(semitones({ quality: 'P', number: 8 })).toBe(12);
    expect(semitones({ quality: 'd', number: 5 })).toBe(6);
    expect(semitones({ quality: 'A', number: 4 })).toBe(6);
    expect(semitones({ quality: 'M', number: 9 })).toBe(14);
  });

  it('validates quality against interval number', () => {
    expect(isValidInterval({ quality: 'M', number: 5 })).toBe(false);
    expect(isValidInterval({ quality: 'P', number: 3 })).toBe(false);
    expect(isValidInterval({ quality: 'd', number: 1 })).toBe(false);
    expect(isValidInterval({ quality: 'm', number: 0 })).toBe(false);
    expect(() => semitones({ quality: 'M', number: 4 })).toThrow();
  });

  it('reduces compound intervals', () => {
    expect(simpleNumber(10)).toBe(3);
    expect(simpleNumber(8)).toBe(1);
    expect(isCompound({ quality: 'P', number: 8 })).toBe(false);
    expect(isCompound({ quality: 'M', number: 9 })).toBe(true);
  });

  it('names intervals', () => {
    expect(intervalName({ quality: 'M', number: 3 })).toBe('Major 3rd');
    expect(intervalName({ quality: 'P', number: 1 })).toBe('Perfect unison');
    expect(intervalName({ quality: 'P', number: 8 })).toBe('Perfect octave');
    expect(intervalName({ quality: 'd', number: 5 })).toBe('Diminished 5th');
    expect(intervalName({ quality: 'm', number: 13 })).toBe('Minor 13th');
  });

  it('builds ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ]);
  });
});
