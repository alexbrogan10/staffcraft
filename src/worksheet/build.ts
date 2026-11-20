import { createRng } from '../domain';
import {
  getExercise,
  resolveSettings,
  type ExercisePlugin,
  type SettingValues,
} from '../exercises';
import type { SectionConfig, WorksheetConfig } from './config';

export interface BuiltSection {
  readonly config: SectionConfig;
  readonly plugin: ExercisePlugin;
  readonly settings: SettingValues;
  readonly questions: readonly unknown[];
  /** Number printed next to the first question; numbering runs across sections. */
  readonly firstNumber: number;
}

export interface Worksheet {
  readonly config: WorksheetConfig;
  readonly sections: readonly BuiltSection[];
}

/**
 * The seed label for one section. Each section draws from its own stream, so
 * editing one section never changes the questions in another.
 */
export function sectionSeedLabel(index: number, exerciseId: string): string {
  return `${index}:${exerciseId}`;
}

export function buildWorksheet(config: WorksheetConfig): Worksheet {
  const root = createRng(config.seed);
  let nextNumber = 1;
  const sections = config.sections.map((section, index): BuiltSection => {
    const plugin = getExercise(section.exerciseId);
    const settings = resolveSettings(plugin, section.settings);
    const questions = plugin.generate({
      rng: root.fork(sectionSeedLabel(index, plugin.id)),
      difficulty: section.difficulty,
      count: section.count,
      settings,
    });
    const built = { config: section, plugin, settings, questions, firstNumber: nextNumber };
    nextNumber += questions.length;
    return built;
  });
  return { config, sections };
}
