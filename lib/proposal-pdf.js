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

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || 'there';
}

// Generates a DXE Solutions proposal PDF — a cover letter followed by
// the formal proposal (project info, scope of services, itemized
// compensation breakdown, payment terms, limitations, and a signature
// block), matching the structure of DXE's own proposal letters. Returns
// a Uint8Array. Paginates automatically if content runs long.
//
// `signature`, when provided ({ pngBytes, signerName, signedAt }), is
// drawn directly onto the Authorization block's existing signature
// line instead of leaving it blank — this is what turns a sent
// proposal into a countersigned record once a client signs it.
export async function generateProposalPdf(proposal, lineItems, signature) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  function drawHeaderBar() {
    page.drawRectangle({ x: 0, y: PAGE_H - 16, width: PAGE_W, height: 16, color: NAVY_DARK });
    page.drawRectangle({ x: 0, y: PAGE_H - 19, width: PAGE_W, height: 3, color: GOLD });
  }

  function newPage() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H;
    drawHeaderBar();
    y -= 46;
  }

  function text(str, x, size, f, color) {
    page.drawText(str || '', { x, y, size, font: f || font, color: color || TEXT });
  }

  function textRight(str, rightEdge, size, f, color) {
    const fnt = f || font;
    page.drawText(str || '', { x: rightEdge - fnt.widthOfTextAtSize(str || '', size), y, size, font: fnt, color: color || TEXT });
  }

  function ensureSpace(needed) {
    if (y - needed < MARGIN + 30) newPage();
  }

  function paragraph(str, opts = {}) {
    const size = opts.size || 10;
    const f = opts.font || font;
    const lineHeight = opts.lineHeight || size + 4;
    // Respect explicit line breaks (e.g. a payment schedule entered one
    // milestone per line) as hard breaks, wrapping only within each one.
    String(str || '').split(/\n/).forEach((paraLine) => {
      const lines = wrapText(paraLine, f, size, PAGE_W - MARGIN * 2);
      (lines.length ? lines : ['']).forEach((line) => {
        ensureSpace(lineHeight);
        text(line, MARGIN, size, f, opts.color);
        y -= lineHeight;
      });
    });
  }

  function sectionLabel(str) {
    ensureSpace(20);
    text(str.toUpperCase(), MARGIN, 8.5, bold, GOLD);
    y -= 16;
  }

  drawHeaderBar();
  y -= 46;

  const dateStr = new Date(proposal.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // --- Cover letter ---
  text('DXE SOLUTIONS', MARGIN, 11, bold, NAVY);
  textRight(dateStr, PAGE_W - MARGIN, 9, font, TEXT_MUTED);
  y -= 14;
  text('Permitting & Project Management', MARGIN, 8, font, TEXT_MUTED);
  y -= 30;

  paragraph(`Dear ${firstName(proposal.client_name)},`, { size: 10.5 });
  y -= 6;

  if (proposal.intro_paragraph) {
    paragraph(proposal.intro_paragraph, { size: 10, lineHeight: 15 });
    y -= 6;
  }

  paragraph('We look forward to the opportunity to support your project.', { size: 10 });
  y -= 18;
  text('Sincerely,', MARGIN, 10, font, TEXT);
  y -= 16;
  text(proposal.prepared_by || 'DXE Solutions', MARGIN, 10, bold, NAVY);
  y -= 28;

  ensureSpace(20);
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: LINE });
  y -= 24;

  // --- Proposal header ---
  ensureSpace(24);
  text(`PROPOSAL — ${proposal.title || 'Scope of Work'}`, MARGIN, 15, bold, NAVY);
  y -= 22;
  ensureSpace(28);
  paragraph(`Project Address: ${proposal.project_address || '—'}`, { size: 8.5, lineHeight: 13, color: TEXT_MUTED });
  paragraph(`Client: ${proposal.client_name || '—'}  ·  Date: ${dateStr}`, { size: 8.5, lineHeight: 13, color: TEXT_MUTED });
  y -= 10;

  // --- Project description ---
  if (proposal.scope_summary) {
    sectionLabel('Project Description');
    paragraph(proposal.scope_summary, { size: 10, lineHeight: 15 });
    y -= 10;
  }

  // --- Scope of services (bullet list drawn from line items) ---
  if (lineItems && lineItems.length > 0) {
    sectionLabel('Scope of Services');
    lineItems.forEach((item) => {
      const label = `${item.category ? item.category + ' — ' : ''}${item.description || ''}`;
      const lines = wrapText(label, font, 9.5, PAGE_W - MARGIN * 2 - 14);
      lines.forEach((line, i) => {
        ensureSpace(13);
        text(i === 0 ? '•' : '', MARGIN, 9.5, font, GOLD);
        text(line, MARGIN + 12, 9.5, font, TEXT);
        y -= 13;
      });
    });
    y -= 8;
  }

  // --- Compensation breakdown table ---
  sectionLabel('Compensation Breakdown');
  ensureSpace(24);
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

  const totalsX = PAGE_W - MARGIN - 180;
  function totalRow(label, value, opts = {}) {
    text(label, totalsX, opts.size || 10, opts.font || font, opts.color || TEXT);
    textRight(money(value), PAGE_W - MARGIN, opts.size || 10, opts.font || font, opts.color || TEXT);
    y -= (opts.size || 10) + 8;
  }
  totalRow('Subtotal', proposal.subtotal);
  if (Number(proposal.adjustment) !== 0) {
    totalRow(proposal.adjustment_label || 'Adjustment', proposal.adjustment);
  }
  page.drawLine({ start: { x: totalsX, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 1, color: NAVY });
  y -= 6;
  totalRow('Total', proposal.total, { size: 13, font: bold, color: NAVY });
  y -= 16;

  // --- Payment terms ---
  if (proposal.payment_terms) {
    sectionLabel('Payment Terms');
    paragraph(proposal.payment_terms, { size: 9.5, lineHeight: 13.5 });
    y -= 8;
  }

  if (proposal.valid_until) {
    ensureSpace(14);
    text(`This proposal is valid until ${new Date(proposal.valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`, MARGIN, 9, italic, TEXT_MUTED);
    y -= 20;
  }

  // --- Limitations of responsibility ---
  if (proposal.limitations) {
    sectionLabel('Limitations of Responsibility');
    paragraph(proposal.limitations, { size: 8.5, lineHeight: 12.5, color: TEXT_MUTED });
    y -= 10;
  }

  // --- Authorization / signature block ---
  ensureSpace(signature ? 130 : 90);
  sectionLabel('Authorization');

  if (signature?.pngBytes) {
    const sigImage = await pdfDoc.embedPng(signature.pngBytes);
    const maxW = 200;
    const maxH = 26;
    const scale = Math.min(maxW / sigImage.width, maxH / sigImage.height, 1);
    const sigW = sigImage.width * scale;
    const sigH = sigImage.height * scale;
    y -= 4;
    page.drawImage(sigImage, { x: MARGIN + 4, y: y - sigH, width: sigW, height: sigH });
    y -= sigH + 4;
  } else {
    y -= 6;
  }
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 220, y }, thickness: 0.75, color: TEXT_MUTED });
  page.drawLine({ start: { x: MARGIN + 280, y }, end: { x: MARGIN + 420, y }, thickness: 0.75, color: TEXT_MUTED });
  if (signature?.signedAt) {
    page.drawText(signature.signedAt, { x: MARGIN + 280, y: y + 3, size: 9, font, color: TEXT });
  }
  y -= 12;
  text(signature ? `Signed by ${signature.signerName}` : 'Client Signature', MARGIN, 8, font, TEXT_MUTED);
  text('Date', MARGIN + 280, 8, font, TEXT_MUTED);
  y -= 30;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 220, y }, thickness: 0.75, color: TEXT_MUTED });
  y -= 12;
  text(`${proposal.prepared_by || 'DXE Solutions'}, DXE Solutions`, MARGIN, 8, font, TEXT_MUTED);

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
