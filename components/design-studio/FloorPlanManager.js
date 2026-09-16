'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { C, S } from '@/lib/design-studio/brand';

const BUCKET = 'design-studio-scans';

const TYPE_LABEL = { pdf: 'PDF', image: 'Image', cad: 'CAD', other: 'File' };

// Manually uploaded floor plans — PDF/image/CAD (DWG, DXF). Separate from
// room scans: no capture step, just a file staff already has. PDF/image
// render inline; CAD files are stored and downloadable only (no
// lightweight way to render a CAD drawing as an image).
export default function FloorPlanManager({ quoteId, initialPlans }) {
  const [plans, setPlans] = useState(initialPlans);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const supabase = createClient();

  function updatePlan(id, patch) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePlan(id) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const urlRes = await fetch('/api/design-studio/floor-plans/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || 'Could not start upload');

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(urlData.path, urlData.token, file);
      if (uploadError) throw uploadError;

      const createRes = await fetch('/api/design-studio/floor-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: urlData.id, path: urlData.path, fileName: file.name, quoteId }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Could not save floor plan');

      setPlans((prev) => [createData.floorPlan, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {plans.map((plan) => (
        <FloorPlanRow key={plan.id} plan={plan} onUpdate={(patch) => updatePlan(plan.id, patch)} onRemove={() => removePlan(plan.id)} />
      ))}

      <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.dwg,.dxf" onChange={handleFileSelected} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ ...S.btnGhost, width: '100%', textAlign: 'center' }}
      >
        {uploading ? 'Uploading…' : '+ Upload floor plan'}
      </button>
      <div style={{ ...S.small, marginTop: 6 }}>PDF, image, or CAD (DWG/DXF)</div>
      {error ? <div style={{ fontSize: 12, color: C.warn, marginTop: 6 }}>{error}</div> : null}
    </>
  );
}

function FloorPlanRow({ plan, onUpdate, onRemove }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function toggleShowToClient(checked) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/floor-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showToClient: checked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      onUpdate({ show_to_client: data.floorPlan.show_to_client });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Remove ${plan.file_name}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/design-studio/floor-plans/${plan.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not remove');
      onRemove();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {plan.file_name}
        </div>
        <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{TYPE_LABEL[plan.file_type] || 'File'}</span>
      </div>

      {plan.is_renderable ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...S.small, color: C.clay, fontWeight: 600, marginTop: 4 }}
        >
          {expanded ? 'Hide preview' : 'Preview →'}
        </button>
      ) : plan.file_url ? (
        <a href={plan.file_url} style={{ ...S.small, color: C.clay, fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>
          Download →
        </a>
      ) : null}

      {expanded && plan.file_url ? (
        plan.file_type === 'pdf' ? (
          <iframe src={plan.file_url} title={plan.file_name} style={{ width: '100%', height: 320, border: `1px solid ${C.line}`, borderRadius: 6, marginTop: 8 }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plan.file_url} alt={plan.file_name} style={{ width: '100%', borderRadius: 6, marginTop: 8 }} />
        )
      ) : null}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={plan.show_to_client} disabled={busy} onChange={(e) => toggleShowToClient(e.target.checked)} />
        Show on client proposal
      </label>

      <button
        type="button"
        onClick={remove}
        disabled={busy}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: C.warn, marginTop: 6 }}
      >
        Remove
      </button>

      {error ? <div style={{ fontSize: 12, color: C.warn, marginTop: 6 }}>{error}</div> : null}
    </div>
  );
}
