import { describe, expect, it } from 'vitest';
import { createRng, ledgerLineCount } from '../../domain';
import type { Difficulty } from '../types';
import { noteNaming, type NoteNamingQuestion } from './index';

const generate = (difficulty: Difficulty, clef = 'treble', count = 200, seed = 'nn') =>
  noteNaming.generate({ rng: createRng(seed), difficulty, count, settings: { clef } });

const ledgers = (q: NoteNamingQuestion) => ledgerLineCount(q.pitch, q.clef);

describe('note naming', () => {
  it('uses only natural notes on the staff when easy', () => {
    for (const q of generate('easy')) {
      expect(q.pitch.accidental).toBe(0);
      expect(ledgers(q)).toBe(0);
      expect(q.clef).toBe('treble');
    }
  });

  it('adds sharps and flats at medium, still without ledger lines', () => {
    const questions = generate('medium', 'bass');
    expect(questions.every((q) => ledgers(q) === 0 && q.clef === 'bass')).toBe(true);
    const accidentals = new Set(questions.map((q) => q.pitch.accidental));
    expect(accidentals).toEqual(new Set([-1, 0, 1]));
  });

  it('uses up to three ledger lines when hard', () => {
    const questions = generate('hard', 'both');
    const counts = questions.map(ledgers);
    expect(Math.max(...counts)).toBe(3);
    expect(counts.filter((n) => n > 0).length).toBeGreaterThan(questions.length * 0.4);
    expect(new Set(questions.map((q) => q.clef))).toEqual(new Set(['treble', 'bass']));
  });

  it('never asks for E♯, F♭, B♯ or C♭', () => {
    for (const difficulty of ['medium', 'hard'] as const) {
      for (const q of generate(difficulty, 'both', 400)) {
        const name = `${q.pitch.letter}${q.pitch.accidental}`;
        expect(['E1', 'F-1', 'B1', 'C-1']).not.toContain(name);
      }
    }
  });

  it('answers with the spelled note name', () => {
    const answer = noteNaming.renderAnswer({
      clef: 'treble',
      pitch: { letter: 'B', accidental: -1, octave: 4 },
    });
    expect(answer.responses).toEqual([{ kind: 'text', text: 'B♭' }]);
  });

  it('varies questions within a worksheet', () => {
    const questions = generate('easy', 'treble', 11);
    const names = questions.map((q) => `${q.pitch.letter}${q.pitch.octave}`);
    expect(new Set(names).size).toBe(11);
  });
});
