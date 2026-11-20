import { useRef, useState } from 'react';
import type { PdfFonts } from '../../export';
import { buildWorksheet, layoutDocument, type WorksheetConfig } from '../../worksheet';
import { renderer } from '../renderer';
import { Icon } from './Icon';

type Status = 'idle' | 'working' | 'error';

export function ExportButton({ config }: { config: WorksheetConfig }) {
  const [status, setStatus] = useState<Status>('idle');
  const fonts = useRef<Promise<PdfFonts> | null>(null);

  const exportPdf = async () => {
    setStatus('working');
    try {
      // jsPDF is large, so it loads only when someone exports.
      const pdfModule = await import('../../export');
      fonts.current ??= pdfModule.loadPdfFonts();
      const document = layoutDocument(buildWorksheet(config), renderer);
      const pdf = await pdfModule.createPdf(document, {
        title: config.title.trim() || 'Music Theory Worksheet',
        paperSize: config.paperSize,
        fonts: await fonts.current,
      });
      pdf.save(pdfModule.pdfFileName(config.title));
      setStatus('idle');
    } catch (error) {
      console.error(error);
      fonts.current = null;
      setStatus('error');
    }
  };

  return (
    <div className="export">
      <button
        type="button"
        className="button button--primary"
        disabled={status === 'working' || config.sections.length === 0}
        onClick={() => {
          void exportPdf();
        }}
      >
        <Icon name="download" />
        {status === 'working' ? 'Preparing PDF…' : 'Download PDF'}
      </button>
      <p className="export__status" role="status">
        {status === 'error' ? 'Sorry, the PDF could not be created. Please try again.' : ''}
      </p>
    </div>
  );
}
