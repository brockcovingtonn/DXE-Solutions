'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

/**
 * A destructive-action panel: a red button that expands into a
 * type-the-word-to-confirm prompt before firing a DELETE request.
 */
export default function DangerDeleteButton({
  heading,
  description,
  buttonText,
  confirmWord = 'Delete',
  endpoint,
  redirectTo,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (typed !== confirmWord) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not delete. Please try again.');
        setBusy(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Could not delete. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className={adminStyles.dangerZone}>
      <h3>{heading}</h3>
      <p>{description}</p>

      {!open ? (
        <button type="button" className={adminStyles.dangerBtn} onClick={() => setOpen(true)}>
          <i className="ti ti-trash" aria-hidden="true"></i> {buttonText}
        </button>
      ) : (
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Type <strong>{confirmWord}</strong> to confirm
          </label>
          <input
            className={adminStyles.confirmTypedInput}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmWord}
            autoFocus
            disabled={busy}
          />
          {error && <p className={adminStyles.formMsgError}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              type="button"
              className={adminStyles.dangerBtn}
              onClick={handleDelete}
              disabled={busy || typed !== confirmWord}
            >
              {busy ? 'Deleting…' : buttonText}
            </button>
            <button
              type="button"
              className={adminStyles.cancelBtn}
              onClick={() => {
                setOpen(false);
                setTyped('');
                setError('');
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
