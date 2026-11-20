import type { QuestionBlock, ResponseArea } from '../exercises';
import type { NotationRenderer, RenderedStaff } from '../notation';
import type { BuiltSection, Worksheet } from './build';
import { PAPER_SIZES } from './config';
import { measureText, wrapText, type FontWeight } from './text';

export interface TextItem {
  readonly kind: 'text';
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly size: number;
  readonly weight: FontWeight;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly fill: string;
}

export interface LineItem {
  readonly kind: 'line';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly stroke: string;
  readonly width: number;
}

export interface StaffItem {
  readonly kind: 'staff';
  readonly x: number;
  readonly y: number;
  readonly markup: string;
}

export type PageItem = TextItem | LineItem | StaffItem;

export interface Page {
  readonly width: number;
  readonly height: number;
  readonly items: readonly PageItem[];
}

export type DocumentPart = 'worksheet' | 'answers';

/** All measurements are PDF points (1/72 inch). */
export const LAYOUT = {
  marginX: 50,
  marginTop: 46,
  marginBottom: 54,
  footerOffset: 28,
  staffSpace: 6,
  columnGap: 18,
  rowGap: 14,
  sectionGap: 20,
  numberWidth: 20,
  fieldHeight: 22,
  colors: {
    ink: '#1d1d1f',
    muted: '#5f6670',
    rule: '#a3a9b1',
    answer: '#c62828',
  },
} as const;

const { colors } = LAYOUT;

function text(
  x: number,
  y: number,
  value: string,
  size: number,
  options: { weight?: FontWeight; anchor?: TextItem['anchor']; fill?: string } = {},
): TextItem {
  return {
    kind: 'text',
    x,
    y,
    text: value,
    size,
    weight: options.weight ?? 'regular',
    anchor: options.anchor ?? 'start',
    fill: options.fill ?? colors.ink,
  };
}

function line(x1: number, y1: number, x2: number, y2: number, width = 0.75): LineItem {
  return { kind: 'line', x1, y1, x2, y2, stroke: colors.rule, width };
}

function offset(items: readonly PageItem[], dx: number, dy: number): PageItem[] {
  return items.map((item) => {
    switch (item.kind) {
      case 'line':
        return { ...item, x1: item.x1 + dx, x2: item.x2 + dx, y1: item.y1 + dy, y2: item.y2 + dy };
      case 'text':
      case 'staff':
        return { ...item, x: item.x + dx, y: item.y + dy };
    }
  });
}

interface Block {
  readonly items: PageItem[];
  readonly height: number;
}

/** A question whose staff has been rendered but which is not yet positioned. */
interface PreparedQuestion {
  readonly block: QuestionBlock;
  readonly number: number;
  readonly width: number;
  readonly promptLines: readonly string[];
  readonly staff?: RenderedStaff;
}

const PROMPT_LINE = 13;

function promptHeight(q: PreparedQuestion): number {
  return q.promptLines.length === 0 ? 0 : q.promptLines.length * PROMPT_LINE + 4;
}

/** Y of the staff's top line within the cell, before row alignment. */
function staffTopOf(q: PreparedQuestion): number {
  return promptHeight(q) + (q.staff?.staffTop ?? 0);
}

/** Distance from the staff's top line to where response fields start. */
function responseOffsetOf(q: PreparedQuestion): number {
  if (!q.staff) return 0;
  return q.staff.contentBottom - q.staff.staffTop + 4;
}

export function prepareQuestion(
  block: QuestionBlock,
  number: number,
  width: number,
  renderer: NotationRenderer,
): PreparedQuestion {
  const innerWidth = width - LAYOUT.numberWidth;
  const promptLines = block.prompt === undefined ? [] : wrapText(block.prompt, 10, innerWidth);
  const staff = block.notation
    ? renderer.renderStaff(block.notation, { width: innerWidth, staffSpace: LAYOUT.staffSpace })
    : undefined;
  return staff
    ? { block, number, width, promptLines, staff }
    : { block, number, width, promptLines };
}

/**
 * Positions a prepared question in a cell whose top-left corner is (0, 0).
 * `align` pushes the staff and the response fields down so that every
 * question in a row shares the same staff lines and answer lines.
 */
export function placeQuestion(
  q: PreparedQuestion,
  align: { staffTop: number; responseOffset: number } = {
    staffTop: staffTopOf(q),
    responseOffset: responseOffsetOf(q),
  },
): Block {
  const items: PageItem[] = [];
  const x0 = LAYOUT.numberWidth;
  const innerWidth = q.width - x0;
  const top = align.staffTop - staffTopOf(q);

  q.promptLines.forEach((l, i) => items.push(text(x0, top + 10 + i * PROMPT_LINE, l, 10)));

  let noteCenters: readonly number[] = [];
  let center = x0 + innerWidth / 2;
  let bottom = top + promptHeight(q);
  let numberBaseline = top + 10;
  let fieldTop = bottom;
  if (q.staff) {
    const staffY = top + promptHeight(q);
    items.push({ kind: 'staff', x: x0, y: staffY, markup: q.staff.markup });
    numberBaseline = staffY + (q.staff.staffTop + q.staff.staffBottom) / 2 + 3.5;
    noteCenters = q.staff.noteCenters.map((c) => x0 + c);
    if (noteCenters.length === 1) center = noteCenters[0] ?? center;
    bottom = staffY + q.staff.height;
    fieldTop = align.staffTop + align.responseOffset;
  }
  items.push(text(0, numberBaseline, `${q.number}.`, 10, { weight: 'bold' }));

  for (const response of q.block.responses) {
    const field = layoutResponse(response, { x0, innerWidth, center, noteCenters });
    items.push(...offset(field.items, 0, fieldTop));
    fieldTop += field.height;
  }
  return { items, height: Math.max(bottom, fieldTop) };
}

/** Lays out one question on its own, in a cell whose top-left corner is (0, 0). */
export function layoutQuestion(
  block: QuestionBlock,
  number: number,
  width: number,
  renderer: NotationRenderer,
): Block {
  return placeQuestion(prepareQuestion(block, number, width, renderer));
}

/** Lays out questions side by side with their staves and answer lines aligned. */
export function layoutRow(
  questions: readonly PreparedQuestion[],
  cellWidth: number,
  gap: number,
): Block {
  const align = {
    staffTop: Math.max(0, ...questions.map(staffTopOf)),
    responseOffset: Math.max(0, ...questions.map(responseOffsetOf)),
  };
  const cells = questions.map((q, i) => {
    const cell = placeQuestion(q, align);
    return { items: offset(cell.items, i * (cellWidth + gap), 0), height: cell.height };
  });
  return {
    items: cells.flatMap((c) => c.items),
    height: Math.max(0, ...cells.map((c) => c.height)),
  };
}

function layoutResponse(
  response: ResponseArea,
  geometry: { x0: number; innerWidth: number; center: number; noteCenters: readonly number[] },
): Block {
  const baseline = LAYOUT.fieldHeight - 6;
  const items: PageItem[] = [];

  if (response.kind === 'under-notes') {
    const centers = geometry.noteCenters;
    let spacing = geometry.innerWidth;
    for (let i = 1; i < centers.length; i++) {
      spacing = Math.min(spacing, (centers[i] ?? 0) - (centers[i - 1] ?? 0));
    }
    const half = Math.min(9, spacing * 0.4);
    centers.forEach((c, i) => {
      items.push(line(c - half, baseline, c + half, baseline));
      const answer = response.answers?.[i];
      if (answer !== undefined) {
        items.push(
          text(c, baseline - 3, answer, 10, {
            weight: 'bold',
            anchor: 'middle',
            fill: colors.answer,
          }),
        );
      }
    });
    return { items, height: LAYOUT.fieldHeight };
  }

  const lineWidth = Math.min(geometry.innerWidth * 0.6, 84);
  const label = response.label === undefined ? '' : `${response.label} `;
  const labelWidth = measureText(label, 10);
  const groupWidth = labelWidth + lineWidth;
  // Centre under the note (or staff), but keep the field inside the cell.
  const left = Math.min(
    Math.max(geometry.center - groupWidth / 2, geometry.x0),
    geometry.x0 + geometry.innerWidth - groupWidth,
  );
  if (label !== '') items.push(text(left, baseline, label.trim(), 10, { fill: colors.muted }));
  const lineStart = left + labelWidth;
  items.push(line(lineStart, baseline + 2, lineStart + lineWidth, baseline + 2));
  if (response.kind === 'text') {
    items.push(
      text(lineStart + lineWidth / 2, baseline - 1, response.text, 11, {
        weight: 'bold',
        anchor: 'middle',
        fill: colors.answer,
      }),
    );
  }
  return { items, height: LAYOUT.fieldHeight };
}

class PageBuilder {
  readonly pages: { items: PageItem[] }[] = [];
  y = 0;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.newPage();
  }

  get contentWidth(): number {
    return this.width - 2 * LAYOUT.marginX;
  }

  get bottom(): number {
    return this.height - LAYOUT.marginBottom;
  }

  get current(): { items: PageItem[] } {
    return this.pages[this.pages.length - 1] as { items: PageItem[] };
  }

  newPage(): void {
    this.pages.push({ items: [] });
    this.y = LAYOUT.marginTop;
  }

  /** Starts a new page unless `height` fits below the cursor. */
  ensure(height: number): void {
    if (this.y + height > this.bottom && this.y > LAYOUT.marginTop) this.newPage();
  }

  add(items: readonly PageItem[], dx = 0, dy = 0): void {
    this.current.items.push(...offset(items, dx, dy));
  }
}

function layoutHeader(worksheet: Worksheet, part: DocumentPart, page: PageBuilder): void {
  const { config } = worksheet;
  const left = LAYOUT.marginX;
  const right = page.width - LAYOUT.marginX;
  const badge = part === 'answers' ? 'ANSWER KEY' : '';
  const badgeWidth = badge === '' ? 0 : measureText(badge, 10, 'bold') + 16;
  const title = config.title.trim() === '' ? 'Music Theory Worksheet' : config.title.trim();
  const titleLines = wrapText(title, 20, page.contentWidth - badgeWidth, 'bold');

  titleLines.forEach((l, i) => {
    page.add([text(left, page.y + 18 + i * 24, l, 20, { weight: 'bold' })]);
  });
  if (badge !== '') {
    page.add([
      text(right, page.y + 15, badge, 10, { weight: 'bold', anchor: 'end', fill: colors.answer }),
    ]);
  }
  page.y += 18 + (titleLines.length - 1) * 24;

  if (part === 'worksheet' && (config.showName || config.showDate)) {
    const baseline = page.y + 28;
    const nameEnd = config.showDate ? left + page.contentWidth * 0.62 : right;
    if (config.showName) {
      const labelWidth = measureText('Name ', 11);
      page.add([
        text(left, baseline, 'Name', 11, { fill: colors.muted }),
        line(left + labelWidth, baseline + 2, nameEnd, baseline + 2),
      ]);
    }
    if (config.showDate) {
      const start = config.showName ? nameEnd + 18 : left;
      const labelWidth = measureText('Date ', 11);
      page.add([
        text(start, baseline, 'Date', 11, { fill: colors.muted }),
        line(start + labelWidth, baseline + 2, right, baseline + 2),
      ]);
    }
    page.y = baseline;
  }
  page.y += 14;
  page.add([{ ...line(left, page.y, right, page.y, 1.25), stroke: colors.ink }]);
  page.y += 22;
}

function layoutSection(
  section: BuiltSection,
  part: DocumentPart,
  page: PageBuilder,
  renderer: NotationRenderer,
): void {
  const { plugin, questions } = section;
  const columns = Math.max(1, plugin.columns);
  const cellWidth = (page.contentWidth - (columns - 1) * LAYOUT.columnGap) / columns;

  const heading: PageItem[] = [text(0, 12, plugin.title, 13, { weight: 'bold' })];
  const instructions = wrapText(
    plugin.instructions(section.config.difficulty, section.settings),
    10,
    page.contentWidth,
  );
  instructions.forEach((l, i) => heading.push(text(0, 29 + i * 13, l, 10, { fill: colors.muted })));
  const headingHeight = 29 + (instructions.length - 1) * 13 + 14;

  const rows: Block[] = [];
  for (let start = 0; start < questions.length; start += columns) {
    const prepared = questions.slice(start, start + columns).map((question, i) => {
      const block = part === 'answers' ? plugin.renderAnswer(question) : plugin.render(question);
      return prepareQuestion(block, section.firstNumber + start + i, cellWidth, renderer);
    });
    rows.push(layoutRow(prepared, cellWidth, LAYOUT.columnGap));
  }

  // Keep the heading with at least the first row.
  page.ensure(headingHeight + (rows[0]?.height ?? 0));
  page.add(heading, LAYOUT.marginX, page.y);
  page.y += headingHeight;
  for (const row of rows) {
    page.ensure(row.height);
    page.add(row.items, LAYOUT.marginX, page.y);
    page.y += row.height + LAYOUT.rowGap;
  }
  page.y += LAYOUT.sectionGap - LAYOUT.rowGap;
}

function addFooters(worksheet: Worksheet, part: DocumentPart, page: PageBuilder): void {
  const total = page.pages.length;
  const y = page.height - LAYOUT.footerOffset;
  page.pages.forEach((p, i) => {
    const label = part === 'answers' ? 'Answer key' : 'Worksheet';
    const pageText = total > 1 ? ` · page ${i + 1} of ${total}` : '';
    p.items.push(
      text(LAYOUT.marginX, y, 'Made with Staffcraft', 8, { fill: colors.muted }),
      text(
        page.width - LAYOUT.marginX,
        y,
        `${label}${pageText} · seed ${worksheet.config.seed}`,
        8,
        { anchor: 'end', fill: colors.muted },
      ),
    );
  });
}

/** Lays out the worksheet or its answer key as one or more pages. */
export function layoutPart(
  worksheet: Worksheet,
  part: DocumentPart,
  renderer: NotationRenderer,
): Page[] {
  const { width, height } = PAPER_SIZES[worksheet.config.paperSize];
  const page = new PageBuilder(width, height);
  layoutHeader(worksheet, part, page);
  if (worksheet.sections.length === 0) {
    page.add([
      text(LAYOUT.marginX, page.y + 12, 'Add an exercise to get started.', 11, {
        fill: colors.muted,
      }),
    ]);
  }
  for (const section of worksheet.sections) layoutSection(section, part, page, renderer);
  addFooters(worksheet, part, page);
  return page.pages.map((p) => ({ width, height, items: p.items }));
}

export interface LaidOutDocument {
  readonly worksheet: readonly Page[];
  readonly answers: readonly Page[];
}

export function layoutDocument(worksheet: Worksheet, renderer: NotationRenderer): LaidOutDocument {
  return {
    worksheet: layoutPart(worksheet, 'worksheet', renderer),
    answers: layoutPart(worksheet, 'answers', renderer),
  };
}
