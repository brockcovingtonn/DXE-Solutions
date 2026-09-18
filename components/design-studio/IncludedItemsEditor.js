'use client';

import { useState } from 'react';
import { C, S } from '@/lib/design-studio/brand';

/**
 * Popup for editing this ONE quote's "What is included" bullet list.
 * Doesn't touch the rate card — saving here only sets `includedOverride`
 * on the quote being built, so every other quote's defaults are untouched.
 */
export default function IncludedItemsEditor({ levelLabel, defaultBullets, initialBullets, onSave, onClose }) {
  const [bullets, setBullets] = useState(initialBullets && initialBullets.length ? initialBullets : defaultBullets);

  function updateLine(i, value) {
    setBullets((prev) => prev.map((b, idx) => (idx === i ? value : b)));
  }
  function removeLine(i) {
    setBullets((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveLine(i, direction) {
    setBullets((prev) => {
      const j = i + direction;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function addLine() {
    setBullets((prev) => [...prev, '']);
  }
  function resetToDefault() {
    setBullets(defaultBullets);
  }

  function handleSave() {
    const cleaned = bullets.map((b) => b.trim()).filter(Boolean);
    onSave(cleaned.length ? cleaned : null);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,28,36,0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.paper, borderRadius: 10, width: '100%', maxWidth: 560, maxHeight: '85vh', overflow: 'auto', padding: 24 }}
      >
        <h2 style={{ ...S.h2, marginBottom: 2 }}>Edit line items — {levelLabel}</h2>
        <p style={{ ...S.small, marginBottom: 16 }}>
          Only this quote's proposal is affected — the {levelLabel} package everywhere else is unchanged.
        </p>

        {bullets.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <button
                type="button"
                onClick={() => moveLine(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 4, width: 22, height: 16, cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? C.line : C.muted, fontSize: 10, lineHeight: 1, padding: 0 }}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveLine(i, 1)}
                disabled={i === bullets.length - 1}
                aria-label="Move down"
                style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 4, width: 22, height: 16, cursor: i === bullets.length - 1 ? 'default' : 'pointer', color: i === bullets.length - 1 ? C.line : C.muted, fontSize: 10, lineHeight: 1, padding: 0 }}
              >
                ▼
              </button>
            </div>
            <input
              style={{ ...S.input, flex: 1 }}
              value={b}
              onChange={(e) => updateLine(i, e.target.value)}
              placeholder="Line item"
            />
            <button
              type="button"
              onClick={() => removeLine(i)}
              aria-label="Remove line"
              style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: 6, width: 30, height: 30, cursor: 'pointer', color: C.muted, fontSize: 15, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ))}

        <button type="button" onClick={addLine} style={{ ...S.btnGhost, marginTop: 4, fontSize: 13 }}>
          + Add line
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
          <button type="button" onClick={resetToDefault} style={{ ...S.small, background: 'none', border: 'none', color: C.clay, cursor: 'pointer', fontWeight: 600 }}>
            Reset to default
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={S.btnGhost}>Cancel</button>
            <button type="button" onClick={handleSave} style={S.btn}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
