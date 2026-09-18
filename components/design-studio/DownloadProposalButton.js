'use client';

import { S } from '@/lib/design-studio/brand';

// Triggers the browser's native print dialog ("Save as PDF" is a standard
// destination in every major browser) rather than generating a file
// server-side — the proposal is a live page, not a stored document, so
// this stays in sync with it automatically. Print CSS in ProposalDocument
// hides everything except the proposal itself when this fires.
export default function DownloadProposalButton({ style }) {
  return (
    <button
      type="button"
      className="ds-no-print"
      onClick={() => window.print()}
      style={{ ...S.btnGhost, ...style }}
    >
      Download PDF
    </button>
  );
}
