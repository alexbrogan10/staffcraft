import type { Clef, Duration, Pitch, TimeSignature } from '../domain';

/**
 * A plain-data description of one staff. Exercise plugins produce these; a
 * {@link NotationRenderer} turns them into SVG. Nothing here depends on VexFlow.
 */
export interface StaffSpec {
  /** 'rhythm' draws a single-line percussion staff for rhythm-only exercises. */
  readonly clef: Clef | 'rhythm';
  /** Sharps (positive) or flats (negative) in the key signature. */
  readonly keySignature?: number;
  readonly timeSignature?: TimeSignature;
  readonly elements: readonly StaffElement[];
  /** Draw a final (thin-thick) barline at the end. */
  readonly endBarline?: boolean;
}

export type StaffElement = NoteElement | BarlineElement;

export interface NoteElement {
  readonly kind: 'note';
  /** One pitch for a single note, several for a chord. Ignored for rests and rhythm staves. */
  readonly pitches: readonly Pitch[];
  readonly duration: Duration;
}

export interface BarlineElement {
  readonly kind: 'barline';
}

export interface StaffRenderOptions {
  /** Total width of the staff in output units (PDF points). */
  readonly width: number;
  /** Output units per staff space. */
  readonly staffSpace: number;
}

export interface RenderedStaff {
  /** SVG elements (no outer <svg>), drawn from (0, 0) in output units. */
  readonly markup: string;
  readonly width: number;
  readonly height: number;
  /** Y of the top and bottom staff lines. */
  readonly staffTop: number;
  readonly staffBottom: number;
  /** Horizontal centre of each note or rest, in element order (barlines excluded). */
  readonly noteCenters: readonly number[];
  /** Lowest point any glyph reaches (e.g. a ledger-line note), for placing text underneath. */
  readonly contentBottom: number;
}

export interface NotationRenderer {
  renderStaff(spec: StaffSpec, options: StaffRenderOptions): RenderedStaff;
}
