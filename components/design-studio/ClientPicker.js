'use client';

import { useState } from 'react';
import { C, S } from '@/lib/design-studio/brand';

// Search-and-select (or create) the real client account a quote belongs to.
// Search pattern mirrors ScanManager.js's NewProjectForm client picker.
export default function ClientPicker({ client, onChange }) {
  const [mode, setMode] = useState('search'); // 'search' | 'create'
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(null);

  function onQueryChange(value) {
    setQ(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/design-studio/clients?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.clients || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    setSearchTimer(timer);
  }

  if (client) {
    return (
      <div style={{ ...S.grid2 }}>
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{client.name}</div>
            <div style={{ fontSize: 12.5, color: C.muted }}>
              {client.email}
              {client.phone ? ` · ${client.phone}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{ background: 'none', border: 'none', color: C.clay, cursor: 'pointer', fontSize: 12.5 }}
          >
            Change client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setMode('search')}
          style={{ ...S.small, fontWeight: mode === 'search' ? 700 : 400, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: 14 }}
        >
          Find existing client
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          style={{ ...S.small, fontWeight: mode === 'create' ? 700 : 400, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          + New client
        </button>
      </div>

      {mode === 'search' ? (
        <>
          <input
            type="text"
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search clients by name or email…"
            style={S.input}
          />
          <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 6 }}>
            {searching ? <div style={S.small}>Searching…</div> : null}
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c)}
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
        <NewClientForm onCreated={onChange} />
      )}
    </div>
  );
}

function NewClientForm({ onCreated }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    if (!firstName.trim() || !email.trim()) {
      setError('First name and email are required.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/design-studio/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create the client.');
      onCreated(data.client);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={S.grid2}>
      <div>
        <label style={S.label}>First name</label>
        <input style={S.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div>
        <label style={S.label}>Last name</label>
        <input style={S.input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div>
        <label style={S.label}>Email</label>
        <input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
      </div>
      <div>
        <label style={S.label}>Phone</label>
        <input style={S.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {error ? <div style={{ gridColumn: '1 / -1', fontSize: 12, color: C.warn }}>{error}</div> : null}
      <div style={{ gridColumn: '1 / -1' }}>
        <button type="button" onClick={create} disabled={creating} style={{ ...S.btn, fontSize: 12.5, padding: '6px 12px' }}>
          {creating ? 'Creating…' : 'Create client'}
        </button>
      </div>
    </div>
  );
}
