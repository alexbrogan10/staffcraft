import type { Difficulty, SettingValues } from '../../exercises';
import {
  createSection,
  MAX_SECTIONS,
  normalizeConfig,
  type PaperSize,
  type SectionConfig,
  type WorksheetConfig,
} from '../../worksheet';

export type WorksheetAction =
  | { type: 'setTitle'; title: string }
  | { type: 'setShowName'; value: boolean }
  | { type: 'setShowDate'; value: boolean }
  | { type: 'setPaperSize'; paperSize: PaperSize }
  | { type: 'setSeed'; seed: string }
  | { type: 'addSection'; exerciseId: string; id: string }
  | { type: 'removeSection'; id: string }
  | { type: 'moveSection'; id: string; offset: -1 | 1 }
  | {
      type: 'updateSection';
      id: string;
      patch: Partial<{ difficulty: Difficulty; count: number; settings: SettingValues }>;
    }
  | { type: 'replace'; config: WorksheetConfig };

export function worksheetReducer(state: WorksheetConfig, action: WorksheetAction): WorksheetConfig {
  switch (action.type) {
    case 'setTitle':
      return { ...state, title: action.title };
    case 'setShowName':
      return { ...state, showName: action.value };
    case 'setShowDate':
      return { ...state, showDate: action.value };
    case 'setPaperSize':
      return { ...state, paperSize: action.paperSize };
    case 'setSeed':
      return { ...state, seed: action.seed };
    case 'addSection':
      if (state.sections.length >= MAX_SECTIONS) return state;
      return {
        ...state,
        sections: [...state.sections, createSection(action.exerciseId, action.id)],
      };
    case 'removeSection':
      return { ...state, sections: state.sections.filter((s) => s.id !== action.id) };
    case 'moveSection': {
      const from = state.sections.findIndex((s) => s.id === action.id);
      const to = from + action.offset;
      if (from < 0 || to < 0 || to >= state.sections.length) return state;
      const sections = [...state.sections];
      const [moved] = sections.splice(from, 1) as [SectionConfig];
      sections.splice(to, 0, moved);
      return { ...state, sections };
    }
    case 'updateSection':
      return {
        ...state,
        sections: state.sections.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };
    case 'replace':
      return action.config;
  }
}

/** A short, readable random seed such as "k3f9qz". */
export function randomSeed(random: () => number = Math.random): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let seed = '';
  for (let i = 0; i < 6; i++) seed += alphabet.charAt(Math.floor(random() * alphabet.length));
  return seed;
}

let counter = 0;
export function newId(): string {
  counter += 1;
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `section-${Date.now().toString(36)}-${counter}`;
}

export function defaultConfig(seed: string = randomSeed()): WorksheetConfig {
  return {
    title: 'Music Theory Practice',
    showName: true,
    showDate: true,
    seed,
    paperSize: 'letter',
    sections: [createSection('note-naming', newId())],
  };
}

export const STORAGE_KEY = 'staffcraft:worksheet:v1';

/** Restores the last worksheet from browser storage, if it is there and valid. */
export function loadConfig(storage: Pick<Storage, 'getItem'> | undefined): WorksheetConfig {
  const fallback = defaultConfig();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? normalizeConfig(JSON.parse(raw), fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function saveConfig(storage: Pick<Storage, 'setItem'> | undefined, config: WorksheetConfig) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage can be full or blocked (private mode); the app works without it.
  }
}
