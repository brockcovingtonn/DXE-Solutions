'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import RosterForm from '@/components/admin/RosterForm';

const RELATIONSHIP_LIST_ID = 'interested-party-relationships';
const RELATIONSHIP_OPTIONS = ['Owner', 'Co-Owner', 'LLC / Entity', 'Spouse', 'Family Member', 'Investor', 'Property Manager', 'Tenant', 'Buyer', 'Seller', 'Attorney', 'Lender'];
const emptyParty = { relationship: '', name: '', phone: '', email: '' };

function fromInitial(initialParties) {
  return (initialParties || []).map((p) => ({
    relationship: p.relationship || '',
    name: p.name || '',
    phone: p.phone || '',
    email: p.email || '',
  }));
}

export default function InterestedPartiesEditor({ projectId, initialParties }) {
  const router = useRouter();

  const [parties, setParties] = useState(() => fromInitial(initialParties));
  const [editingIndex, setEditingIndex] = useState(null); // number | 'new' | null
  const [draft, setDraft] = useState(emptyParty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (Array.isArray(initialParties)) setParties(fromInitial(initialParties));
  }, [initialParties]);

  async function persist(nextParties, successMsg) {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/interested-parties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, parties: nextParties }),
      });
      if (!res.ok) throw new Error();
      setParties(nextParties);
      setEditingIndex(null);
      setDraft(emptyParty);
      setMessage(successMsg);
      router.refresh();
    } catch {
      setMessage('Could not save changes.');
    } finally {
      setBusy(false);
    }
  }

  function startAdd() {
    setDraft(emptyParty);
    setEditingIndex('new');
    setMessage('');
  }

  function startEdit(i) {
    setDraft({ ...parties[i] });
    setEditingIndex(i);
    setMessage('');
  }

  function cancel() {
    setEditingIndex(null);
    setDraft(emptyParty);
  }

  function saveDraft() {
    if (!draft.name.trim()) return;
    const next =
      editingIndex === 'new'
        ? [...parties, draft]
        : parties.map((p, i) => (i === editingIndex ? draft : p));
    persist(next, 'Saved.');
  }

  function remove(i) {
    if (!confirm('Remove this interested party?')) return;
    persist(
      parties.filter((_, idx) => idx !== i),
      'Removed.'
    );
  }

  const formProps = {
    draft,
    setDraft,
    firstFieldKey: 'relationship',
    tradeLabel: 'Relationship',
    tradeListId: RELATIONSHIP_LIST_ID,
    tradePlaceholder: 'Owner, Co-Owner, LLC…',
    busy,
    onSave: saveDraft,
    onCancel: cancel,
  };

  return (
    <div>
      <datalist id={RELATIONSHIP_LIST_ID}>
        {RELATIONSHIP_OPTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {parties.map((party, i) =>
        editingIndex === i ? (
          <RosterForm key={i} {...formProps} />
        ) : (
          <div className={adminStyles.rosterRow} key={i}>
            <div className={adminStyles.rosterInfo}>
              <div className={adminStyles.rosterName}>
                {party.name || '—'}
                {party.relationship && <span className={adminStyles.rosterTrade}>{party.relationship}</span>}
              </div>
              <div className={adminStyles.rosterMeta}>
                {[party.phone, party.email].filter(Boolean).join('  ·  ') || 'No contact info'}
              </div>
            </div>
            <div className={adminStyles.rosterActions}>
              <button type="button" className={adminStyles.iconBtn} onClick={() => startEdit(i)} aria-label="Edit interested party">
                <i className="ti ti-pencil" aria-hidden="true"></i>
              </button>
              <button type="button" className={adminStyles.iconBtn} onClick={() => remove(i)} aria-label="Remove interested party">
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        )
      )}

      {editingIndex === 'new' ? (
        <RosterForm {...formProps} />
      ) : (
        editingIndex === null && (
          <button type="button" className={adminStyles.addRowBtn} onClick={startAdd}>
            <i className="ti ti-plus" aria-hidden="true"></i> Add interested party
          </button>
        )
      )}

      {message && (
        <p
          className={
            message === 'Saved.' || message === 'Removed.' ? adminStyles.formMsgSuccess : adminStyles.formMsgError
          }
          style={{ marginTop: '0.75rem' }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
