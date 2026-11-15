import { PDFDocument, rgb } from 'pdf-lib';

/** Screen PDF: one page per card image, sized 1 CSS px = 0.75pt (`scale` = image pixels per CSS px). */
export async function buildScreenPdf(pages: Buffer[], scale = 1): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (const bytes of pages) {
    const img = await pdf.embedJpg(bytes);
    const w = (img.width / scale) * 0.75;
    const h = (img.height / scale) * 0.75;
    pdf.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  return Buffer.from(await pdf.save());
}

/**
 * Print-ready PDF: 300 DPI artwork that already includes bleed, placed on a larger sheet with
 * crop marks in the slug area. TrimBox/BleedBox are set so any press can impose it correctly.
 */
export async function buildPrintPdf(pages: Buffer[], bleedPx: number, dpi = 300): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Invitation — print ready');
  const pxToPt = 72 / dpi;
  const slug = 18; // pt of margin around the bleed for crop marks
  const markLen = 12;
  const bleed = bleedPx * pxToPt;

  for (const bytes of pages) {
    const img = await pdf.embedPng(bytes);
    const artW = img.width * pxToPt;
    const artH = img.height * pxToPt;
    const page = pdf.addPage([artW + slug * 2, artH + slug * 2]);
    page.drawImage(img, { x: slug, y: slug, width: artW, height: artH });

    const trim = { x: slug + bleed, y: slug + bleed, w: artW - bleed * 2, h: artH - bleed * 2 };
    page.setBleedBox(slug, slug, artW, artH);
    page.setTrimBox(trim.x, trim.y, trim.w, trim.h);

    const black = rgb(0, 0, 0);
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.25, color: black });
    const xs = [trim.x, trim.x + trim.w];
    const ys = [trim.y, trim.y + trim.h];
    for (const x of xs) {
      line(x, 0, x, Math.min(markLen, slug - 2));
      line(x, page.getHeight(), x, page.getHeight() - Math.min(markLen, slug - 2));
    }
    for (const y of ys) {
      line(0, y, Math.min(markLen, slug - 2), y);
      line(page.getWidth(), y, page.getWidth() - Math.min(markLen, slug - 2), y);
    }
  }
  return Buffer.from(await pdf.save());
}
