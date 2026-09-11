'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
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
    <div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Proposal title</label>
          <input className={adminStyles.fieldInput} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Prepared by</label>
          <input className={adminStyles.fieldInput} value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
        </div>
      </div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Client name</label>
          <input className={adminStyles.fieldInput} value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Project address</label>
          <input className={adminStyles.fieldInput} value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} />
        </div>
      </div>

      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Cover letter intro</label>
        <textarea className={adminStyles.fieldTextarea} style={{ minHeight: '90px' }} value={introParagraph} onChange={(e) => setIntroParagraph(e.target.value)} />
      </div>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Project description (optional)</label>
        <textarea className={adminStyles.fieldTextarea} value={scopeSummary} onChange={(e) => setScopeSummary(e.target.value)} />
      </div>
      <div className={adminStyles.formGrid2}>
        <div className={adminStyles.fieldGroup}>
          <label className={adminStyles.fieldLabel}>Valid until</label>
          <input className={adminStyles.fieldInput} type="date" value={validUntil || ''} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
      </div>

      <h4 style={{ fontSize: '0.95rem', color: 'var(--navy)', margin: '1.5rem 0 0.75rem' }}>Scope of work</h4>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
        Click to add or remove a scope item. Each one drops a line item into the proposal below and a bullet into the Scope of Services section.
      </p>
      {PROPOSAL_SCOPE_GROUPS.map((group) => (
        <div key={group.group} style={{ marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.4rem' }}>
            {group.group}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {group.items.map((item) => {
              const active = selectedScopes.has(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleScope(item)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.78rem',
                    borderRadius: '999px',
                    border: active ? '1px solid var(--gold)' : '1px solid rgba(var(--border-rgb),0.25)',
                    background: active ? 'rgba(201,168,87,0.15)' : 'transparent',
                    color: active ? '#7a5c0a' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {active && <i className="ti ti-check" style={{ marginRight: '0.3rem' }} aria-hidden="true"></i>}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1.5rem 0 0.75rem' }}>
        <h4 style={{ fontSize: '0.95rem', color: 'var(--navy)', margin: 0 }}>Compensation breakdown</h4>
        <button type="button" className={adminStyles.cancelBtn} onClick={fetchEstimates} disabled={estimating || lineItems.length === 0}>
          <i className="ti ti-chart-bar" aria-hidden="true" style={{ marginRight: '0.35rem' }}></i>
          {estimating ? 'Estimating…' : 'Estimate from past proposals'}
        </button>
      </div>

      {lineItems.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No line items yet — pick a scope above or add a custom one.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {lineItems.map((row) => {
          const est = estimates[row.category];
          const amount = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);
          return (
            <div key={row._key} style={{ border: '1px solid rgba(var(--border-rgb),0.12)', borderRadius: '6px', padding: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  className={adminStyles.fieldInput}
                  placeholder="Category (e.g. Flooring)"
                  value={row.category}
                  onChange={(e) => updateLineItem(row._key, 'category', e.target.value)}
                />
                <input
                  className={adminStyles.fieldInput}
                  placeholder="Description"
                  value={row.description}
                  onChange={(e) => updateLineItem(row._key, 'description', e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 0.7fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  className={adminStyles.fieldInput}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) => updateLineItem(row._key, 'quantity', e.target.value)}
                />
                <select className={adminStyles.fieldInput} value={row.unit} onChange={(e) => updateLineItem(row._key, 'unit', e.target.value)}>
                  {PROPOSAL_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <input
                  className={adminStyles.fieldInput}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit price"
                  value={row.unit_price}
                  onChange={(e) => updateLineItem(row._key, 'unit_price', e.target.value)}
                />
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--navy)', textAlign: 'right' }}>{formatCurrency(amount)}</div>
                <button type="button" className={adminStyles.iconBtn} onClick={() => removeLineItem(row._key)} aria-label="Remove line item">
                  <i className="ti ti-trash" aria-hidden="true"></i>
                </button>
              </div>
              {est && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Avg from {est.sampleSize} past proposal{est.sampleSize === 1 ? '' : 's'}: {formatCurrency(est.avgUnitPrice)}{' '}
                  <button
                    type="button"
                    onClick={() => updateLineItem(row._key, 'unit_price', est.avgUnitPrice)}
                    style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', padding: 0, marginLeft: '0.3rem' }}
                  >
                    Use this
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className={adminStyles.addRowBtn} onClick={addCustomLineItem} style={{ marginTop: '0.75rem' }}>
        <i className="ti ti-plus" aria-hidden="true"></i> Add custom line item
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <div style={{ width: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '0.3rem 0' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0' }}>
            <input
              className={adminStyles.fieldInput}
              style={{ flex: 1 }}
              value={adjustmentLabel}
              onChange={(e) => setAdjustmentLabel(e.target.value)}
              placeholder="Adjustment label"
            />
            <input
              className={adminStyles.fieldInput}
              style={{ width: '110px' }}
              type="number"
              step="0.01"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', borderTop: '1px solid rgba(var(--border-rgb),0.15)', marginTop: '0.4rem', paddingTop: '0.5rem' }}>
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className={adminStyles.fieldGroup} style={{ marginTop: '1.5rem' }}>
        <label className={adminStyles.fieldLabel}>Payment terms</label>
        <textarea className={adminStyles.fieldTextarea} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
      </div>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Limitations of responsibility</label>
        <textarea className={adminStyles.fieldTextarea} style={{ minHeight: '90px' }} value={limitations} onChange={(e) => setLimitations(e.target.value)} />
      </div>
      <div className={adminStyles.fieldGroup}>
        <label className={adminStyles.fieldLabel}>Internal notes (not shown on the proposal)</label>
        <textarea className={adminStyles.fieldTextarea} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {message && <p className={message.includes('saved') ? adminStyles.formMsgSuccess : adminStyles.formMsgError}>{message}</p>}

      <div className={adminStyles.saveBar}>
        <button type="button" className={adminStyles.cancelBtn} onClick={saveDraft} disabled={saving}>
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" className="btn-navy" onClick={handleFinalizeClick} disabled={saving}>
          Finalize
        </button>
      </div>

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
