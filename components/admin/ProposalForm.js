'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PROPOSAL_SCOPE_GROUPS, PROPOSAL_UNITS } from '@/lib/constants';
import ProposalPreviewModal from '@/components/admin/ProposalPreviewModal';

let keyCounter = 0;
function nextKey() {
  keyCounter += 1;
  return `new-${keyCounter}`;
}

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

const DEFAULT_INTRO =
  'Thank you for considering DXE Solutions. We are committed to providing structured, results-driven project support while coordinating closely with all stakeholders to help ensure smooth execution and successful project outcomes. DXE Solutions was founded with a clear mission: to simplify and streamline the construction backend process. Our services are detail-oriented, practical, and focused on solving real-world challenges faced in the construction and engineering environment.';

const DEFAULT_LIMITATIONS =
  'This proposal is based on the scope of work described herein and information reasonably available at the time of preparation. Pricing assumes normal working conditions and does not include costs arising from concealed or unforeseen conditions, code changes, or scope changes requested after acceptance — any such items will be addressed through a written change order. Permit fees, utility fees, and other third-party or agency fees are the responsibility of the property owner unless specifically included above. This proposal is not a contract; a signed agreement and deposit are required before work begins.';

// Same card/section visual language as components/design-studio/QuoteBuilder.js
// (numbered cards, gold uppercase section headers, sticky price summary) —
// defined locally rather than imported from lib/design-studio/brand.js, which
// is deliberately self-contained to that feature. Same CSS custom properties
// either way, so the result looks identical.
const S = {
  card: { background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 22, marginBottom: 18 },
  h2: { fontSize: 13, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 14px' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 6 },
  input: { width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 15, background: '#fff', color: '#1a2530', boxSizing: 'border-box' },
  btn: { padding: '10px 18px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGhost: { padding: '10px 18px', background: 'transparent', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 },
  small: { fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 },
};

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 14 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{value}</span>
    </div>
  );
}

export default function ProposalForm({ projectId, proposalId, initialProposal, initialLineItems, project, preparedByDefault }) {
  const router = useRouter();

  const [title, setTitle] = useState(initialProposal?.title || `${project.name} — Proposal`);
  const [clientName, setClientName] = useState(
    initialProposal?.client_name || [project.profiles?.first_name, project.profiles?.last_name].filter(Boolean).join(' ') || ''
  );
  const [projectAddress, setProjectAddress] = useState(initialProposal?.project_address || project.address || '');
  const [preparedBy, setPreparedBy] = useState(initialProposal?.prepared_by || preparedByDefault || '');
  const [introParagraph, setIntroParagraph] = useState(initialProposal?.intro_paragraph ?? DEFAULT_INTRO);
  const [scopeSummary, setScopeSummary] = useState(initialProposal?.scope_summary || '');
  const [paymentTerms, setPaymentTerms] = useState(initialProposal?.payment_terms || '50% deposit due upon acceptance, balance due upon completion.');
  const [limitations, setLimitations] = useState(initialProposal?.limitations ?? DEFAULT_LIMITATIONS);
  const [validUntil, setValidUntil] = useState(initialProposal?.valid_until || '');
  const [notes, setNotes] = useState(initialProposal?.notes || '');
  const [adjustment, setAdjustment] = useState(initialProposal?.adjustment ?? 0);
  const [adjustmentLabel, setAdjustmentLabel] = useState(initialProposal?.adjustment_label || 'Discount');

  const [selectedScopes, setSelectedScopes] = useState(() => new Set(initialProposal?.selected_scopes || []));
  const [lineItems, setLineItems] = useState(() =>
    (initialLineItems && initialLineItems.length > 0
      ? initialLineItems.map((li) => ({ ...li, _key: li.id }))
      : []
    )
  );

  const [estimates, setEstimates] = useState({});
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [currentProposalId, setCurrentProposalId] = useState(proposalId || null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);
    const total = subtotal + (Number(adjustment) || 0);
    return { subtotal, total };
  }, [lineItems, adjustment]);

  function toggleScope(item) {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(item.key)) {
        next.delete(item.key);
        setLineItems((li) => li.filter((row) => row.category !== item.label));
      } else {
        next.add(item.key);
        setLineItems((li) => [
          ...li,
          { _key: nextKey(), category: item.label, description: item.description, quantity: 1, unit: item.unit, unit_price: 0 },
        ]);
      }
      return next;
    });
  }

  function updateLineItem(key, field, value) {
    setLineItems((li) => li.map((row) => (row._key === key ? { ...row, [field]: value } : row)));
  }

  function removeLineItem(key) {
    setLineItems((li) => li.filter((row) => row._key !== key));
  }

  function addCustomLineItem() {
    setLineItems((li) => [...li, { _key: nextKey(), category: '', description: '', quantity: 1, unit: 'LS', unit_price: 0 }]);
  }

  async function fetchEstimates() {
    const categories = [...new Set(lineItems.map((li) => li.category).filter(Boolean))];
    if (categories.length === 0) return;
    setEstimating(true);
    try {
      const res = await fetch(`/api/admin/proposals/estimate?categories=${encodeURIComponent(categories.join(','))}`);
      const data = await res.json();
      if (res.ok) setEstimates(data.estimates || {});
    } finally {
      setEstimating(false);
    }
  }

  function buildPayload() {
    return {
      projectId,
      title,
      clientName,
      projectAddress,
      preparedBy,
      introParagraph,
      scopeSummary,
      selectedScopes: [...selectedScopes],
      paymentTerms,
      limitations,
      validUntil: validUntil || null,
      notes,
      adjustment: Number(adjustment) || 0,
      adjustmentLabel,
      lineItems: lineItems.map((li) => ({
        category: li.category,
        description: li.description,
        quantity: Number(li.quantity) || 0,
        unit: li.unit,
        unit_price: Number(li.unit_price) || 0,
      })),
    };
  }

  async function saveDraft() {
    setSaving(true);
    setMessage('');
    try {
      if (currentProposalId) {
        const res = await fetch(`/api/admin/proposals/${currentProposalId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessage('Draft saved.');
        router.refresh();
        return { id: currentProposalId };
      }
      const res = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentProposalId(data.proposal.id);
      setMessage('Draft saved.');
      router.replace(`/admin/projects/${projectId}/proposals/${data.proposal.id}`);
      return { id: data.proposal.id };
    } catch (err) {
      setMessage(err.message || 'Could not save this proposal.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalizeClick() {
    if (lineItems.length === 0) {
      setMessage('Add at least one scope item before finalizing.');
      return;
    }
    if (!clientName.trim() || !projectAddress.trim()) {
      setMessage('Client name and project address are required.');
      return;
    }
    const saved = await saveDraft();
    if (!saved) return;
    setPreviewData({
      proposal: {
        title,
        client_name: clientName,
        project_address: projectAddress,
        prepared_by: preparedBy,
        intro_paragraph: introParagraph,
        scope_summary: scopeSummary,
        payment_terms: paymentTerms,
        limitations,
        valid_until: validUntil,
        subtotal: totals.subtotal,
        adjustment: Number(adjustment) || 0,
        adjustment_label: adjustmentLabel,
        total: totals.total,
        created_at: initialProposal?.created_at || new Date().toISOString(),
      },
      lineItems: lineItems.map((li) => ({
        ...li,
        amount: (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
      })),
    });
    setShowPreview(true);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 22, alignItems: 'start' }}>
      <div>
        {/* 1 — Details */}
        <section style={S.card}>
          <h2 style={S.h2}>1 · Proposal details</h2>
          <div style={S.grid2}>
            <div>
              <label style={S.label}>Proposal title</label>
              <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Prepared by</label>
              <input style={S.input} value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Client name</label>
              <input style={S.input} value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Project address</label>
              <input style={S.input} value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={S.label}>Valid until</label>
            <input style={{ ...S.input, maxWidth: 200 }} type="date" value={validUntil || ''} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </section>

        {/* 2 — Cover letter */}
        <section style={S.card}>
          <h2 style={S.h2}>2 · Cover letter</h2>
          <label style={S.label}>Intro paragraph</label>
          <textarea style={{ ...S.input, minHeight: 90, resize: 'vertical' }} value={introParagraph} onChange={(e) => setIntroParagraph(e.target.value)} />
          <div style={{ marginTop: 14 }}>
            <label style={S.label}>Project description (optional)</label>
            <textarea style={{ ...S.input, minHeight: 70, resize: 'vertical' }} value={scopeSummary} onChange={(e) => setScopeSummary(e.target.value)} />
          </div>
        </section>

        {/* 3 — Scope of work */}
        <section style={S.card}>
          <h2 style={S.h2}>3 · Scope of work</h2>
          <div style={{ ...S.small, marginBottom: 14 }}>
            Click to add or remove a scope item. Each one drops a line item into the proposal below and a bullet into the Scope of Services section.
          </div>
          {PROPOSAL_SCOPE_GROUPS.map((group) => (
            <div key={group.group} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 7 }}>
                {group.group}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.items.map((item) => {
                  const active = selectedScopes.has(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleScope(item)}
                      style={{
                        padding: '7px 14px',
                        fontSize: 13,
                        borderRadius: 999,
                        border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
                        background: active ? 'rgba(201,168,87,0.15)' : 'transparent',
                        color: active ? '#7a5c0a' : 'var(--text-secondary)',
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {active && <i className="ti ti-check" style={{ marginRight: 5 }} aria-hidden="true"></i>}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* 4 — Compensation */}
        <section style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ ...S.h2, margin: 0 }}>4 · Compensation breakdown</h2>
            <button type="button" style={S.btnGhost} onClick={fetchEstimates} disabled={estimating || lineItems.length === 0}>
              {estimating ? 'Estimating…' : 'Estimate from past proposals'}
            </button>
          </div>

          {lineItems.length === 0 ? <div style={S.small}>No line items yet — pick a scope above or add a custom one.</div> : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lineItems.map((row) => {
              const est = estimates[row.category];
              const amount = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);
              return (
                <div key={row._key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr', gap: 8, marginBottom: 8 }}>
                    <input style={S.input} placeholder="Category (e.g. Flooring)" value={row.category} onChange={(e) => updateLineItem(row._key, 'category', e.target.value)} />
                    <input style={S.input} placeholder="Description" value={row.description} onChange={(e) => updateLineItem(row._key, 'description', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.7fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                    <input style={S.input} type="number" min="0" step="0.01" placeholder="Qty" value={row.quantity} onChange={(e) => updateLineItem(row._key, 'quantity', e.target.value)} />
                    <select style={S.input} value={row.unit} onChange={(e) => updateLineItem(row._key, 'unit', e.target.value)}>
                      {PROPOSAL_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <input style={S.input} type="number" min="0" step="0.01" placeholder="Unit price" value={row.unit_price} onChange={(e) => updateLineItem(row._key, 'unit_price', e.target.value)} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', textAlign: 'right' }}>{formatCurrency(amount)}</div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(row._key)}
                      aria-label="Remove line item"
                      style={{ background: 'none', border: `1px solid var(--border)`, borderRadius: 6, width: 30, height: 30, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                  {est ? (
                    <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      Avg from {est.sampleSize} past proposal{est.sampleSize === 1 ? '' : 's'}: {formatCurrency(est.avgUnitPrice)}{' '}
                      <button
                        type="button"
                        onClick={() => updateLineItem(row._key, 'unit_price', est.avgUnitPrice)}
                        style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, fontSize: 12.5, padding: 0, marginLeft: 5 }}
                      >
                        Use this
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <button type="button" style={{ ...S.btnGhost, marginTop: 12, fontSize: 13 }} onClick={addCustomLineItem}>
            + Add custom line item
          </button>
        </section>

        {/* 5 — Terms */}
        <section style={S.card}>
          <h2 style={S.h2}>5 · Terms</h2>
          <label style={S.label}>Payment terms</label>
          <textarea style={{ ...S.input, minHeight: 70, resize: 'vertical' }} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          <div style={{ marginTop: 14 }}>
            <label style={S.label}>Limitations of responsibility</label>
            <textarea style={{ ...S.input, minHeight: 90, resize: 'vertical' }} value={limitations} onChange={(e) => setLimitations(e.target.value)} />
          </div>
        </section>

        {/* 6 — Internal */}
        <section style={S.card}>
          <h2 style={S.h2}>6 · Internal only</h2>
          <label style={S.label}>Internal notes</label>
          <textarea style={{ ...S.input, minHeight: 70, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div style={{ ...S.small, marginTop: 10 }}>Nothing in this section appears on the client proposal.</div>
        </section>
      </div>

      {/* Sticky summary */}
      <aside style={{ position: 'sticky', top: 20 }}>
        <div style={{ ...S.card, marginBottom: 14 }}>
          <h2 style={S.h2}>Price build</h2>
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
            <input style={{ ...S.input, flex: 1 }} value={adjustmentLabel} onChange={(e) => setAdjustmentLabel(e.target.value)} placeholder="Adjustment label" />
            <input style={{ ...S.input, width: 100 }} type="number" step="0.01" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, marginTop: 6, borderTop: '2px solid var(--navy)' }}>
            <strong style={{ fontSize: 16 }}>Total</strong>
            <strong style={{ fontSize: 22, color: 'var(--navy)' }}>{formatCurrency(totals.total)}</strong>
          </div>
        </div>

        {message ? (
          <div style={{ ...S.small, color: message.includes('saved') ? 'var(--text-success, #065F46)' : 'var(--warn, #A8562F)', marginBottom: 10 }}>{message}</div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" style={S.btn} onClick={handleFinalizeClick} disabled={saving}>
            Finalize
          </button>
          <button type="button" style={S.btnGhost} onClick={saveDraft} disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </aside>

      {showPreview && previewData && currentProposalId && (
        <ProposalPreviewModal
          proposalId={currentProposalId}
          proposal={previewData.proposal}
          lineItems={previewData.lineItems}
          projectId={projectId}
          defaultRecipientEmail={project.profiles?.email || ''}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
