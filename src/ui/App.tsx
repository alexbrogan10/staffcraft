import { useDeferredValue, useEffect, useMemo, useReducer } from 'react';
import { buildWorksheet, layoutDocument, MAX_SECTIONS } from '../worksheet';
import { AddExercise } from './components/AddExercise';
import { ExportButton } from './components/ExportButton';
import { Preview } from './components/Preview';
import { SectionEditor } from './components/SectionEditor';
import { WorksheetSettings } from './components/WorksheetSettings';
import { renderer } from './renderer';
import { loadConfig, newId, saveConfig, worksheetReducer } from './state/worksheetState';

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function App() {
  const [config, dispatch] = useReducer(worksheetReducer, undefined, () =>
    loadConfig(browserStorage()),
  );
  useEffect(() => {
    saveConfig(browserStorage(), config);
  }, [config]);

  // Typing stays responsive while the preview catches up.
  const previewConfig = useDeferredValue(config);
  const document = useMemo(
    () => layoutDocument(buildWorksheet(previewConfig), renderer),
    [previewConfig],
  );

  return (
    <div className="app">
      <aside className="builder" aria-label="Worksheet builder">
        <header className="brand">
          <img className="brand__logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          <div>
            <h1 className="brand__name">Staffcraft</h1>
            <p className="brand__tagline">Printable music theory worksheets with answer keys</p>
          </div>
        </header>

        <WorksheetSettings config={config} dispatch={dispatch} />

        <section className="panel" aria-labelledby="exercises-heading">
          <h2 id="exercises-heading" className="panel__title">
            Exercises
          </h2>
          {config.sections.length > 0 ? (
            <ol className="section-list">
              {config.sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  index={index}
                  total={config.sections.length}
                  dispatch={dispatch}
                />
              ))}
            </ol>
          ) : (
            <p className="empty">No exercises yet. Add one below.</p>
          )}
          <AddExercise
            disabled={config.sections.length >= MAX_SECTIONS}
            onAdd={(exerciseId) => {
              dispatch({ type: 'addSection', exerciseId, id: newId() });
            }}
          />
        </section>
      </aside>

      <main className="preview-pane">
        <div className="toolbar">
          <h2 className="toolbar__title">Preview</h2>
          <ExportButton config={config} />
        </div>
        <Preview document={document} updating={previewConfig !== config} />
      </main>
    </div>
  );
}
