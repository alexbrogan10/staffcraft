import { describe, expect, it } from 'vitest';
import type { NotationRenderer, RenderedStaff, StaffSpec } from '../notation';
import { buildWorksheet } from './build';
import { createSection, normalizeConfig, PAPER_SIZES, type WorksheetConfig } from './config';
import { layoutDocument, layoutPart, LAYOUT, type Page, type TextItem } from './layout';
import { pageToSvg } from './renderPage';
import { measureText, wrapText } from './text';

/** Fixed-geometry renderer so layout can be tested without VexFlow or a DOM. */
class FakeRenderer implements NotationRenderer {
  calls = 0;
  renderStaff(spec: StaffSpec, options: { width: number; staffSpace: number }): RenderedStaff {
    this.calls++;
    const notes = spec.elements.filter((e) => e.kind === 'note').length;
    return {
      markup: `<rect data-notes="${notes}"/>`,
      width: options.width,
      height: 60,
      staffTop: 15,
      staffBottom: 39,
      contentBottom: 45,
      noteCenters: Array.from({ length: notes }, (_, i) => 40 + i * 20),
    };
  }
}

const base: WorksheetConfig = {
  title: 'Unit Test Sheet',
  showName: true,
  showDate: true,
  seed: 'layout',
  paperSize: 'letter',
  sections: [createSection('note-naming', 'a'), createSection('note-naming', 'b')],
};

const texts = (page: Page) =>
  page.items.filter((i): i is TextItem => i.kind === 'text').map((i) => i.text);

describe('buildWorksheet', () => {
  it('numbers questions continuously across sections', () => {
    const sheet = buildWorksheet(base);
    expect(sheet.sections.map((s) => s.firstNumber)).toEqual([1, 13]);
  });

  it('is reproducible from the seed', () => {
    expect(buildWorksheet(base)).toEqual(buildWorksheet(base));
    expect(buildWorksheet({ ...base, seed: 'other' }).sections[0]?.questions).not.toEqual(
      buildWorksheet(base).sections[0]?.questions,
    );
  });

  it('keeps other sections unchanged when one section is edited', () => {
    const first = base.sections[0];
    if (!first) throw new Error('missing section');
    const edited = buildWorksheet({
      ...base,
      sections: [{ ...first, difficulty: 'hard', count: 5 }, ...base.sections.slice(1)],
    });
    expect(edited.sections[1]?.questions).toEqual(buildWorksheet(base).sections[1]?.questions);
  });
});

describe('layout', () => {
  it('lays out the worksheet and answer key on the chosen paper', () => {
    const doc = layoutDocument(buildWorksheet({ ...base, paperSize: 'a4' }), new FakeRenderer());
    for (const page of [...doc.worksheet, ...doc.answers]) {
      expect(page.width).toBe(PAPER_SIZES.a4.width);
      expect(page.height).toBe(PAPER_SIZES.a4.height);
    }
    expect(texts(doc.worksheet[0] as Page)).toContain('Name');
    expect(texts(doc.answers[0] as Page)).toContain('ANSWER KEY');
    expect(texts(doc.answers[0] as Page)).not.toContain('Name');
  });

  it('keeps every item inside the page margins', () => {
    const doc = layoutDocument(buildWorksheet(base), new FakeRenderer());
    for (const page of [...doc.worksheet, ...doc.answers]) {
      for (const item of page.items) {
        const xs = item.kind === 'line' ? [item.x1, item.x2] : [item.x];
        const ys = item.kind === 'line' ? [item.y1, item.y2] : [item.y];
        for (const x of xs) {
          expect(x).toBeGreaterThanOrEqual(LAYOUT.marginX - 0.01);
          expect(x).toBeLessThanOrEqual(page.width - LAYOUT.marginX + 0.01);
        }
        for (const y of ys) {
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(page.height - LAYOUT.footerOffset + 0.01);
        }
      }
    }
  });

  it('paginates long worksheets and numbers pages in the footer', () => {
    const many = {
      ...base,
      sections: Array.from({ length: 4 }, (_, i) => ({
        ...createSection('note-naming', `s${i}`),
        count: 40,
      })),
    };
    const pages = layoutPart(buildWorksheet(many), 'worksheet', new FakeRenderer());
    expect(pages.length).toBeGreaterThan(1);
    expect(texts(pages[0] as Page).some((t) => t.includes(`page 1 of ${pages.length}`))).toBe(true);
    const numbers = pages.flatMap(texts).filter((t) => /^\d+\.$/.test(t));
    expect(numbers).toEqual(Array.from({ length: 160 }, (_, i) => `${i + 1}.`));
  });

  it('places answers exactly where the blanks are', () => {
    const doc = layoutDocument(
      buildWorksheet({ ...base, showName: false, showDate: false }),
      new FakeRenderer(),
    );
    const lines = (page: Page) => page.items.filter((i) => i.kind === 'line').slice(1);
    // Same header height on both parts when the name/date row is hidden.
    expect(lines(doc.answers[0] as Page)).toEqual(lines(doc.worksheet[0] as Page));
  });

  it('shows a hint when there are no exercises', () => {
    const pages = layoutPart(
      buildWorksheet({ ...base, sections: [] }),
      'worksheet',
      new FakeRenderer(),
    );
    expect(texts(pages[0] as Page)).toContain('Add an exercise to get started.');
  });

  it('falls back to a default title', () => {
    const pages = layoutPart(
      buildWorksheet({ ...base, title: '  ' }),
      'worksheet',
      new FakeRenderer(),
    );
    expect(texts(pages[0] as Page)).toContain('Music Theory Worksheet');
  });
});

describe('pageToSvg', () => {
  it('produces a standalone SVG sized in points with escaped text', () => {
    const svg = pageToSvg({
      width: 612,
      height: 792,
      items: [
        {
          kind: 'text',
          x: 1,
          y: 2,
          text: 'Tom & Jerry <3 "quotes"',
          size: 10,
          weight: 'bold',
          anchor: 'middle',
          fill: '#000',
        },
      ],
    });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="612" height="792"/);
    expect(svg).toContain('Tom &amp; Jerry &lt;3 &quot;quotes&quot;');
    expect(svg).toContain('font-weight="bold"');
    // Anchors are resolved to a start position using the font metrics.
    expect(svg).not.toContain('text-anchor');
    const width = measureText('Tom & Jerry <3 "quotes"', 10, 'bold');
    expect(svg).toContain(`x="${Math.round((1 - width / 2) * 100) / 100}"`);
  });
});

describe('text metrics', () => {
  it('measures with the bundled font metrics', () => {
    expect(measureText('', 10)).toBe(0);
    expect(measureText('WWW', 10)).toBeGreaterThan(measureText('iii', 10));
    expect(measureText('A', 10, 'bold')).toBeGreaterThan(measureText('A', 10));
    expect(measureText('♭', 10)).toBeGreaterThan(0);
  });

  it('wraps on word boundaries and breaks overlong words', () => {
    const lines = wrapText('one two three four five six', 10, measureText('one two three', 10));
    expect(lines).toEqual(['one two three', 'four five six']);
    const broken = wrapText('Supercalifragilistic', 10, measureText('Super', 10));
    expect(broken.join('')).toBe('Supercalifragilistic');
    expect(broken.length).toBeGreaterThan(1);
  });
});

describe('normalizeConfig', () => {
  it('drops unknown exercises and clamps values', () => {
    const result = normalizeConfig(
      {
        title: 'x'.repeat(200),
        seed: '  abc ',
        paperSize: 'legal',
        sections: [
          { exerciseId: 'nope', count: 3 },
          {
            exerciseId: 'note-naming',
            count: 9999,
            difficulty: 'impossible',
            settings: { clef: 'alto' },
          },
          'garbage',
        ],
      },
      base,
    );
    expect(result.title).toHaveLength(80);
    expect(result.seed).toBe('abc');
    expect(result.paperSize).toBe('letter');
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]).toMatchObject({
      exerciseId: 'note-naming',
      count: 40,
      difficulty: 'easy',
      settings: { clef: 'treble' },
    });
  });

  it('returns the fallback for non-objects', () => {
    expect(normalizeConfig(null, base)).toBe(base);
    expect(normalizeConfig('[]', base)).toBe(base);
  });
});
