import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const NAVY = rgb(0.243, 0.329, 0.408); // #3E5468
const NAVY_DARK = rgb(0.173, 0.243, 0.314); // #2C3E50
const GOLD = rgb(0.788, 0.659, 0.341); // #C9A857
const TEXT = rgb(0.16, 0.2, 0.24);
const TEXT_MUTED = rgb(0.44, 0.5, 0.56);
const LINE = rgb(0.86, 0.9, 0.93);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;

function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

// Generates a construction bid PDF from a bid row + its line items.
// Returns a Uint8Array. Paginates the line-item table if it runs long.
export async function generateBidPdf(bid, lineItems) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  function newPage() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H;
    drawHeaderBar();
    y -= 26;
  }

  function drawHeaderBar() {
    page.drawRectangle({ x: 0, y: PAGE_H - 16, width: PAGE_W, height: 16, color: NAVY_DARK });
    page.drawRectangle({ x: 0, y: PAGE_H - 19, width: PAGE_W, height: 3, color: GOLD });
  }

  function text(str, x, size, f, color) {
    page.drawText(str || '', { x, y, size, font: f || font, color: color || TEXT });
  }

  function textRight(str, rightEdge, size, f, color) {
    const fnt = f || font;
    page.drawText(str || '', { x: rightEdge - fnt.widthOfTextAtSize(str || '', size), y, size, font: fnt, color: color || TEXT });
  }

  function ensureSpace(needed) {
    if (y - needed < MARGIN + 40) newPage();
  }

  drawHeaderBar();
  y -= 46;

  text('DXE SOLUTIONS', MARGIN, 11, bold, NAVY);
  page.drawText('CONSTRUCTION BID', { x: PAGE_W - MARGIN - bold.widthOfTextAtSize('CONSTRUCTION BID', 18), y, size: 18, font: bold, color: NAVY });
  y -= 16;
  text('Permitting & Project Management', MARGIN, 8, font, TEXT_MUTED);
  const bidDate = new Date(bid.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dateLabel = `Date: ${bidDate}`;
  page.drawText(dateLabel, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(dateLabel, 9), y: y + 2, size: 9, font, color: TEXT_MUTED });
  y -= 30;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: LINE });
  y -= 22;

  // Title / project info block
  text(bid.title || 'Bid', MARGIN, 14, bold, NAVY);
  y -= 20;
  text('Prepared For', MARGIN, 8, bold, GOLD);
  text('Project Address', MARGIN + 280, 8, bold, GOLD);
  y -= 12;
  text(bid.client_name || '—', MARGIN, 10, font, TEXT);
  text(bid.project_address || '—', MARGIN + 280, 10, font, TEXT);
  y -= 14;
  if (bid.prepared_by) {
    text(`Prepared by: ${bid.prepared_by}`, MARGIN, 9, font, TEXT_MUTED);
  }
  if (bid.valid_until) {
    const label = `Valid until: ${new Date(bid.valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    page.drawText(label, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 9), y, size: 9, font, color: TEXT_MUTED });
  }
  y -= 20;

  if (bid.scope_summary) {
    const lines = wrapText(bid.scope_summary, font, 10, PAGE_W - MARGIN * 2);
    lines.forEach((line) => {
      ensureSpace(14);
      text(line, MARGIN, 10, font, TEXT);
      y -= 14;
    });
    y -= 8;
  }

  // Line items table. Numeric columns are right-aligned to their own
  // right edge so headers and values always line up regardless of digit
  // count or label length.
  ensureSpace(30);
  const rightEdge = PAGE_W - MARGIN;
  const col = { desc: MARGIN, descWidth: 260, qtyR: MARGIN + 300, unitL: MARGIN + 310, priceR: rightEdge - 70, amountR: rightEdge };
  page.drawRectangle({ x: MARGIN, y: y - 4, width: PAGE_W - MARGIN * 2, height: 20, color: rgb(0.96, 0.97, 0.98) });
  text('DESCRIPTION', col.desc + 6, 8, bold, NAVY);
  textRight('QTY', col.qtyR, 8, bold, NAVY);
  text('UNIT', col.unitL, 8, bold, NAVY);
  textRight('UNIT PRICE', col.priceR, 8, bold, NAVY);
  textRight('AMOUNT', col.amountR, 8, bold, NAVY);
  y -= 22;

  (lineItems || []).forEach((item) => {
    const descLines = wrapText(`${item.category ? item.category + ' — ' : ''}${item.description || ''}`, font, 9.5, col.descWidth);
    const rowHeight = Math.max(16, descLines.length * 12 + 4);
    ensureSpace(rowHeight + 4);

    descLines.forEach((line, i) => {
      page.drawText(line, { x: col.desc + 6, y: y - i * 12, size: 9.5, font, color: TEXT });
    });
    textRight(String(item.quantity ?? ''), col.qtyR, 9.5, font, TEXT);
    text(item.unit || '', col.unitL, 9.5, font, TEXT);
    textRight(money(item.unit_price), col.priceR, 9.5, font, TEXT);
    textRight(money(item.amount), col.amountR, 9.5, font, TEXT);
    y -= rowHeight;
    page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 0.5, color: LINE });
  });

  y -= 10;
  ensureSpace(80);

  // Totals
  const totalsX = PAGE_W - MARGIN - 180;
  function totalRow(label, value, opts = {}) {
    text(label, totalsX, opts.size || 10, opts.font || font, opts.color || TEXT);
    const str = money(value);
    const f = opts.font || font;
    const s = opts.size || 10;
    page.drawText(str, { x: PAGE_W - MARGIN - f.widthOfTextAtSize(str, s), y, size: s, font: f, color: opts.color || TEXT });
    y -= (opts.size || 10) + 8;
  }
  totalRow('Subtotal', bid.subtotal);
  if (Number(bid.adjustment) !== 0) {
    totalRow(bid.adjustment_label || 'Adjustment', bid.adjustment);
  }
  page.drawLine({ start: { x: totalsX, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 1, color: NAVY });
  y -= 6;
  totalRow('Total Bid Price', bid.total, { size: 13, font: bold, color: NAVY });
  y -= 14;

  if (bid.payment_terms) {
    ensureSpace(40);
    text('Payment Terms', MARGIN, 9, bold, GOLD);
    y -= 13;
    wrapText(bid.payment_terms, font, 9.5, PAGE_W - MARGIN * 2).forEach((line) => {
      ensureSpace(13);
      text(line, MARGIN, 9.5, font, TEXT);
      y -= 13;
    });
    y -= 10;
  }

  // Signature block
  ensureSpace(70);
  y -= 20;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 220, y }, thickness: 0.75, color: TEXT_MUTED });
  page.drawLine({ start: { x: MARGIN + 280, y }, end: { x: MARGIN + 420, y }, thickness: 0.75, color: TEXT_MUTED });
  y -= 12;
  text('Client Signature', MARGIN, 8, font, TEXT_MUTED);
  text('Date', MARGIN + 280, 8, font, TEXT_MUTED);

  // Footer on every page
  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    const footer = 'DXE Solutions  ·  dixie@dxesolutions.com  ·  323-364-0810';
    p.drawText(footer, { x: MARGIN, y: 28, size: 7.5, font, color: TEXT_MUTED });
    const pageLabel = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pageLabel, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(pageLabel, 7.5), y: 28, size: 7.5, font, color: TEXT_MUTED });
  });

  return pdfDoc.save();
}

function wrapText(str, font, size, maxWidth) {
  const words = String(str || '').split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
