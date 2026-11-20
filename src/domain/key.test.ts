import { describe, expect, it } from 'vitest';
import {
  accidentalInKey,
  allKeys,
  describeSignature,
  fifthsOf,
  keyFromFifths,
  keyName,
  keySignatureAccidentals,
  relativeKey,
  relativeMinorTonic,
  scaleOf,
} from './key';
import { formatPitch } from './pitch';

describe('keyFromFifths', () => {
  it('names all major keys from 7 flats to 7 sharps', () => {
    expect(allKeys('major').map((k) => keyName(k, 'ascii'))).toEqual(
      ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'].map(
        (t) => `${t} major`,
      ),
    );
  });

  it('names all minor keys from 7 flats to 7 sharps', () => {
    expect(allKeys('minor').map((k) => keyName(k, 'ascii'))).toEqual(
      ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'].map(
        (t) => `${t} minor`,
      ),
    );
  });

  it('is inverted by fifthsOf', () => {
    for (const mode of ['major', 'minor'] as const) {
      for (let f = -7; f <= 7; f++) expect(fifthsOf(keyFromFifths(f, mode))).toBe(f);
    }
  });

  it('rejects out-of-range signatures', () => {
    expect(() => keyFromFifths(8, 'major')).toThrow(RangeError);
    expect(() => fifthsOf({ tonic: { letter: 'G', accidental: 1 }, mode: 'major' })).toThrow(
      RangeError,
    );
  });
});

describe('key signatures', () => {
  it('lists sharps and flats in written order', () => {
    expect(keySignatureAccidentals(4).map((p) => formatPitch(p, { style: 'ascii' }))).toEqual([
      'F#',
      'C#',
      'G#',
      'D#',
    ]);
    expect(keySignatureAccidentals(-3).map((p) => formatPitch(p, { style: 'ascii' }))).toEqual([
      'Bb',
      'Eb',
      'Ab',
    ]);
    expect(keySignatureAccidentals(0)).toEqual([]);
  });

  it('applies the signature to letters', () => {
    expect(accidentalInKey('B', -1)).toBe(-1);
    expect(accidentalInKey('E', -1)).toBe(0);
    expect(accidentalInKey('F', 1)).toBe(1);
  });

  it('describes signatures', () => {
    expect(describeSignature(0)).toBe('no sharps or flats');
    expect(describeSignature(1)).toBe('1 sharp');
    expect(describeSignature(-5)).toBe('5 flats');
  });
});

describe('relative keys and scales', () => {
  it('finds relative keys', () => {
    const eFlat = keyFromFifths(-3, 'major');
    expect(keyName(relativeKey(eFlat))).toBe('C minor');
    expect(keyName(relativeKey(relativeKey(eFlat)))).toBe('E♭ major');
    expect(formatPitch(relativeMinorTonic({ letter: 'A', accidental: 0 }))).toBe('F♯');
  });

  it('spells scales from the key signature', () => {
    const fmt = (f: number, mode: 'major' | 'minor') =>
      scaleOf(keyFromFifths(f, mode))
        .map((p) => formatPitch(p, { style: 'ascii' }))
        .join(' ');
    expect(fmt(2, 'major')).toBe('D E F# G A B C#');
    expect(fmt(-1, 'minor')).toBe('D E F G A Bb C');
  });
});
