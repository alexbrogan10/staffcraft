import type { Dispatch } from 'react';
import {
  MAX_TITLE_LENGTH,
  PAPER_SIZES,
  type PaperSize,
  type WorksheetConfig,
} from '../../worksheet';
import { randomSeed, type WorksheetAction } from '../state/worksheetState';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';

const PAPER_OPTIONS = (Object.keys(PAPER_SIZES) as PaperSize[]).map((value) => ({
  value,
  label: PAPER_SIZES[value].label,
}));

interface Props {
  readonly config: WorksheetConfig;
  readonly dispatch: Dispatch<WorksheetAction>;
}

export function WorksheetSettings({ config, dispatch }: Props) {
  return (
    <section className="panel" aria-labelledby="worksheet-heading">
      <h2 id="worksheet-heading" className="panel__title">
        Worksheet
      </h2>

      <div className="field">
        <label className="field-label" htmlFor="worksheet-title">
          Title
        </label>
        <input
          id="worksheet-title"
          className="input"
          type="text"
          maxLength={MAX_TITLE_LENGTH}
          value={config.title}
          placeholder="Music Theory Worksheet"
          onChange={(event) => {
            dispatch({ type: 'setTitle', title: event.target.value });
          }}
        />
      </div>

      <div className="checkbox-row">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={config.showName}
            onChange={(event) => {
              dispatch({ type: 'setShowName', value: event.target.checked });
            }}
          />
          Name line
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={config.showDate}
            onChange={(event) => {
              dispatch({ type: 'setShowDate', value: event.target.checked });
            }}
          />
          Date line
        </label>
      </div>

      <SegmentedControl
        label="Paper size"
        value={config.paperSize}
        options={PAPER_OPTIONS}
        onChange={(paperSize) => {
          dispatch({ type: 'setPaperSize', paperSize });
        }}
      />

      <div className="field">
        <label className="field-label" htmlFor="worksheet-seed">
          Seed
        </label>
        <div className="input-group">
          <input
            id="worksheet-seed"
            className="input input--mono"
            type="text"
            maxLength={40}
            spellCheck={false}
            value={config.seed}
            aria-describedby="seed-hint"
            onChange={(event) => {
              dispatch({ type: 'setSeed', seed: event.target.value });
            }}
            onBlur={(event) => {
              if (event.target.value.trim() === '')
                dispatch({ type: 'setSeed', seed: randomSeed() });
            }}
          />
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              dispatch({ type: 'setSeed', seed: randomSeed() });
            }}
          >
            <Icon name="shuffle" />
            New questions
          </button>
        </div>
        <p id="seed-hint" className="hint">
          The same seed and settings always give the same worksheet.
        </p>
      </div>
    </section>
  );
}
