'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { C, S } from '@/lib/design-studio/brand';
import { distanceFt } from '@/lib/design-studio/floor-plan-geometry';
import FloorPlanCanvas from './FloorPlanCanvas';

function fieldPoint(obj, xKeys, zKeys) {
  const x = xKeys.reduce((v, k) => (v !== undefined ? v : obj[k]), undefined) ?? 0;
  const z = zKeys.reduce((v, k) => (v !== undefined ? v : obj[k]), undefined) ?? 0;
  return { x, z };
}

/**
 * Full-page floor-plan editor (Phase B): select + drag existing walls/
 * doors/windows and furniture, delete, save. Drawing new walls and
 * placing new furniture from a palette is Phase C, not here yet.
 */
export default function FloorPlanEditor({ scan, quoteNumber }) {
  const [elements, setElements] = useState(scan.elements);
  const [objects, setObjects] = useState(scan.objects);
  const [frozenElements, setFrozenElements] = useState(scan.elements);
  const [frozenObjects, setFrozenObjects] = useState(scan.objects);
  const [selectedId, setSelectedId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [size, setSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef(null);
  const elementsRef = useRef(elements);
  const objectsRef = useRef(objects);
  elementsRef.current = elements;
  objectsRef.current = objects;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onBeforeUnload(e) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function handleDragElementBody(id, startX, startZ, endX, endZ) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, start_x: startX, start_z: startZ, end_x: endX, end_z: endZ } : el)));
    setDirty(true);
    setSaved(false);
  }

  function handleDragEndpoint(id, which, x, z) {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        const updated = which === 'start' ? { ...el, start_x: x, start_z: z } : { ...el, end_x: x, end_z: z };
        const start = fieldPoint(updated, ['start_x', 'startX'], ['start_z', 'startZ']);
        const end = fieldPoint(updated, ['end_x', 'endX'], ['end_z', 'endZ']);
        updated.length_ft = distanceFt(start.x, start.z, end.x, end.z);
        return updated;
      })
    );
    setDirty(true);
    setSaved(false);
  }

  function handleDragFurniture(id, x, z) {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, center_x: x, center_z: z } : obj)));
    setDirty(true);
    setSaved(false);
  }

  function handleDragEnd() {
    setFrozenElements(elementsRef.current);
    setFrozenObjects(objectsRef.current);
  }

  function handleFitToView() {
    setFrozenElements(elementsRef.current);
    setFrozenObjects(objectsRef.current);
  }

  function handleDeleteSelected() {
    if (!selectedId) return;
    if (selectedId.startsWith('element:')) {
      const id = selectedId.slice('element:'.length);
      setElements((prev) => prev.filter((el) => el.id !== id));
    } else if (selectedId.startsWith('furniture:')) {
      const id = selectedId.slice('furniture:'.length);
      setObjects((prev) => prev.filter((obj) => obj.id !== id));
    }
    setSelectedId(null);
    setDirty(true);
    setSaved(false);
    // Deletion changes the bounding box — refit on the next tick, once
    // elements/objects state has actually updated.
    setTimeout(() => {
      setFrozenElements(elementsRef.current);
      setFrozenObjects(objectsRef.current);
    }, 0);
  }

  function handleDiscard() {
    setElements(scan.elements);
    setObjects(scan.objects);
    setFrozenElements(scan.elements);
    setFrozenObjects(scan.objects);
    setSelectedId(null);
    setDirty(false);
    setSaved(false);
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/design-studio/scans/${scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements, objects }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the floor plan.');
      setFrozenElements(elements);
      setFrozenObjects(objects);
      setDirty(false);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedElement = selectedId?.startsWith('element:') ? elements.find((el) => el.id === selectedId.slice('element:'.length)) : null;
  const selectedFurniture = selectedId?.startsWith('furniture:') ? objects.find((obj) => obj.id === selectedId.slice('furniture:'.length)) : null;

  return (
    <div style={{ ...S.page, padding: '24px 20px 32px', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ ...S.shell, maxWidth: 1200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Link href={`/design-studio/${scan.quoteId}`} style={{ fontSize: 12.5, color: C.clay, textDecoration: 'none', fontWeight: 600 }}>
              ← Back to {quoteNumber || 'quote'}
            </Link>
            <h1 style={{ ...S.h1, marginTop: 6 }}>Edit floor plan{scan.roomLabel ? ` — ${scan.roomLabel}` : ''}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {saved ? <span style={{ ...S.small, color: '#065F46' }}>Saved</span> : null}
            {dirty ? <span style={{ ...S.small, color: C.warn }}>Unsaved changes</span> : null}
            <button type="button" style={S.btnGhost} onClick={handleDiscard} disabled={!dirty || saving}>
              Discard
            </button>
            <button type="button" style={{ ...S.btn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {error ? <p style={{ ...S.small, color: '#B42318', marginBottom: 12 }}>{error}</p> : null}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <button type="button" style={S.btnGhost} onClick={handleFitToView}>
            Fit to view
          </button>
          <button type="button" style={{ ...S.btnGhost, opacity: selectedId ? 1 : 0.4 }} onClick={handleDeleteSelected} disabled={!selectedId}>
            Delete selected
          </button>
          {selectedElement ? (
            <span style={S.small}>
              {selectedElement.type} — {(selectedElement.length_ft ?? selectedElement.lengthFt ?? 0).toFixed(1)} ft
            </span>
          ) : null}
          {selectedFurniture ? <span style={S.small}>{selectedFurniture.label}</span> : null}
        </div>

        <div
          ref={containerRef}
          style={{ width: '100%', height: '65vh', minHeight: 420, border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}
        >
          {size.width > 0 && size.height > 0 ? (
            <FloorPlanCanvas
              elements={elements}
              objects={objects}
              frozenElements={frozenElements}
              frozenObjects={frozenObjects}
              width={size.width}
              height={size.height}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDragElementBody={handleDragElementBody}
              onDragEndpoint={handleDragEndpoint}
              onDragFurniture={handleDragFurniture}
              onDragEnd={handleDragEnd}
            />
          ) : null}
        </div>
        <p style={{ ...S.small, marginTop: 10 }}>
          Drag a wall/door/window to move it, or select it and drag an endpoint to reshape it. Drag furniture to move it. Adding new walls or furniture is coming soon.
        </p>
      </div>
    </div>
  );
}
