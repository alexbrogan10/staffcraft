// @vitest-environment jsdom
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VexFlowRenderer } from '../notation';
import { buildWorksheet, createSection, layoutDocument, type WorksheetConfig } from '../worksheet';
import { createPdf, pdfFileName, type PdfFonts } from './pdf';

// jsdom has no layout engine. svg2pdf measures text only for bounding boxes here,
// because pages never use text-anchor, so a zero-size stub is enough.
Object.defineProperty(window.SVGElement.prototype, 'getBBox', {
  value: () => ({ x: 0, y: 0, width: 0, height: 0 }),
});

const fontPath = (name: string) => resolve(import.meta.dirname, '../../public/fonts', name);
const fonts: PdfFonts = {
  regular: readFileSync(fontPath('DejaVuSans-subset.ttf')).toString('base64'),
  bold: readFileSync(fontPath('DejaVuSans-Bold-subset.ttf')).toString('base64'),
};

const config: WorksheetConfig = {
  title: 'PDF Export Test',
  showName: true,
  showDate: true,
  seed: 'pdf',
  paperSize: 'letter',
  sections: [
    { ...createSection('note-naming', 'a'), difficulty: 'hard', settings: { clef: 'both' } },
  ],
};

async function render(paperSize: WorksheetConfig['paperSize'], compress = true) {
  const sheet = buildWorksheet({ ...config, paperSize });
  const doc = layoutDocument(sheet, new VexFlowRenderer());
  const pdf = await createPdf(doc, { title: config.title, paperSize, fonts, compress });
  return { pdf, doc, bytes: new Uint8Array(pdf.output('arraybuffer')) };
}

describe('createPdf', () => {
  it.each([
    ['letter', 612, 792],
    ['a4', 595.28, 841.89],
  ] as const)('puts the worksheet and answer key on separate %s pages', async (size, w, h) => {
    const { pdf, doc, bytes } = await render(size);
    expect(pdf.getNumberOfPages()).toBe(doc.worksheet.length + doc.answers.length);
    expect(doc.answers.length).toBeGreaterThan(0);
    for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
      pdf.setPage(page);
      expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(w, 1);
      expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(h, 1);
    }
    if (process.env.STAFFCRAFT_PDF_OUT) {
      writeFileSync(`${process.env.STAFFCRAFT_PDF_OUT}/test-${size}.pdf`, bytes);
    }
  });

  it('draws all text with the embedded worksheet font', async () => {
    const { bytes } = await render('letter', false);
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text).toContain('/FontFile2');

    // Map resource names (/F1) to object numbers, and object numbers to base fonts.
    const resourceToObject = new Map(
      [...text.matchAll(/\/(F\d+) (\d+) 0 R/g)].map((m) => [m[1], m[2]] as const),
    );
    const objectToFont = new Map(
      [...text.matchAll(/(\d+) 0 obj\s*<<[^>]*?\/BaseFont \/([^\s/>]+)/g)].map(
        (m) => [m[1], m[2]] as const,
      ),
    );
    const used = new Set([...text.matchAll(/\/(F\d+) [\d.]+ Tf/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(0);
    for (const resource of used) {
      const font = objectToFont.get(resourceToObject.get(resource) ?? '');
      expect(font).toBe('Staffcraft#20Sans');
    }
  });
});

it('compresses page content by default', async () => {
  const compressed = await render('letter');
  const plain = await render('letter', false);
  expect(compressed.bytes.length).toBeLessThan(plain.bytes.length / 2);
});

describe('pdfFileName', () => {
  it('slugifies titles', () => {
    expect(pdfFileName('Note Reading — Week 3!')).toBe('note-reading-week-3.pdf');
    expect(pdfFileName('Café Théorie')).toBe('cafe-theorie.pdf');
    expect(pdfFileName('  ')).toBe('worksheet.pdf');
  });
});
