import type { Dispatch } from 'react';
import { DIFFICULTIES, getExercise, resolveSettings, type Difficulty } from '../../exercises';
import type { SectionConfig } from '../../worksheet';
import type { WorksheetAction } from '../state/worksheetState';
import { Icon } from './Icon';
import { NumberField } from './NumberField';
import { SegmentedControl } from './SegmentedControl';

const DIFFICULTY_OPTIONS = DIFFICULTIES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

interface Props {
  readonly section: SectionConfig;
  readonly index: number;
  readonly total: number;
  readonly dispatch: Dispatch<WorksheetAction>;
}

export function SectionEditor({ section, index, total, dispatch }: Props) {
  const plugin = getExercise(section.exerciseId);
  const settings = resolveSettings(plugin, section.settings);
  const update = (patch: Extract<WorksheetAction, { type: 'updateSection' }>['patch']) => {
    dispatch({ type: 'updateSection', id: section.id, patch });
  };
  const headingId = `section-${section.id}-title`;

  return (
    <li className="section-card" aria-labelledby={headingId}>
      <div className="section-card__header">
        <span className="section-card__index" aria-hidden="true">
          {index + 1}
        </span>
        <h3 id={headingId} className="section-card__title">
          {plugin.title}
        </h3>
        <div className="section-card__actions">
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${plugin.title} up`}
            disabled={index === 0}
            onClick={() => {
              dispatch({ type: 'moveSection', id: section.id, offset: -1 });
            }}
          >
            <Icon name="up" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${plugin.title} down`}
            disabled={index === total - 1}
            onClick={() => {
              dispatch({ type: 'moveSection', id: section.id, offset: 1 });
            }}
          >
            <Icon name="down" />
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            aria-label={`Remove ${plugin.title}`}
            onClick={() => {
              dispatch({ type: 'removeSection', id: section.id });
            }}
          >
            <Icon name="remove" />
          </button>
        </div>
      </div>

      <SegmentedControl<Difficulty>
        label="Difficulty"
        value={section.difficulty}
        options={DIFFICULTY_OPTIONS}
        onChange={(difficulty) => {
          update({ difficulty });
        }}
      />
      <p className="hint">{plugin.levels[section.difficulty]}</p>

      <div className="section-card__row">
        <NumberField
          label="Questions"
          value={section.count}
          min={1}
          max={plugin.maxCount}
          onChange={(count) => {
            update({ count });
          }}
        />
        {plugin.settings.map((setting) => (
          <SegmentedControl
            key={setting.id}
            label={setting.label}
            value={settings[setting.id] ?? setting.defaultValue}
            options={setting.choices}
            onChange={(value) => {
              update({ settings: { ...settings, [setting.id]: value } });
            }}
          />
        ))}
      </div>
    </li>
  );
}
