import { describe, expect, it } from 'vitest';
import {
  chroma,
  comparePitch,
  diatonicIndex,
  formatPitch,
  isEnharmonic,
  midi,
  parsePitch,
  pitch,
  pitchFromDiatonicIndex,
} from './pitch';

describe('midi', () => {
  it.each([
    ['C4', 60],
    ['A4', 69],
    ['C#4', 61],
    ['Db4', 61],
    ['B#3', 60],
    ['Cb4', 59],
    ['Fx4', 67],
    ['Ebb4', 62],
    ['A0', 21],
    ['C8', 108],
  ])('%s → %i', (text, expected) => {
    expect(midi(parsePitch(text))).toBe(expected);
  });
});

describe('parsePitch', () => {
  it('parses unicode and ascii accidentals', () => {
    expect(parsePitch('E♭3')).toEqual(pitch('E', -1, 3));
    expect(parsePitch('f#5')).toEqual(pitch('F', 1, 5));
    expect(parsePitch('G##2')).toEqual(pitch('G', 2, 2));
    expect(parsePitch('Bbb1')).toEqual(pitch('B', -2, 1));
  });

  it.each(['H4', 'C', '4', 'C#', 'Cbbb4', ''])('rejects %j', (text) => {
    expect(() => parsePitch(text)).toThrow(/Invalid/);
  });
});

describe('formatPitch', () => {
  it('formats with unicode by default and optional octave', () => {
    expect(formatPitch(pitch('E', -1, 3))).toBe('E♭');
    expect(formatPitch(pitch('F', 1, 5), { octave: true })).toBe('F♯5');
    expect(formatPitch(pitch('B', -2, 2), { style: 'ascii', octave: true })).toBe('Bbb2');
  });

  it('round-trips through parsePitch', () => {
    for (const text of ['C4', 'Bb3', 'F#5', 'Ebb2', 'Gx4']) {
      expect(formatPitch(parsePitch(text), { octave: true, style: 'ascii' })).toBe(text);
    }
  });
});

describe('diatonic index', () => {
  it('counts letter steps from C0', () => {
    expect(diatonicIndex(pitch('C', 0, 4))).toBe(28);
    expect(diatonicIndex(pitch('B', 0, 3))).toBe(27);
  });

  it('is inverted by pitchFromDiatonicIndex', () => {
    for (let i = 0; i < 60; i++) expect(diatonicIndex(pitchFromDiatonicIndex(i))).toBe(i);
  });
});

describe('comparisons', () => {
  it('chroma wraps around the octave', () => {
    expect(chroma({ letter: 'C', accidental: -1 })).toBe(11);
    expect(chroma({ letter: 'B', accidental: 1 })).toBe(0);
  });

  it('detects enharmonics', () => {
    expect(isEnharmonic(parsePitch('G#4'), parsePitch('Ab4'))).toBe(true);
    expect(isEnharmonic(parsePitch('G#4'), parsePitch('Ab5'))).toBe(false);
  });

  it('orders by staff position before pitch', () => {
    expect(comparePitch(parsePitch('B#3'), parsePitch('Cb4'))).toBeLessThan(0);
    expect(comparePitch(parsePitch('C4'), parsePitch('C#4'))).toBeLessThan(0);
  });
});
