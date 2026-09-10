'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { TRADE_OPTIONS } from '@/lib/constants';
import RosterForm from '@/components/admin/RosterForm';

const TRADE_LIST_ID = 'project-team-trades';
const emptyMember = { trade: '', name: '', phone: '', email: '' };

function fromInitial(initialTeam) {
  return (initialTeam || []).map((m) => ({
    trade: m.trade || '',
    name: m.name || '',
    phone: m.phone || '',
    email: m.email || '',
  }));
}

export default function ProjectTeamEditor({ projectId, initialTeam }) {
  const router = useRouter();

  const [team, setTeam] = useState(() => fromInitial(initialTeam));
  const [editingIndex, setEditingIndex] = useState(null); // number | 'new' | null
  const [draft, setDraft] = useState(emptyMember);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (Array.isArray(initialTeam)) setTeam(fromInitial(initialTeam));
  }, [initialTeam]);

  async function persist(nextTeam, successMsg) {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, team: nextTeam }),
      });
      if (!res.ok) throw new Error();
      setTeam(nextTeam);
      setEditingIndex(null);
      setDraft(emptyMember);
      setMessage(successMsg);
      router.refresh();
    } catch {
      setMessage('Could not save changes.');
    } finally {
      setBusy(false);
    }
  }

  function startAdd() {
    setDraft(emptyMember);
    setEditingIndex('new');
    setMessage('');
  }

  function startEdit(i) {
    setDraft({ ...team[i] });
    setEditingIndex(i);
    setMessage('');
  }

  function cancel() {
    setEditingIndex(null);
    setDraft(emptyMember);
  }

  function saveDraft() {
    if (!draft.name.trim()) return;
    const next =
      editingIndex === 'new'
        ? [...team, draft]
        : team.map((m, i) => (i === editingIndex ? draft : m));
    persist(next, 'Saved.');
  }

  function remove(i) {
    if (!confirm('Remove this team member?')) return;
    persist(
      team.filter((_, idx) => idx !== i),
      'Removed.'
    );
  }

  return (
    <div>
      <datalist id={TRADE_LIST_ID}>
        {TRADE_OPTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {team.map((member, i) =>
        editingIndex === i ? (
          <RosterForm
            key={i}
            draft={draft}
            setDraft={setDraft}
            tradeLabel="Trade / Title"
            tradeListId={TRADE_LIST_ID}
            tradePlaceholder="Contractor, Architect…"
            busy={busy}
            onSave={saveDraft}
            onCancel={cancel}
          />
        ) : (
          <div className={adminStyles.rosterRow} key={i}>
            <div className={adminStyles.rosterInfo}>
              <div className={adminStyles.rosterName}>
                {member.name || '—'}
                {member.trade && <span className={adminStyles.rosterTrade}>{member.trade}</span>}
              </div>
              <div className={adminStyles.rosterMeta}>
                {[member.phone, member.email].filter(Boolean).join('  ·  ') || 'No contact info'}
              </div>
            </div>
            <div className={adminStyles.rosterActions}>
              <button type="button" className={adminStyles.iconBtn} onClick={() => startEdit(i)} aria-label="Edit team member">
                <i className="ti ti-pencil" aria-hidden="true"></i>
              </button>
              <button type="button" className={adminStyles.iconBtn} onClick={() => remove(i)} aria-label="Remove team member">
                <i className="ti ti-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        )
      )}

      {editingIndex === 'new' ? (
        <RosterForm
          draft={draft}
          setDraft={setDraft}
          tradeLabel="Trade / Title"
          tradeListId={TRADE_LIST_ID}
          tradePlaceholder="Contractor, Architect…"
          busy={busy}
          onSave={saveDraft}
          onCancel={cancel}
        />
      ) : (
        editingIndex === null && (
          <button type="button" className={adminStyles.addRowBtn} onClick={startAdd}>
            <i className="ti ti-plus" aria-hidden="true"></i> Add team member
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
