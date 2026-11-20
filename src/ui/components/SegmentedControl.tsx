import { useId } from 'react';

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface Props<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly SegmentedOption<T>[];
  readonly onChange: (value: T) => void;
}

/** A row of radio buttons styled as a segmented control. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  const name = useId();
  return (
    <fieldset className="segmented">
      <legend className="field-label">{label}</legend>
      <div className="segmented__options">
        {options.map((option) => (
          <label key={option.value} className="segmented__option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
