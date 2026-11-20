import type { Rng } from '../domain';
import type { StaffSpec } from '../notation';

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** A per-exercise choice shown in the builder, e.g. which clef to use. */
export interface ExerciseSetting {
  readonly id: string;
  readonly label: string;
  readonly choices: readonly { readonly value: string; readonly label: string }[];
  readonly defaultValue: string;
}

export type SettingValues = Readonly<Record<string, string>>;

export interface GenerateContext {
  /** Seeded; the only source of randomness a generator may use. */
  readonly rng: Rng;
  readonly difficulty: Difficulty;
  readonly count: number;
  readonly settings: SettingValues;
}

/**
 * Where the student writes. `blank` and `text` occupy identical space, so the
 * answer key lines up exactly with the worksheet.
 */
export type ResponseArea =
  | { readonly kind: 'blank'; readonly label?: string }
  | { readonly kind: 'text'; readonly label?: string; readonly text: string }
  /** A short blank under every note; `answers` fills them in on the answer key. */
  | { readonly kind: 'under-notes'; readonly answers?: readonly string[] };

/** What one question (or its answer) looks like on the page: plain data, no DOM. */
export interface QuestionBlock {
  readonly notation?: StaffSpec;
  readonly prompt?: string;
  readonly responses: readonly ResponseArea[];
}

/**
 * One kind of exercise. Methods (rather than function properties) keep the
 * interface bivariant in Q so plugins can live in one registry.
 */
export interface ExercisePlugin<Q = unknown> {
  /** Stable id, used in saved configs and to derive each section's seed. */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** One short line per difficulty, shown in the builder. */
  readonly levels: Readonly<Record<Difficulty, string>>;
  readonly settings: readonly ExerciseSetting[];
  readonly defaultCount: number;
  readonly maxCount: number;
  /** Questions per row on the page. */
  readonly columns: number;
  instructions(difficulty: Difficulty, settings: SettingValues): string;
  /** Pure and deterministic; questions must be JSON-serializable. */
  generate(context: GenerateContext): Q[];
  render(question: Q): QuestionBlock;
  renderAnswer(question: Q): QuestionBlock;
}

/** Resolves missing or invalid setting values to their defaults. */
export function resolveSettings(
  plugin: Pick<ExercisePlugin, 'settings'>,
  values: SettingValues = {},
): SettingValues {
  const resolved: Record<string, string> = {};
  for (const setting of plugin.settings) {
    const value = values[setting.id];
    const valid = setting.choices.some((c) => c.value === value);
    resolved[setting.id] = valid && value !== undefined ? value : setting.defaultValue;
  }
  return resolved;
}
