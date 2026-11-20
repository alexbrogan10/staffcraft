import { DIFFICULTIES, getExercise, hasExercise, resolveSettings } from '../exercises';
import type { Difficulty, SettingValues } from '../exercises';

export const PAPER_SIZES = {
  letter: { label: 'US Letter', width: 612, height: 792 },
  a4: { label: 'A4', width: 595.28, height: 841.89 },
} as const;
export type PaperSize = keyof typeof PAPER_SIZES;

export interface SectionConfig {
  /** Stable key for the UI; not used for generation. */
  readonly id: string;
  readonly exerciseId: string;
  readonly difficulty: Difficulty;
  readonly count: number;
  readonly settings: SettingValues;
}

export interface WorksheetConfig {
  readonly title: string;
  readonly showName: boolean;
  readonly showDate: boolean;
  readonly seed: string;
  readonly paperSize: PaperSize;
  readonly sections: readonly SectionConfig[];
}

export const MAX_SECTIONS = 8;
export const MAX_TITLE_LENGTH = 80;

export function createSection(exerciseId: string, id: string): SectionConfig {
  const plugin = getExercise(exerciseId);
  return {
    id,
    exerciseId,
    difficulty: 'easy',
    count: plugin.defaultCount,
    settings: resolveSettings(plugin),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampCount(value: unknown, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(1, n));
}

/**
 * Turns untrusted data (a saved config, a share link) into a valid config,
 * dropping unknown exercises and clamping values. Never throws.
 */
export function normalizeConfig(input: unknown, fallback: WorksheetConfig): WorksheetConfig {
  if (!isRecord(input)) return fallback;
  const sections: SectionConfig[] = [];
  const rawSections = Array.isArray(input.sections) ? (input.sections as unknown[]) : [];
  for (const [index, raw] of rawSections.entries()) {
    if (!isRecord(raw) || typeof raw.exerciseId !== 'string' || !hasExercise(raw.exerciseId)) {
      continue;
    }
    const plugin = getExercise(raw.exerciseId);
    const difficulty = DIFFICULTIES.find((d) => d === raw.difficulty) ?? 'easy';
    const settings = isRecord(raw.settings)
      ? Object.fromEntries(
          Object.entries(raw.settings).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {};
    sections.push({
      id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : `section-${index}`,
      exerciseId: plugin.id,
      difficulty,
      count: clampCount(raw.count, plugin.maxCount, plugin.defaultCount),
      settings: resolveSettings(plugin, settings),
    });
    if (sections.length === MAX_SECTIONS) break;
  }
  const paperSize: PaperSize = input.paperSize === 'a4' ? 'a4' : 'letter';
  return {
    title:
      typeof input.title === 'string' ? input.title.slice(0, MAX_TITLE_LENGTH) : fallback.title,
    showName: typeof input.showName === 'boolean' ? input.showName : fallback.showName,
    showDate: typeof input.showDate === 'boolean' ? input.showDate : fallback.showDate,
    seed:
      typeof input.seed === 'string' && input.seed.trim() !== ''
        ? input.seed.trim().slice(0, 40)
        : fallback.seed,
    paperSize,
    sections,
  };
}
