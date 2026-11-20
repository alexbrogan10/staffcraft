import {
  Accidental,
  BarNote,
  BarlineType,
  Beam,
  Dot,
  Formatter,
  Fraction,
  Renderer,
  Stave,
  StaveNote,
  Voice,
  VoiceMode,
  type Note,
} from 'vexflow/bravura';
import {
  beamGroupUnits,
  keyFromFifths,
  formatPitch,
  staffStep,
  TOP_LINE_STEP,
  UNITS_PER_WHOLE,
  type Accidental as AccidentalValue,
  type Pitch,
} from '../../domain';
import type {
  NotationRenderer,
  NoteElement,
  RenderedStaff,
  StaffRenderOptions,
  StaffSpec,
} from '../types';

const PRESENTATION_ATTRIBUTES = new Set([
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
]);

/** VexFlow draws with 10 px between staff lines. */
const VF_SPACE = 10;

const ACCIDENTAL_CODES: Readonly<Record<AccidentalValue, string>> = {
  [-2]: 'bb',
  [-1]: 'b',
  0: 'n',
  1: '#',
  2: '##',
};

function vexKey(p: Pitch): string {
  return `${p.letter.toLowerCase()}/${p.octave}`;
}

function vexDuration(note: NoteElement): string {
  return `${note.duration.value}${note.duration.dots ? 'd' : ''}${note.duration.rest ? 'r' : ''}`;
}

/** Staff spaces needed above and below the five lines for the notes in a spec. */
function verticalRoom(spec: StaffSpec): { above: number; below: number } {
  if (spec.clef === 'rhythm') return { above: 4.5, below: 2 };
  let above = 2.5;
  let below = 2.5;
  for (const el of spec.elements) {
    if (el.kind !== 'note' || el.duration.rest) continue;
    for (const p of el.pitches) {
      const step = staffStep(p, spec.clef);
      if (step > TOP_LINE_STEP) above = Math.max(above, (step - TOP_LINE_STEP) / 2 + 1.5);
      if (step < 0) below = Math.max(below, -step / 2 + 1.5);
    }
  }
  return { above, below };
}

/** The lowest staff step any note reaches, for reporting contentBottom. */
function lowestStep(spec: StaffSpec): number {
  let lowest = 0;
  if (spec.clef === 'rhythm') return lowest;
  for (const el of spec.elements) {
    if (el.kind !== 'note' || el.duration.rest) continue;
    for (const p of el.pitches) lowest = Math.min(lowest, staffStep(p, spec.clef));
  }
  return lowest;
}

function makeNote(el: NoteElement, spec: StaffSpec): StaveNote {
  const rhythm = spec.clef === 'rhythm';
  const pitches = rhythm
    ? []
    : [...el.pitches].sort((a, b) => staffStep(a, 'treble') - staffStep(b, 'treble'));
  const keys = rhythm || el.duration.rest || pitches.length === 0 ? ['b/4'] : pitches.map(vexKey);
  const note = new StaveNote({
    keys,
    duration: vexDuration(el),
    clef: rhythm ? 'percussion' : spec.clef,
    ...(rhythm ? { stem_direction: 1 } : { auto_stem: true }),
  });
  if (!rhythm && !el.duration.rest) {
    pitches.forEach((p, i) => {
      if (p.accidental !== 0) note.addModifier(new Accidental(ACCIDENTAL_CODES[p.accidental]), i);
    });
  }
  if (el.duration.dots) Dot.buildAndAttach([note], { all: true });
  return note;
}

/** Removes VexFlow's auto-generated ids so output is deterministic and ids never collide. */
function cleanMarkup(markup: string): string {
  return markup.replace(/\s(id|class)="[^"]*"/g, '');
}

/**
 * Renders staves with VexFlow 4. Requires a DOM (`document`), which exists in the
 * browser and in tests using the jsdom environment.
 */
export class VexFlowRenderer implements NotationRenderer {
  renderStaff(spec: StaffSpec, options: StaffRenderOptions): RenderedStaff {
    const scale = options.staffSpace / VF_SPACE;
    const vfWidth = options.width / scale;
    const room = verticalRoom(spec);
    const vfHeight = (room.above + 4 + room.below) * VF_SPACE;

    const host = document.createElement('div');
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(vfWidth, vfHeight);
    const context = renderer.getContext();

    const stave = new Stave(0, 0, vfWidth - 1, {
      space_above_staff_ln: room.above,
      space_below_staff_ln: room.below,
    });
    if (spec.clef === 'rhythm') {
      stave.setConfigForLines([0, 1, 2, 3, 4].map((i) => ({ visible: i === 2 })));
      stave.setBegBarType(BarlineType.NONE);
    } else {
      stave.addClef(spec.clef);
    }
    if (spec.keySignature !== undefined) {
      const tonic = keyFromFifths(spec.keySignature, 'major').tonic;
      stave.addKeySignature(formatPitch(tonic, { style: 'ascii' }));
    }
    if (spec.timeSignature) {
      stave.addTimeSignature(`${spec.timeSignature.beats}/${spec.timeSignature.beatValue}`);
    }
    if (spec.endBarline) stave.setEndBarType(BarlineType.END);
    stave.setContext(context).draw();

    const tickables: Note[] = [];
    const notes: StaveNote[] = [];
    let group: StaveNote[] = [];
    const beamGroups: StaveNote[][] = [];
    for (const el of spec.elements) {
      if (el.kind === 'barline') {
        tickables.push(new BarNote(BarlineType.SINGLE));
        beamGroups.push(group);
        group = [];
        continue;
      }
      const note = makeNote(el, spec);
      tickables.push(note);
      notes.push(note);
      group.push(note);
    }
    beamGroups.push(group);

    const beams: Beam[] = [];
    if (spec.timeSignature) {
      const units = beamGroupUnits(spec.timeSignature);
      const groups = [new Fraction(units, UNITS_PER_WHOLE)];
      for (const measure of beamGroups) {
        beams.push(
          ...Beam.generateBeams(measure, {
            groups,
            beam_rests: false,
            maintain_stem_directions: spec.clef === 'rhythm',
          }),
        );
      }
    }

    if (tickables.length > 0) {
      const voice = new Voice().setMode(VoiceMode.SOFT).addTickables(tickables);
      // Attach notes to the stave first so their absolute positions include the clef.
      tickables.forEach((t) => t.setStave(stave));
      new Formatter().joinVoices([voice]).formatToStave([voice], stave);
      const only = notes[0];
      if (only && tickables.length === 1) {
        // A lone note looks best centred in the space after the clef and signatures.
        // Moving its tick context moves the accidental along with the notehead.
        const center = (only.getNoteHeadBeginX() + only.getNoteHeadEndX()) / 2;
        const tickContext = only.getTickContext();
        tickContext.setX(
          tickContext.getX() + lerp(stave.getNoteStartX(), stave.getNoteEndX(), 0.5) - center,
        );
      }
      voice.draw(context, stave);
      beams.forEach((beam) => {
        beam.setContext(context).draw();
      });
    }

    const svg = host.querySelector('svg');
    if (!svg) throw new Error('VexFlow did not produce an SVG');
    // VexFlow puts default paint (stroke, fill, stroke-width) on the root <svg>; keep it.
    const inherited = Array.from(svg.attributes)
      .filter((a) => PRESENTATION_ATTRIBUTES.has(a.name))
      .map((a) => ` ${a.name}="${a.value}"`)
      .join('');
    const markup = `<g transform="scale(${round(scale)})"${inherited}>${cleanMarkup(svg.innerHTML)}</g>`;

    const staffTop = stave.getYForLine(0) * scale;
    const staffBottom = stave.getYForLine(4) * scale;
    const lowest = lowestStep(spec);
    // The lower edge of the lowest notehead below the staff, if any.
    const noteBottom = staffBottom + (lowest < 0 ? -lowest / 2 + 0.5 : 0) * options.staffSpace;
    // The treble clef's tail hangs below the bottom line.
    const clefBottom = staffBottom + (spec.clef === 'treble' ? 1.7 : 0) * options.staffSpace;
    return {
      markup,
      width: options.width,
      height: vfHeight * scale,
      staffTop,
      staffBottom,
      noteCenters: notes.map((n) => ((n.getNoteHeadBeginX() + n.getNoteHeadEndX()) / 2) * scale),
      contentBottom: Math.max(staffBottom, noteBottom, clefBottom),
    };
  }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
