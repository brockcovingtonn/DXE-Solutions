'use client';

export default function PrintButton({ label = 'Print / Save as PDF', className }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      <i className="ti ti-printer" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i>
      {label}
    </button>
  );
}
