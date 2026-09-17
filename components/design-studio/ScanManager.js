'use client';

import { useState } from 'react';
import Script from 'next/script';
import { C, S } from '@/lib/design-studio/brand';
import ModelLightbox from './ModelLightbox';
import FloorPlanView from './floor-plan-editor/FloorPlanView';
import FloorPlanLightbox from './floor-plan-editor/FloorPlanLightbox';

// Per-scan controls on the quote detail page: whether a scan appears on the
// client's proposal (off by default — a scan can come out messy and staff
// should choose before a client sees it), and linking it to a real DXE
// project so the wider team working that project can reference it too.
export default function ScanManager({ scans, isMaster }) {
  const [rows, setRows] = useState(scans);

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <>
      <Script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js" strategy="afterInteractive" />
      {rows.map((scan) => (
        <ScanRow key={scan.id} scan={scan} isMaster={isMaster} onUpdate={(patch) => updateRow(scan.id, patch)} />
      ))}
    </>
  );
}

function ScanRow({ scan, isMaster, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [show2D, setShow2D] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function toggleShowToClient(checked) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/scans/${scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showToClient: checked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      onUpdate({ showToClient: data.scan.show_to_client });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function attachProject(project) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/scans/${scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Attach failed');
      onUpdate({ project: { id: project.id, name: project.name } });
      setShowPicker(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function detachProject() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/scans/${scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: null }),
      });
      if (!res.ok) throw new Error('Could not remove');
      onUpdate({ project: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{scan.roomLabel || 'Scanned space'}</div>
      <Row
        label="Area"
        value={scan.areaSqft ? `${Number(scan.areaSqft).toLocaleString()} sf${scan.areaIsEstimate ? ' (approx.)' : ''}` : '—'}
      />
      <Row label="Walls / doors / windows" value={`${scan.wallCount} / ${scan.doorCount} / ${scan.windowCount}`} />
      {(scan.elements?.length || scan.objects?.length || scan.floorPlanUrl) ? (
        <div>
          <button
            type="button"
            onClick={() => setShow2D((v) => !v)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...S.small, color: C.clay, fontWeight: 600 }}
          >
            {show2D ? 'Hide 2D floor plan' : 'View 2D floor plan →'}
          </button>
          {show2D ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', padding: 0, border: `1px solid ${C.line}`, borderRadius: 8, marginTop: 8, cursor: 'zoom-in', background: '#fff' }}
            >
              <FloorPlanView elements={scan.elements} objects={scan.objects} fallbackImageUrl={scan.floorPlanUrl} alt={scan.roomLabel || 'Floor plan'} />
            </button>
          ) : null}
          {lightboxOpen ? (
            <FloorPlanLightbox
              elements={scan.elements}
              objects={scan.objects}
              fallbackImageUrl={scan.floorPlanUrl}
              alt={scan.roomLabel || 'Floor plan'}
              downloadUrl={scan.floorPlanDownloadUrl}
              onClose={() => setLightboxOpen(false)}
            />
          ) : null}
        </div>
      ) : null}
      {scan.modelGltfUrl ? (
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            onClick={() => setShowViewer(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...S.small, color: C.clay, fontWeight: 600 }}
          >
            View 3D Floor Plan →
          </button>
          {showViewer ? (
            <ModelLightbox
              modelGltfUrl={scan.modelGltfUrl}
              modelUrl={scan.modelUrl}
              alt={scan.roomLabel || 'Room scan'}
              onClose={() => setShowViewer(false)}
            />
          ) : null}
        </div>
      ) : scan.modelUrl ? (
        <div style={{ marginTop: 6 }}>
          {/* No web-viewable glb for this scan (older capture, or export
              failed) — USDZ can't render inline in a browser, so this opens
              AR Quick Look on iOS/iPadOS instead of forcing a download. */}
          <a
            href={scan.modelUrl}
            rel="ar"
            style={{ ...S.small, color: C.clay, fontWeight: 600, textDecoration: 'none' }}
          >
            View in AR (USDZ) →
          </a>
        </div>
      ) : null}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={scan.showToClient}
          disabled={busy}
          onChange={(e) => toggleShowToClient(e.target.checked)}
        />
        Show on client proposal
      </label>

      <div style={{ marginTop: 8 }}>
        {scan.project ? (
          <div style={{ fontSize: 12.5, color: C.inkSoft }}>
            Project: <strong>{scan.project.name}</strong>{' '}
            <button
              type="button"
              onClick={detachProject}
              disabled={busy}
              style={{ background: 'none', border: 'none', color: C.warn, cursor: 'pointer', fontSize: 12, padding: 0 }}
            >
              remove
            </button>
          </div>
        ) : showPicker ? (
          <ProjectPicker isMaster={isMaster} onSelect={attachProject} onCancel={() => setShowPicker(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{ ...S.small, color: C.clay, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Attach to project
          </button>
        )}
      </div>

      {error ? <div style={{ fontSize: 12, color: C.warn, marginTop: 6 }}>{error}</div> : null}
    </div>
  );
}

function ProjectPicker({ isMaster, onSelect, onCancel }) {
  const [mode, setMode] = useState('search'); // 'search' | 'new'
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(null);

  function onQueryChange(value) {
    setQ(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/design-studio/projects?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.projects || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    setSearchTimer(timer);
  }

  if (mode === 'new') {
    return <NewProjectForm onCreated={onSelect} onCancel={() => setMode('search')} />;
  }

  return (
    <div style={{ background: C.sand, borderRadius: 8, padding: 10, marginTop: 4 }}>
      <input
        type="text"
        value={q}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search projects…"
        style={{ ...S.input, fontSize: 13, padding: '6px 9px' }}
        autoFocus
      />
      <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 6 }}>
        {searching ? <div style={{ ...S.small, padding: '4px 0' }}>Searching…</div> : null}
        {!searching && q.length >= 2 && results.length === 0 ? (
          <div style={{ ...S.small, padding: '4px 0' }}>No matches.</div>
        ) : null}
        {results.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', background: C.paper, border: `1px solid ${C.line}`,
              borderRadius: 6, padding: '6px 9px', marginTop: 4, fontSize: 12.5, cursor: 'pointer',
            }}
          >
            <strong>{p.name}</strong>
            {p.ownerName ? ` — ${p.ownerName}` : ''}
            {p.address ? <div style={{ color: C.muted, fontSize: 11.5 }}>{p.address}</div> : null}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {isMaster ? (
          <button
            type="button"
            onClick={() => setMode('new')}
            style={{ ...S.small, color: C.clay, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            + New project
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={onCancel}
          style={{ ...S.small, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function NewProjectForm({ onCreated, onCancel }) {
  const [q, setQ] = useState('');
  const [clients, setClients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(null);
  const [client, setClient] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  function onQueryChange(value) {
    setQ(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/design-studio/clients?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setClients(data.clients || []);
      } catch {
        setClients([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    setSearchTimer(timer);
  }

  async function create() {
    if (!client || !name.trim()) {
      setError('Pick a client and enter a project name.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: client.id, projectName: name, address: address || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create project');
      onCreated({ id: data.projectId, name });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ background: C.sand, borderRadius: 8, padding: 10, marginTop: 4 }}>
      {!client ? (
        <>
          <div style={{ ...S.small, marginBottom: 4 }}>CLIENT</div>
          <input
            type="text"
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search clients…"
            style={{ ...S.input, fontSize: 13, padding: '6px 9px' }}
            autoFocus
          />
          <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 6 }}>
            {searching ? <div style={{ ...S.small }}>Searching…</div> : null}
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClient(c)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', background: C.paper, border: `1px solid ${C.line}`,
                  borderRadius: 6, padding: '6px 9px', marginTop: 4, fontSize: 12.5, cursor: 'pointer',
                }}
              >
                {c.name} <span style={{ color: C.muted }}>{c.email}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ ...S.small, marginBottom: 6 }}>
            Client: <strong>{client.name}</strong>{' '}
            <button type="button" onClick={() => setClient(null)} style={{ background: 'none', border: 'none', color: C.clay, cursor: 'pointer', fontSize: 12, padding: 0 }}>
              change
            </button>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            style={{ ...S.input, fontSize: 13, padding: '6px 9px', marginBottom: 6 }}
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address (optional)"
            style={{ ...S.input, fontSize: 13, padding: '6px 9px' }}
          />
        </>
      )}

      {error ? <div style={{ fontSize: 12, color: C.warn, marginTop: 6 }}>{error}</div> : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button
          type="button"
          onClick={create}
          disabled={creating || !client}
          style={{ ...S.btn, fontSize: 12.5, padding: '6px 12px' }}
        >
          {creating ? 'Creating…' : 'Create & attach'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ ...S.small, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: C.inkSoft }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
