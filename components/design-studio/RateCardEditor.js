'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateQuote, ADDON_ORDER } from '@/lib/design-studio/pricing';
import { C, S, money } from '@/lib/design-studio/brand';

/**
 * The spreadsheet's "Rates & Services" tab, with one addition: a live sample
 * quote so a rate change can be seen before it is committed.
 */
export default function RateCardEditor({ initialConfig }) {
  const router = useRouter();
  const [cfg, setCfg] = useState(initialConfig);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const dirty = useMemo(() => JSON.stringify(cfg) !== JSON.stringify(initialConfig), [cfg, initialConfig]);

  const sample = useMemo(
    () =>
      calculateQuote(
        { projectType: 'adu', serviceLevel: 'design', complexity: 'complex', areaSqft: 800 },
        cfg
      ),
    [cfg]
  );

  const setPackage = (typeKey, levelKey, value) =>
    setCfg((c) => ({
      ...c,
      projectTypes: {
        ...c.projectTypes,
        [typeKey]: {
          ...c.projectTypes[typeKey],
          packages: { ...c.projectTypes[typeKey].packages, [levelKey]: Number(value) || 0 },
        },
      },
    }));

  const setTypeField = (typeKey, field, value) =>
    setCfg((c) => ({
      ...c,
      projectTypes: { ...c.projectTypes, [typeKey]: { ...c.projectTypes[typeKey], [field]: Number(value) || 0 } },
    }));

  const setHours = (typeKey, levelKey, value) =>
    setCfg((c) => ({
      ...c,
      projectTypes: {
        ...c.projectTypes,
        [typeKey]: {
          ...c.projectTypes[typeKey],
          estHours: { ...c.projectTypes[typeKey].estHours, [levelKey]: Number(value) || 0 },
        },
      },
    }));

  const setBandMult = (typeKey, index, value) =>
    setCfg((c) => {
      const bands = c.projectTypes[typeKey].sizeBands.map((b, i) =>
        i === index ? { ...b, mult: Number(value) || 1 } : b
      );
      return { ...c, projectTypes: { ...c.projectTypes, [typeKey]: { ...c.projectTypes[typeKey], sizeBands: bands } } };
    });

  const setAddOn = (key, field, value) =>
    setCfg((c) => ({
      ...c,
      addOns: { ...c.addOns, [key]: { ...c.addOns[key], [field]: Number(value) || 0 } },
    }));

  const setGlobal = (key, value) => setCfg((c) => ({ ...c, [key]: Number(value) || 0 }));

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/design-studio/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage(`Saved as version ${data.config.version}. New quotes will use it.`);
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm('Restore the shipped default rates as a new version?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/design-studio/config', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setCfg(data.config);
      setMessage('Defaults restored.');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const levelKeys = Object.keys(cfg.serviceLevels || {});
  const num = { ...S.input, padding: '7px 9px', fontSize: 14 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 290px', gap: 22, alignItems: 'start' }}>
      <div>
        <section style={S.card}>
          <h2 style={S.h2}>Package starting prices</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ color: C.muted, fontSize: 11.5, letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px 6px 0' }}>Project type</th>
                  {levelKeys.map((k) => (
                    <th key={k} style={{ padding: '6px 10px' }}>{cfg.serviceLevels[k].label}</th>
                  ))}
                  <th style={{ padding: '6px 10px' }}>Minimum</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cfg.projectTypes).map(([tk, t]) => (
                  <tr key={tk} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: '9px 10px 9px 0', fontWeight: 600 }}>{t.label}</td>
                    {levelKeys.map((lk) => (
                      <td key={lk} style={{ padding: '9px 10px' }}>
                        <input style={{ ...num, width: 100 }} type="number" value={t.packages[lk]} onChange={(e) => setPackage(tk, lk, e.target.value)} />
                      </td>
                    ))}
                    <td style={{ padding: '9px 10px' }}>
                      <input style={{ ...num, width: 100 }} type="number" value={t.minimumFee} onChange={(e) => setTypeField(tk, 'minimumFee', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>Size band multipliers</h2>
          <div style={{ ...S.small, marginBottom: 12 }}>
            Square footage moves the price through these bands rather than a per-sf rate.
          </div>
          {Object.entries(cfg.projectTypes).map(([tk, t]) => (
            <div key={tk} style={{ borderTop: `1px solid ${C.line}`, padding: '11px 0' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 7 }}>{t.label}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {t.sizeBands.map((b, i) => (
                  <div key={b.label} style={{ minWidth: 128 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{b.label}</div>
                    <input style={{ ...num, width: 92 }} type="number" step="0.05" value={b.mult} onChange={(e) => setBandMult(tk, i, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>Add-on rates</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {ADDON_ORDER.filter((k) => cfg.addOns?.[k]).map((k) => (
              <div key={k}>
                <label style={S.label}>{cfg.addOns[k].label}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ ...num, width: 95 }} type="number" value={cfg.addOns[k].rate} onChange={(e) => setAddOn(k, 'rate', e.target.value)} />
                  <span style={{ fontSize: 12.5, color: C.muted }}>/ {cfg.addOns[k].unit}</span>
                </div>
                {cfg.addOns[k].premiumRate != null ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    <input style={{ ...num, width: 95 }} type="number" value={cfg.addOns[k].premiumRate} onChange={(e) => setAddOn(k, 'premiumRate', e.target.value)} />
                    <span style={{ fontSize: 12.5, color: C.muted }}>Premium level</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>Estimated studio hours</h2>
          <div style={{ ...S.small, marginBottom: 12 }}>
            Internal only. Drives the margin check on every quote — keep these honest and the
            implied hourly rate stays meaningful.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {Object.entries(cfg.projectTypes).map(([tk, t]) => (
                  <tr key={tk} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: '9px 10px 9px 0', fontWeight: 600 }}>{t.label}</td>
                    {levelKeys.map((lk) => (
                      <td key={lk} style={{ padding: '9px 10px' }}>
                        <input style={{ ...num, width: 78 }} type="number" value={t.estHours?.[lk] ?? 0} onChange={(e) => setHours(tk, lk, e.target.value)} />
                        <span style={{ fontSize: 12, color: C.muted, marginLeft: 6 }}>{cfg.serviceLevels[lk].label}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>Global settings</h2>
          <div style={S.grid2}>
            <Field label="Deposit %" value={cfg.depositPct} step="0.05" onChange={(v) => setGlobal('depositPct', v)} />
            <Field label="Rush premium %" value={cfg.rushPct} step="0.05" onChange={(v) => setGlobal('rushPct', v)} />
            <Field label="Trade partner discount %" value={cfg.tradePartnerDiscountPct} step="0.01" onChange={(v) => setGlobal('tradePartnerDiscountPct', v)} />
            <Field label="Quote valid (days)" value={cfg.quoteValidDays} step="1" onChange={(v) => setGlobal('quoteValidDays', v)} />
            <Field label="Round quotes to nearest $" value={cfg.roundTo} step="5" onChange={(v) => setGlobal('roundTo', v)} />
            <Field label="Target hourly ($)" value={cfg.targetHourly} step="5" onChange={(v) => setGlobal('targetHourly', v)} />
          </div>
          <div style={{ ...S.small, marginTop: 10 }}>Percentages are stored as decimals — 0.3 means 30%.</div>
        </section>
      </div>

      <aside style={{ position: 'sticky', top: 20 }}>
        <div style={S.card}>
          <h2 style={S.h2}>Live sample</h2>
          <div style={{ ...S.small, marginBottom: 10 }}>800 sf ADU · Design · Complex</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{money(sample.total)}</div>
          <div style={{ ...S.small, marginTop: 6 }}>
            Deposit {money(sample.deposit)} · {sample.internal.impliedHourly ? `$${sample.internal.impliedHourly}/hr` : '—'}
            {sample.internal.belowTarget ? (
              <span style={{ color: C.warn }}> · below target</span>
            ) : null}
          </div>
        </div>

        <div style={S.card}>
          <label style={S.label}>Note for this version</label>
          <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Q4 increase" />
          {message ? <div style={{ ...S.small, color: C.good, marginTop: 10 }}>{message}</div> : null}
          {error ? <div style={{ ...S.small, color: C.warn, marginTop: 10 }}>{error}</div> : null}
          <button style={{ ...S.btn, width: '100%', marginTop: 12, opacity: dirty ? 1 : 0.5 }} onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save as new version'}
          </button>
          <button style={{ ...S.btnGhost, width: '100%', marginTop: 8 }} onClick={reset} disabled={saving}>
            Restore defaults
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value, step, onChange }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input style={S.input} type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
