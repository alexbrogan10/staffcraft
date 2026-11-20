// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { duration, parsePitch } from '../../domain';
import type { StaffSpec } from '../types';
import { VexFlowRenderer } from './VexFlowRenderer';

const renderer = new VexFlowRenderer();
const options = { width: 160, staffSpace: 6 };

const single = (pitch: string, clef: 'treble' | 'bass' = 'treble'): StaffSpec => ({
  clef,
  elements: [{ kind: 'note', pitches: [parsePitch(pitch)], duration: duration('w') }],
});

describe('VexFlowRenderer', () => {
  it('draws glyphs as paths, never as font text', () => {
    const out = renderer.renderStaff(
      { ...single('F#4'), keySignature: -3, timeSignature: { beats: 3, beatValue: 4 } },
      options,
    );
    expect(out.markup).toContain('<path');
    expect(out.markup).not.toContain('<text');
  });

  it('is deterministic and free of generated ids', () => {
    const a = renderer.renderStaff(single('C4'), options);
    const b = renderer.renderStaff(single('C4'), options);
    expect(a.markup).toBe(b.markup);
    expect(a.markup).not.toMatch(/\sid=/);
  });

  it('reports staff geometry in output units', () => {
    const out = renderer.renderStaff(single('G4'), options);
    expect(out.width).toBe(160);
    expect(out.staffBottom - out.staffTop).toBeCloseTo(4 * options.staffSpace);
    expect(out.height).toBeGreaterThan(out.staffBottom);
    expect(out.noteCenters).toHaveLength(1);
  });

  it('centres a lone note in the staff', () => {
    const out = renderer.renderStaff(single('G4'), options);
    const center = out.noteCenters[0] ?? 0;
    expect(center).toBeGreaterThan(160 * 0.4);
    expect(center).toBeLessThan(160 * 0.8);
  });

  it('reports the treble clef tail and low notes in contentBottom', () => {
    const treble = renderer.renderStaff(single('G4'), options);
    const bass = renderer.renderStaff(single('D3', 'bass'), options);
    expect(treble.contentBottom).toBeGreaterThan(treble.staffBottom + options.staffSpace);
    expect(bass.contentBottom).toBe(bass.staffBottom);
    const low = renderer.renderStaff(single('E2', 'bass'), options);
    expect(low.contentBottom).toBeCloseTo(low.staffBottom + 1.5 * options.staffSpace);
  });

  it('grows vertically for ledger lines', () => {
    const plain = renderer.renderStaff(single('G4'), options);
    const low = renderer.renderStaff(single('A3'), options);
    const high = renderer.renderStaff(single('C6'), options);
    expect(low.height).toBeGreaterThan(plain.height);
    expect(low.contentBottom).toBeGreaterThan(low.staffBottom);
    expect(high.staffTop).toBeGreaterThan(plain.staffTop);
  });

  it('renders chords, rhythm staves, barlines and rests', () => {
    const out = renderer.renderStaff(
      {
        clef: 'rhythm',
        timeSignature: { beats: 4, beatValue: 4 },
        endBarline: true,
        elements: [
          { kind: 'note', pitches: [], duration: duration('q') },
          { kind: 'note', pitches: [], duration: duration('8') },
          { kind: 'note', pitches: [], duration: duration('8') },
          { kind: 'note', pitches: [], duration: duration('q', { rest: true }) },
          { kind: 'note', pitches: [], duration: duration('q') },
          { kind: 'barline' },
          { kind: 'note', pitches: [], duration: duration('h', { dots: 1 }) },
          { kind: 'note', pitches: [], duration: duration('q') },
        ],
      },
      { width: 400, staffSpace: 6 },
    );
    expect(out.noteCenters).toHaveLength(7);
    const sorted = [...out.noteCenters].sort((a, b) => a - b);
    expect(out.noteCenters).toEqual(sorted);

    const chord = renderer.renderStaff(
      {
        clef: 'bass',
        elements: [
          {
            kind: 'note',
            pitches: [parsePitch('E3'), parsePitch('C3')],
            duration: duration('w'),
          },
        ],
      },
      options,
    );
    expect(chord.noteCenters).toHaveLength(1);
  });
});
