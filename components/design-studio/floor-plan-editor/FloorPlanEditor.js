'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { C, S } from '@/lib/design-studio/brand';
import { distanceFt, defaultHeightFt } from '@/lib/design-studio/floor-plan-geometry';
import { paletteCategory } from '@/lib/design-studio/furniture-symbols';
import FloorPlanCanvas from './FloorPlanCanvas';
import FurniturePalette from './FurniturePalette';

function fieldPoint(obj, xKeys, zKeys) {
  const x = xKeys.reduce((v, k) => (v !== undefined ? v : obj[k]), undefined) ?? 0;
  const z = zKeys.reduce((v, k) => (v !== undefined ? v : obj[k]), undefined) ?? 0;
  return { x, z };
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const modeButtonStyle = (active) => ({
  ...S.btnGhost,
  background: active ? C.ink : 'transparent',
  color: active ? '#fff' : C.ink,
  borderColor: active ? C.ink : C.line,
});

/**
 * Full-page floor-plan editor: select/drag/reshape/delete existing walls,
 * doors, windows and furniture (Phase B), plus draw brand-new wall
 * segments with corner/grid snapping and place new furniture from a
 * palette (Phase C).
 */
export default function FloorPlanEditor({ scan, quoteNumber }) {
  const [elements, setElements] = useState(scan.elements);
  const [objects, setObjects] = useState(scan.objects);
  const [frozenElements, setFrozenElements] = useState(scan.elements);
  const [frozenObjects, setFrozenObjects] = useState(scan.objects);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('select'); // 'select' | 'draw-wall' | 'place-furniture'
  const [draftWallStart, setDraftWallStart] = useState(null);
  const [armedCategory, setArmedCategory] = useState(null);
  const [snapGridEnabled, setSnapGridEnabled] = useState(false);
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

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && draftWallStart) setDraftWallStart(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [draftWallStart]);

  function refitSoon() {
    setTimeout(() => {
      setFrozenElements(elementsRef.current);
      setFrozenObjects(objectsRef.current);
    }, 0);
  }

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
    refitSoon();
  }

  function handleDiscard() {
    setElements(scan.elements);
    setObjects(scan.objects);
    setFrozenElements(scan.elements);
    setFrozenObjects(scan.objects);
    setSelectedId(null);
    setMode('select');
    setDraftWallStart(null);
    setArmedCategory(null);
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

  function enterSelectMode() {
    setMode('select');
    setDraftWallStart(null);
    setArmedCategory(null);
  }

  function enterDrawWallMode() {
    setMode('draw-wall');
    setSelectedId(null);
    setDraftWallStart(null);
    setArmedCategory(null);
  }

  function handleArmFurniture(key) {
    if (!key) {
      enterSelectMode();
      return;
    }
    setMode('place-furniture');
    setSelectedId(null);
    setDraftWallStart(null);
    setArmedCategory(key);
  }

  function commitWall(start, end) {
    const lengthFt = distanceFt(start.x, start.z, end.x, end.z);
    if (lengthFt < 0.1) return; // ignore an accidental double-click on the same spot
    const wallCount = elementsRef.current.filter((el) => el.type === 'wall').length;
    const newWall = {
      id: newId(),
      type: 'wall',
      label: `Wall ${wallCount + 1}`,
      length_ft: lengthFt,
      height_ft: defaultHeightFt(elementsRef.current),
      start_x: start.x, start_z: start.z, end_x: end.x, end_z: end.z,
    };
    setElements((prev) => [...prev, newWall]);
    setDirty(true);
    setSaved(false);
    refitSoon();
  }

  function placeFurniture(categoryKey, point) {
    const cat = paletteCategory(categoryKey);
    if (!cat) return;
    const writeCategory = cat.writeCategory || cat.key;
    const count = objectsRef.current.filter((o) => o.category === writeCategory).length + 1;
    const newObj = {
      id: newId(),
      category: writeCategory,
      label: `${cat.placedLabel || cat.label} ${count}`,
      center_x: point.x, center_z: point.z,
      width_m: cat.defaultWidthM, depth_m: cat.defaultDepthM,
      rotation_radians: 0,
    };
    setObjects((prev) => [...prev, newObj]);
    setDirty(true);
    setSaved(false);
    refitSoon();
  }

  function handleCanvasClick(point) {
    if (mode === 'draw-wall') {
      if (!draftWallStart) {
        setDraftWallStart(point);
      } else {
        commitWall(draftWallStart, point);
        setDraftWallStart(point); // stay armed to chain the next connected segment
      }
    } else if (mode === 'place-furniture' && armedCategory) {
      placeFurniture(armedCategory, point);
    }
  }

  const selectedElement = selectedId?.startsWith('element:') ? elements.find((el) => el.id === selectedId.slice('element:'.length)) : null;
  const selectedFurniture = selectedId?.startsWith('furniture:') ? objects.find((obj) => obj.id === selectedId.slice('furniture:'.length)) : null;

  return (
    <div style={{ ...S.page, padding: '24px 20px 32px', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ ...S.shell, maxWidth: 1400 }}>
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

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <button type="button" style={modeButtonStyle(mode === 'select')} onClick={enterSelectMode}>
            Select
          </button>
          <button type="button" style={modeButtonStyle(mode === 'draw-wall')} onClick={enterDrawWallMode}>
            Draw wall
          </button>
          {mode === 'draw-wall' && draftWallStart ? (
            <button type="button" style={S.btnGhost} onClick={() => setDraftWallStart(null)}>
              Cancel wall (Esc)
            </button>
          ) : null}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.inkSoft }}>
            <input type="checkbox" checked={snapGridEnabled} onChange={(e) => setSnapGridEnabled(e.target.checked)} />
            Snap to 0.5ft grid
          </label>
          <span style={{ width: 1, height: 20, background: C.line }} />
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

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            ref={containerRef}
            style={{ flex: 1, height: '65vh', minHeight: 420, border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}
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
                mode={mode}
                draftWallStart={draftWallStart}
                snapGridEnabled={snapGridEnabled}
                onCanvasClick={handleCanvasClick}
              />
            ) : null}
          </div>
          <FurniturePalette armedKey={armedCategory} onArm={handleArmFurniture} />
        </div>

        <p style={{ ...S.small, marginTop: 10 }}>
          {mode === 'select'
            ? 'Drag a wall/door/window to move it, or select it and drag an endpoint to reshape it. Drag furniture to move it.'
            : mode === 'draw-wall'
            ? 'Click to place the first point, click again to draw a wall to it — keeps drawing a connected run until you switch tools or press Esc.'
            : 'Click anywhere on the plan to place another one, or pick a different item.'}
        </p>
      </div>
    </div>
  );
}
