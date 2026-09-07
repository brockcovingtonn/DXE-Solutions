import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Appends a new last page to the given PDF stamping the signature
// image, signer name, and timestamp — the original pages are left
// untouched. Returns the resulting PDF as a Uint8Array.
export async function stampSignatureOntoPdf({ pdfBytes, signaturePngBytes, signerName, signedAt }) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const signatureImage = await pdfDoc.embedPng(signaturePngBytes);

  const pageWidth = 612; // US Letter, points
  const pageHeight = 792;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const margin = 72;
  let y = pageHeight - margin;

  page.drawText('Signature Confirmation', {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.15, 0.25),
  });
  y -= 40;

  const maxSignatureWidth = 280;
  const scale = Math.min(1, maxSignatureWidth / signatureImage.width);
  const signatureWidth = signatureImage.width * scale;
  const signatureHeight = signatureImage.height * scale;

  page.drawRectangle({
    x: margin,
    y: y - signatureHeight - 20,
    width: signatureWidth + 40,
    height: signatureHeight + 40,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });

  page.drawImage(signatureImage, {
    x: margin + 20,
    y: y - signatureHeight - 0,
    width: signatureWidth,
    height: signatureHeight,
  });
  y -= signatureHeight + 40;

  page.drawText(`Signed by: ${signerName}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;

  page.drawText(`Date: ${signedAt}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  page.drawText('This page was added by DXE Solutions to record an electronic signature.', {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}
