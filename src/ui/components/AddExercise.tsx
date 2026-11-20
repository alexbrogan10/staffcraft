import { EXERCISES } from '../../exercises';
import { Icon } from './Icon';

interface Props {
  readonly disabled: boolean;
  readonly onAdd: (exerciseId: string) => void;
}

export function AddExercise({ disabled, onAdd }: Props) {
  return (
    <div className="add-exercise">
      <h3 className="field-label">Add an exercise</h3>
      <ul className="add-exercise__list">
        {EXERCISES.map((plugin) => (
          <li key={plugin.id}>
            <button
              type="button"
              className="add-exercise__button"
              disabled={disabled}
              onClick={() => {
                onAdd(plugin.id);
              }}
            >
              <Icon name="plus" />
              <span>
                <span className="add-exercise__name">{plugin.title}</span>
                <span className="add-exercise__description">{plugin.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {disabled && <p className="hint">A worksheet can have up to 8 exercises.</p>}
    </div>
  );
}
