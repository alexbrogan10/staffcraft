import { describe, expect, it } from 'vitest';
import { MAX_SECTIONS, type WorksheetConfig } from '../../worksheet';
import {
  defaultConfig,
  loadConfig,
  randomSeed,
  saveConfig,
  STORAGE_KEY,
  worksheetReducer,
} from './worksheetState';

const start = (): WorksheetConfig => ({ ...defaultConfig('seed'), sections: [] });
const add = (state: WorksheetConfig, id: string) =>
  worksheetReducer(state, { type: 'addSection', exerciseId: 'note-naming', id });

describe('worksheetReducer', () => {
  it('edits worksheet fields', () => {
    let state = start();
    state = worksheetReducer(state, { type: 'setTitle', title: 'Quiz' });
    state = worksheetReducer(state, { type: 'setShowName', value: false });
    state = worksheetReducer(state, { type: 'setShowDate', value: false });
    state = worksheetReducer(state, { type: 'setPaperSize', paperSize: 'a4' });
    state = worksheetReducer(state, { type: 'setSeed', seed: 'abc' });
    expect(state).toMatchObject({
      title: 'Quiz',
      showName: false,
      showDate: false,
      paperSize: 'a4',
      seed: 'abc',
    });
  });

  it('adds, updates, moves and removes sections', () => {
    let state = add(add(add(start(), 'a'), 'b'), 'c');
    state = worksheetReducer(state, {
      type: 'updateSection',
      id: 'b',
      patch: { difficulty: 'hard', count: 4 },
    });
    expect(state.sections[1]).toMatchObject({ id: 'b', difficulty: 'hard', count: 4 });

    state = worksheetReducer(state, { type: 'moveSection', id: 'c', offset: -1 });
    expect(state.sections.map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(worksheetReducer(state, { type: 'moveSection', id: 'a', offset: -1 })).toBe(state);
    expect(worksheetReducer(state, { type: 'moveSection', id: 'b', offset: 1 })).toBe(state);

    state = worksheetReducer(state, { type: 'removeSection', id: 'c' });
    expect(state.sections.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('caps the number of sections', () => {
    let state = start();
    for (let i = 0; i < MAX_SECTIONS + 3; i++) state = add(state, `s${i}`);
    expect(state.sections).toHaveLength(MAX_SECTIONS);
  });
});

describe('randomSeed', () => {
  it('makes short unambiguous seeds', () => {
    let n = 0;
    const seed = randomSeed(() => (n++ * 0.137) % 1);
    expect(seed).toMatch(/^[a-z2-9]{6}$/);
    expect(seed).not.toMatch(/[01ilo]/);
  });
});

describe('persistence', () => {
  it('round-trips through storage', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    const config = { ...defaultConfig('kept'), title: 'Saved' };
    saveConfig(storage, config);
    expect(loadConfig(storage)).toEqual(config);
  });

  it('falls back to defaults on missing, corrupt or throwing storage', () => {
    expect(loadConfig(undefined).sections).toHaveLength(1);
    expect(loadConfig({ getItem: () => '{not json' }).title).toBe('Music Theory Practice');
    expect(
      loadConfig({
        getItem: () => {
          throw new Error('blocked');
        },
      }).title,
    ).toBe('Music Theory Practice');
    expect(() => {
      saveConfig(
        {
          setItem: () => {
            throw new Error('full');
          },
        },
        defaultConfig(),
      );
    }).not.toThrow();
    expect(STORAGE_KEY).toMatch(/v1$/);
  });
});
