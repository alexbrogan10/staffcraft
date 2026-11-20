import { describe, expect, it } from 'vitest';
import { createRng } from '../domain';
import { EXERCISES } from './registry';
import { DIFFICULTIES, resolveSettings, type ExercisePlugin, type SettingValues } from './types';

/** Every combination of setting values a plugin offers. */
function settingCombinations(plugin: ExercisePlugin): SettingValues[] {
  let combos: Record<string, string>[] = [{}];
  for (const setting of plugin.settings) {
    combos = combos.flatMap((combo) =>
      setting.choices.map((choice) => ({ ...combo, [setting.id]: choice.value })),
    );
  }
  return combos;
}

/** Strips answer text so a question block and its answer block can be compared. */
function shape(block: ReturnType<ExercisePlugin['render']>) {
  return {
    notation: block.notation,
    prompt: block.prompt,
    responses: block.responses.map((r) =>
      r.kind === 'under-notes' ? 'under-notes' : `field:${r.label ?? ''}`,
    ),
  };
}

describe.each(EXERCISES.map((p) => [p.id, p] as const))('%s plugin contract', (_, plugin) => {
  it('has sane metadata', () => {
    expect(plugin.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    expect(plugin.title).not.toBe('');
    expect(plugin.columns).toBeGreaterThanOrEqual(1);
    expect(plugin.defaultCount).toBeGreaterThan(0);
    expect(plugin.maxCount).toBeGreaterThanOrEqual(plugin.defaultCount);
    for (const difficulty of DIFFICULTIES) expect(plugin.levels[difficulty]).not.toBe('');
    for (const setting of plugin.settings) {
      expect(setting.choices.map((c) => c.value)).toContain(setting.defaultValue);
    }
  });

  for (const difficulty of DIFFICULTIES) {
    for (const settings of settingCombinations(plugin)) {
      const label = `${difficulty} ${JSON.stringify(settings)}`;
      const generate = (seed: string, count = 24) =>
        plugin.generate({ rng: createRng(seed), difficulty, count, settings });

      it(`generates deterministically: ${label}`, () => {
        const a = generate('contract');
        expect(a).toHaveLength(24);
        expect(generate('contract')).toEqual(a);
        expect(generate('another seed')).not.toEqual(a);
      });

      it(`produces JSON-serializable questions: ${label}`, () => {
        const questions = generate('json');
        expect(JSON.parse(JSON.stringify(questions))).toEqual(questions);
      });

      it(`renders questions and answers with the same layout: ${label}`, () => {
        for (const question of generate('render', 12)) {
          const q = plugin.render(question);
          const a = plugin.renderAnswer(question);
          expect(shape(a)).toEqual(shape(q));
          expect(q.responses.some((r) => r.kind === 'text')).toBe(false);
          for (const r of q.responses) {
            if (r.kind === 'under-notes') expect(r.answers).toBeUndefined();
          }
          for (const r of a.responses) {
            if (r.kind === 'blank') throw new Error('Answer key left a blank unfilled');
            if (r.kind === 'text') expect(r.text.trim()).not.toBe('');
            if (r.kind === 'under-notes') {
              const notes = a.notation?.elements.filter((e) => e.kind === 'note') ?? [];
              expect(r.answers).toHaveLength(notes.length);
            }
          }
        }
      });
    }
  }

  it('writes instructions for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(plugin.instructions(difficulty, resolveSettings(plugin)).length).toBeGreaterThan(10);
    }
  });
});

describe('resolveSettings', () => {
  it('fills defaults and replaces invalid values', () => {
    const plugin = {
      settings: [
        {
          id: 'clef',
          label: 'Clef',
          choices: [
            { value: 'treble', label: 'Treble' },
            { value: 'bass', label: 'Bass' },
          ],
          defaultValue: 'treble',
        },
      ],
    };
    expect(resolveSettings(plugin)).toEqual({ clef: 'treble' });
    expect(resolveSettings(plugin, { clef: 'bass' })).toEqual({ clef: 'bass' });
    expect(resolveSettings(plugin, { clef: 'alto', stray: 'x' })).toEqual({ clef: 'treble' });
  });
});
