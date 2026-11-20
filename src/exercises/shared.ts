import type { Clef, Rng } from '../domain';
import type { ExerciseSetting, SettingValues } from './types';

/**
 * Calls `make` until it has `count` items, avoiding duplicates where it can and
 * never repeating the previous item when an alternative exists.
 */
export function generateVaried<T>(
  count: number,
  make: () => T,
  key: (item: T) => string = (item) => JSON.stringify(item),
  attempts = 30,
): T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  while (result.length < count) {
    const previous = result.at(-1);
    let chosen: T | undefined;
    let fallback: T | undefined;
    for (let i = 0; i < attempts && chosen === undefined; i++) {
      const candidate = make();
      const k = key(candidate);
      if (!seen.has(k)) chosen = candidate;
      else if (fallback === undefined && (previous === undefined || key(previous) !== k)) {
        fallback = candidate;
      }
    }
    const item = chosen ?? fallback ?? make();
    seen.add(key(item));
    result.push(item);
  }
  return result;
}

export const CLEF_SETTING: ExerciseSetting = {
  id: 'clef',
  label: 'Clef',
  choices: [
    { value: 'treble', label: 'Treble' },
    { value: 'bass', label: 'Bass' },
    { value: 'both', label: 'Treble and bass' },
  ],
  defaultValue: 'treble',
};

/** Picks a clef for one question according to the clef setting. */
export function chooseClef(settings: SettingValues, rng: Rng): Clef {
  const value = settings.clef;
  if (value === 'bass') return 'bass';
  if (value === 'both') return rng.chance(0.5) ? 'treble' : 'bass';
  return 'treble';
}
