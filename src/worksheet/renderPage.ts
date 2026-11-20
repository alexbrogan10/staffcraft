import type { Page, PageItem } from './layout';

/**
 * The family name the preview's @font-face and the PDF exporter both register.
 * Fallbacks keep the preview readable if the font has not loaded yet.
 */
export const WORKSHEET_FONT_FAMILY = 'Staffcraft Sans';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function itemToSvg(item: PageItem): string {
  switch (item.kind) {
    case 'text':
      return (
        `<text x="${n(item.x)}" y="${n(item.y)}" font-size="${n(item.size)}"` +
        (item.weight === 'bold' ? ' font-weight="bold"' : '') +
        (item.anchor === 'start' ? '' : ` text-anchor="${item.anchor}"`) +
        ` fill="${item.fill}">${escapeXml(item.text)}</text>`
      );
    case 'line':
      return (
        `<line x1="${n(item.x1)}" y1="${n(item.y1)}" x2="${n(item.x2)}" y2="${n(item.y2)}"` +
        ` stroke="${item.stroke}" stroke-width="${n(item.width)}"/>`
      );
    case 'staff':
      return `<g transform="translate(${n(item.x)} ${n(item.y)})">${item.markup}</g>`;
  }
}

/** A complete, standalone SVG document for one page, sized in points. */
export function pageToSvg(page: Page): string {
  const { width, height } = page;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}"` +
    ` viewBox="0 0 ${n(width)} ${n(height)}"` +
    ` font-family="${WORKSHEET_FONT_FAMILY}, 'DejaVu Sans', Verdana, sans-serif">` +
    `<rect width="${n(width)}" height="${n(height)}" fill="#ffffff"/>` +
    page.items.map(itemToSvg).join('') +
    `</svg>`
  );
}
