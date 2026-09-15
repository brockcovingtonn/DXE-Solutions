'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateQuote, ADDON_ORDER, EMPTY_INPUT, addOnRate } from '@/lib/design-studio/pricing';
import { BRAND, C, S, money } from '@/lib/design-studio/brand';
import ProposalDocument from './ProposalDocument';

export default function QuoteBuilder({ config, viewer, initial, quoteId }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY_INPUT, ...(initial || {}) });
  const [tab, setTab] = useState('build');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const quote = useMemo(() => calculateQuote(form, config), [form, config]);

  const set = (key) => (e) => {
    const el = e.target;
    const value = el.type === 'checkbox' ? el.checked : el.value;
    setForm((f) => ({ ...f, [key]: value }));
  };
  const setNumber = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value === '' ? '' : Number(e.target.value) }));
  const setAddOn = (key) => (e) => {
    const v = Math.max(0, Number(e.target.value) || 0);
    setForm((f) => ({ ...f, addOns: { ...f.addOns, [key]: v } }));
  };

  async function save() {
    setSaving(true);
    setError('');
    try {
      const url = quoteId ? `/api/design-studio/quotes/${quoteId}` : '/api/design-studio/quotes';
      const res = await fetch(url, {
        method: quoteId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteId ? { reprice: form } : form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the quote.');
      router.push(`/design-studio/${quoteId || data.quote.id}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const types = Object.entries(config.projectTypes || {});
  const levels = Object.entries(config.serviceLevels || {});
  const complexities = Object.entries(config.complexity || {});
  const activeType = config.projectTypes[quote.inputs.projectType];

  const tabBtn = (key, label) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      style={{
        padding: '9px 16px',
        border: 'none',
        borderBottom: tab === key ? `2px solid ${C.clay}` : '2px solid transparent',
        background: 'transparent',
        color: tab === key ? C.ink : C.muted,
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, marginBottom: 20 }}>
        {tabBtn('build', 'Build quote')}
        {tabBtn('preview', 'Client proposal preview')}
      </div>

      {tab === 'preview' ? (
        <ProposalDocument
          quote={{
            client_name: form.clientName,
            project_address: form.projectAddress,
            quote_number: 'PREVIEW',
            created_at: new Date().toISOString(),
          }}
          pricing={quote}
          watermark="Preview"
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 22, alignItems: 'start' }}>
          <div>
            {/* 1 — Client */}
            <section style={S.card}>
              <h2 style={S.h2}>1 · Client</h2>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Client name</label>
                  <input style={S.input} value={form.clientName} onChange={set('clientName')} placeholder="Jane Whitfield" />
                </div>
                <div>
                  <label style={S.label}>Email</label>
                  <input style={S.input} value={form.clientEmail} onChange={set('clientEmail')} placeholder="jane@example.com" />
                </div>
                <div>
                  <label style={S.label}>Phone</label>
                  <input style={S.input} value={form.clientPhone} onChange={set('clientPhone')} />
                </div>
                <div>
                  <label style={S.label}>Project address</label>
                  <input style={S.input} value={form.projectAddress} onChange={set('projectAddress')} placeholder="2068 N Beverly Dr" />
                </div>
              </div>
            </section>

            {/* 2 — Project */}
            <section style={S.card}>
              <h2 style={S.h2}>2 · Project</h2>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Project type</label>
                  <select style={S.input} value={form.projectType} onChange={set('projectType')}>
                    {types.map(([k, t]) => (
                      <option key={k} value={k}>{t.label}</option>
                    ))}
                  </select>
                  <div style={{ ...S.small, marginTop: 5 }}>{activeType?.note}</div>
                </div>
                <div>
                  <label style={S.label}>Approximate design area (sf)</label>
                  <input style={S.input} type="number" min="0" value={form.areaSqft} onChange={setNumber('areaSqft')} />
                  <div style={{ ...S.small, marginTop: 5 }}>
                    Band: <strong style={{ color: C.ink }}>{quote.labels.sizeBand}</strong> ({quote.package.sizeBand.mult}×)
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={S.label}>Service level</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  {levels.map(([k, l]) => {
                    const on = form.serviceLevel === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setForm((f) => ({ ...f, serviceLevel: k }))}
                        style={{
                          textAlign: 'left', padding: '12px 14px', cursor: 'pointer',
                          border: `1px solid ${on ? C.clay : C.line}`,
                          background: on ? '#FBF6F1' : C.paper,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                          {l.label}{l.recommended ? ' ★' : ''}
                        </div>
                        <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>
                          {money(activeType?.packages?.[k] || 0)} starting
                        </div>
                        <div style={{ ...S.small, marginTop: 5 }}>{l.blurb}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={S.label}>Complexity</label>
                <select style={S.input} value={form.complexity} onChange={set('complexity')}>
                  {complexities.map(([k, c]) => (
                    <option key={k} value={k}>{c.label} ({c.mult}×)</option>
                  ))}
                </select>
                <div style={{ ...S.small, marginTop: 5 }}>
                  {config.complexity[quote.inputs.complexity]?.when}
                </div>
              </div>
            </section>

            {/* 3 — Add-ons */}
            <section style={S.card}>
              <h2 style={S.h2}>3 · Add-ons</h2>
              <div style={S.grid2}>
                {ADDON_ORDER.filter((k) => config.addOns?.[k]).map((k) => {
                  const def = config.addOns[k];
                  const rate = addOnRate(k, config, quote.inputs.serviceLevel);
                  return (
                    <div key={k}>
                      <label style={S.label}>{def.label}</label>
                      <input
                        style={S.input}
                        type="number"
                        min="0"
                        value={form.addOns?.[k] ?? 0}
                        onChange={setAddOn(k)}
                      />
                      <div style={{ ...S.small, marginTop: 4 }}>{money(rate)} per {def.unit}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14.5 }}>
                  <input type="checkbox" checked={!!form.rush} onChange={set('rush')} />
                  Rush delivery (+{Math.round((config.rushPct || 0) * 100)}%)
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14.5 }}>
                  <input type="checkbox" checked={!!form.tradePartner} onChange={set('tradePartner')} />
                  Trade partner rate (−{Math.round((config.tradePartnerDiscountPct || 0) * 100)}%)
                </label>
              </div>
            </section>

            {/* 4 — Internal */}
            <section style={S.card}>
              <h2 style={S.h2}>4 · Internal only</h2>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Manual adjustment ($)</label>
                  <input style={S.input} type="number" value={form.manualAdjustment} onChange={setNumber('manualAdjustment')} />
                </div>
                <div>
                  <label style={S.label}>Reason for adjustment</label>
                  <input style={S.input} value={form.adjustmentNote} onChange={set('adjustmentNote')} placeholder="Repeat client, second unit" />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={S.label}>Internal notes</label>
                <textarea style={{ ...S.input, minHeight: 74, resize: 'vertical' }} value={form.internalNotes} onChange={set('internalNotes')} />
              </div>
              <div style={{ ...S.small, marginTop: 10 }}>Nothing in this section appears on the client proposal.</div>
            </section>
          </div>

          {/* Sticky summary */}
          <aside style={{ position: 'sticky', top: 20 }}>
            <div style={{ ...S.card, marginBottom: 14 }}>
              <h2 style={S.h2}>Price build</h2>
              <Row label={`${quote.labels.serviceLevel} base`} value={money(quote.package.base)} />
              <Row label={`Size — ${quote.labels.sizeBand}`} value={quote.package.sizeBand.amount ? `+${money(quote.package.sizeBand.amount)}` : '—'} />
              <Row label={`Complexity — ${quote.labels.complexity}`} value={quote.package.complexity.amount ? `+${money(quote.package.complexity.amount)}` : '—'} />
              {quote.rush.applied ? <Row label="Rush premium" value={`+${money(quote.rush.amount)}`} /> : null}
              {quote.addOnTotal ? <Row label="Add-ons" value={`+${money(quote.addOnTotal)}`} /> : null}
              {quote.tradePartner.applied ? <Row label="Trade partner" value={`−${money(quote.tradePartner.amount)}`} accent={C.warn} /> : null}
              {quote.adjustment ? <Row label="Adjustment" value={`${quote.adjustment > 0 ? '+' : '−'}${money(Math.abs(quote.adjustment))}`} accent={C.warn} /> : null}
              {quote.minimum.applied ? (
                <Row label={`Minimum fee applied`} value={money(quote.minimum.fee)} accent={C.warn} />
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, marginTop: 6, borderTop: `2px solid ${C.ink}` }}>
                <strong style={{ fontSize: 16 }}>Total</strong>
                <strong style={{ fontSize: 22 }}>{money(quote.total)}</strong>
              </div>
              <div style={{ ...S.small, marginTop: 8 }}>
                Deposit {money(quote.deposit)} · Balance {money(quote.balance)}
              </div>
            </div>

            <div style={{ ...S.card, marginBottom: 14, background: quote.internal.belowTarget ? '#FCF4EE' : C.paper }}>
              <h2 style={S.h2}>Margin check</h2>
              <Row label="Est. studio hours" value={`${quote.internal.estHours} hrs`} />
              <Row
                label="Implied rate"
                value={quote.internal.impliedHourly ? `$${quote.internal.impliedHourly}/hr` : '—'}
                accent={quote.internal.belowTarget ? C.warn : C.good}
              />
              <Row label="Effective" value={quote.internal.effectivePerSqft ? `$${quote.internal.effectivePerSqft}/sf` : '—'} />
              <Row label="Included views" value={String(quote.included.renderedViews)} />
              {quote.internal.belowTarget ? (
                <div style={{ ...S.small, color: C.warn, marginTop: 10 }}>
                  Below the ${quote.internal.targetHourly}/hr target. Check the hours estimate or raise the level.
                </div>
              ) : null}
            </div>

            {error ? (
              <div style={{ ...S.small, color: C.warn, marginBottom: 10 }}>{error}</div>
            ) : null}
            <button style={{ ...S.btn, width: '100%' }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : quoteId ? 'Save changes' : 'Save quote'}
            </button>
            <div style={{ ...S.small, marginTop: 10, textAlign: 'center' }}>
              Priced on {BRAND.shortName} rate card v{config.version}
              {viewer ? ` · ${viewer.name}` : ''}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 14 }}>
      <span style={{ color: C.inkSoft }}>{label}</span>
      <span style={{ fontWeight: 600, color: accent || C.ink }}>{value}</span>
    </div>
  );
}
