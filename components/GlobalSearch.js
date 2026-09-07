'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const emptyResults = { clients: [], projects: [], contacts: [], documents: [] };

export default function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(emptyResults);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(emptyResults);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : emptyResults))
        .then((data) => setResults(data))
        .catch(() => setResults(emptyResults))
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const totalCount =
    results.clients.length + results.projects.length + results.contacts.length + results.documents.length;

  function go(href) {
    setIsOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
      <div style={{ position: 'relative' }}>
        <i
          className="ti ti-search"
          aria-hidden="true"
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: '0.9rem' }}
        ></i>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search clients, projects, contacts, documents..."
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem 0.5rem 2.1rem',
            fontSize: '0.82rem',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            borderRadius: '4px',
            outline: 'none',
          }}
        />
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.4rem)',
            left: 0,
            right: 0,
            background: 'var(--white)',
            border: '1px solid rgba(62,84,104,0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: '420px',
            overflowY: 'auto',
            zIndex: 200,
          }}
        >
          {isLoading && <p style={{ padding: '0.85rem', fontSize: '0.8rem', color: '#718096' }}>Searching...</p>}

          {!isLoading && totalCount === 0 && (
            <p style={{ padding: '0.85rem', fontSize: '0.8rem', color: '#718096' }}>No results for &quot;{query}&quot;.</p>
          )}

          {!isLoading && (
            <>
              <ResultGroup
                label="Clients"
                items={results.clients}
                onSelect={(item) => go(`/admin/clients/${item.id}`)}
                render={(item) => (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>
                      {item.first_name} {item.last_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#a0aec0' }}>{item.email}</div>
                  </>
                )}
              />
              <ResultGroup
                label="Projects"
                items={results.projects}
                onSelect={(item) => go(`/admin/projects/${item.id}`)}
                render={(item) => (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{item.name}</div>
                    {item.address && <div style={{ fontSize: '0.72rem', color: '#a0aec0' }}>{item.address}</div>}
                  </>
                )}
              />
              <ResultGroup
                label="Contacts"
                items={results.contacts}
                onSelect={(item) => go(`/admin/contacts/${item.id}`)}
                render={(item) => (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#a0aec0' }}>
                      {[item.company, item.trade].filter(Boolean).join(' · ')}
                    </div>
                  </>
                )}
              />
              <ResultGroup
                label="Documents"
                items={results.documents}
                onSelect={(item) => go(`/admin/projects/${item.project_id}`)}
                render={(item) => (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{item.file_name}</div>
                    {item.projects?.name && <div style={{ fontSize: '0.72rem', color: '#a0aec0' }}>{item.projects.name}</div>}
                  </>
                )}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ label, items, onSelect, render }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div
        style={{
          padding: '0.5rem 0.85rem 0.3rem',
          fontSize: '0.65rem',
          fontWeight: 600,
          color: '#a0aec0',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '0.5rem 0.85rem',
            border: 'none',
            borderTop: '1px solid rgba(62,84,104,0.06)',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          {render(item)}
        </button>
      ))}
    </div>
  );
}
