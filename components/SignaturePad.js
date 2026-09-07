'use client';

import { useRef, useState, useEffect } from 'react';

export default function SignaturePad({ documentId, defaultName, onSigned, onCancel }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(defaultName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a2b3c';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point = e.touches ? e.touches[0] : e;
    return {
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function endDraw() {
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function submit() {
    if (!hasDrawn || !signerName.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const res = await fetch(`/api/documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: dataUrl, signerName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save your signature.');
      onSigned?.();
    } catch (err) {
      setError(err.message || 'Could not save your signature.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ padding: '1rem', border: '1px solid rgba(62,84,104,0.15)', background: 'var(--surface)', marginTop: '0.75rem' }}>
      <p style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '0.6rem' }}>
        Sign below with your mouse or finger, confirm your name, then submit.
      </p>
      <canvas
        ref={canvasRef}
        width={500}
        height={180}
        style={{ width: '100%', maxWidth: '500px', height: '180px', border: '1px solid rgba(62,84,104,0.2)', touchAction: 'none', background: '#fff' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={clear}
          style={{ fontSize: '0.75rem', color: '#718096', background: 'none', border: '1px solid rgba(62,84,104,0.2)', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
        >
          Clear
        </button>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Type your full name"
          style={{ flex: 1, minWidth: '160px', border: '1px solid rgba(62,84,104,0.2)', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />
        <button
          type="button"
          className="btn-navy"
          onClick={submit}
          disabled={isSaving || !hasDrawn || !signerName.trim()}
          style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }}
        >
          {isSaving ? 'Submitting...' : 'Sign & Submit'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ fontSize: '0.75rem', color: '#718096', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
