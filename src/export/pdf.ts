import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import {
  PAPER_SIZES,
  WORKSHEET_FONT_FAMILY,
  pageToSvg,
  type LaidOutDocument,
  type PaperSize,
} from '../worksheet';

/** The worksheet font files, base64-encoded TrueType. */
export interface PdfFonts {
  readonly regular: string;
  readonly bold: string;
}

const FONT_FILES = {
  regular: 'fonts/DejaVuSans-subset.ttf',
  bold: 'fonts/DejaVuSans-Bold-subset.ttf',
} as const;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Fetches the worksheet fonts from the app's public folder. */
export async function loadPdfFonts(baseUrl: string = import.meta.env.BASE_URL): Promise<PdfFonts> {
  const load = async (path: string) => {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) throw new Error(`Could not load font ${path} (${response.status})`);
    return toBase64(await response.arrayBuffer());
  };
  const [regular, bold] = await Promise.all([load(FONT_FILES.regular), load(FONT_FILES.bold)]);
  return { regular, bold };
}

function registerFonts(pdf: jsPDF, fonts: PdfFonts): void {
  pdf.addFileToVFS('StaffcraftSans-Regular.ttf', fonts.regular);
  pdf.addFont('StaffcraftSans-Regular.ttf', WORKSHEET_FONT_FAMILY, 'normal');
  pdf.addFileToVFS('StaffcraftSans-Bold.ttf', fonts.bold);
  pdf.addFont('StaffcraftSans-Bold.ttf', WORKSHEET_FONT_FAMILY, 'bold');
}

function parseSvg(markup: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = parsed.documentElement;
  if (root.nodeName !== 'svg') throw new Error('Page markup is not an SVG document');
  return document.importNode(root, true) as unknown as SVGSVGElement;
}

export interface PdfOptions {
  readonly title: string;
  readonly paperSize: PaperSize;
  readonly fonts: PdfFonts;
  /** Deflate page content (default true). Turned off in tests to inspect the output. */
  readonly compress?: boolean;
}

/**
 * Builds a PDF with the worksheet first and the answer key starting on a new page.
 * Requires a DOM (browser, or jsdom in tests).
 */
export async function createPdf(document: LaidOutDocument, options: PdfOptions): Promise<jsPDF> {
  const { width, height } = PAPER_SIZES[options.paperSize];
  const pdf = new jsPDF({
    unit: 'pt',
    format: [width, height],
    orientation: 'portrait',
    compress: options.compress ?? true,
  });
  registerFonts(pdf, options.fonts);
  pdf.setFont(WORKSHEET_FONT_FAMILY, 'normal');
  pdf.setDocumentProperties({
    title: options.title,
    subject: 'Music theory worksheet with answer key',
    creator: 'Staffcraft',
  });

  // svg2pdf reads computed styles, so pages are briefly attached off-screen.
  const host = window.document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden';
  window.document.body.appendChild(host);
  try {
    const pages = [...document.worksheet, ...document.answers];
    for (const [index, page] of pages.entries()) {
      if (index > 0) pdf.addPage([width, height], 'portrait');
      const svg = parseSvg(pageToSvg(page));
      host.replaceChildren(svg);
      await svg2pdf(svg, pdf, { x: 0, y: 0, width, height });
    }
  } finally {
    host.remove();
  }
  return pdf;
}

/** A safe file name such as "note-reading-practice.pdf". */
export function pdfFileName(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug === '' ? 'worksheet' : slug}.pdf`;
}
