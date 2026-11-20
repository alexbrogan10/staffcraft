import { intervals } from './intervals';
import { keySignatures } from './key-signatures';
import { noteNaming } from './note-naming';
import { rhythmCounting } from './rhythm-counting';
import type { ExercisePlugin } from './types';

/** Every exercise type, in the order the builder lists them. */
export const EXERCISES: readonly ExercisePlugin[] = [
  noteNaming,
  intervals,
  keySignatures,
  rhythmCounting,
];

const BY_ID = new Map(EXERCISES.map((plugin) => [plugin.id, plugin]));

export function getExercise(id: string): ExercisePlugin {
  const plugin = BY_ID.get(id);
  if (!plugin) throw new Error(`Unknown exercise type: ${id}`);
  return plugin;
}

export function hasExercise(id: string): boolean {
  return BY_ID.has(id);
}
