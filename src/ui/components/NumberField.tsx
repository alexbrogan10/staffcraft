import { useId, useState } from 'react';

interface Props {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}

/** A number input that lets the user clear it while typing and clamps on blur. */
export function NumberField({ label, value, min, max, onChange }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  // Follow outside changes to `value` (React's "adjust state during render" pattern).
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(String(value));
  }

  const commit = (text: string) => {
    const parsed = Number.parseInt(text, 10);
    const clamped = Number.isNaN(parsed) ? value : Math.min(max, Math.max(min, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input input--number"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const parsed = Number.parseInt(text, 10);
          if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) onChange(parsed);
        }}
        onBlur={(event) => {
          commit(event.target.value);
        }}
      />
    </div>
  );
}
