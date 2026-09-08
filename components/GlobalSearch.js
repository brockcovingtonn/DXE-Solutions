'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CONFIGS = {
  admin: {
    endpoint: '/api/admin/search',
    placeholder: 'Search clients, projects, contacts, documents...',
    groups: ['clients', 'projects', 'contacts', 'documents'],
    hrefs: {
      clients: (item) => `/admin/clients/${item.id}`,
      projects: (item) => `/admin/projects/${item.id}`,
      contacts: (item) => `/admin/contacts/${item.id}`,
      documents: (item) => `/admin/projects/${item.project_id}`,
    },
  },
  client: {
    endpoint: '/api/search',
    placeholder: 'Search your projects, documents, contacts...',
    groups: ['projects', 'documents', 'contacts'],
    hrefs: {
      projects: (item) => `/portal/projects/${item.id}/overview`,
      documents: (item) => `/portal/projects/${item.project_id}/documents`,
      contacts: null,
    },
  },
  employee: {
    endpoint: '/api/search',
    placeholder: 'Search your projects, documents, contacts...',
    groups: ['projects', 'documents', 'contacts'],
    hrefs: {
      projects: (item) => `/projects/${item.id}/cover-sheet`,
      documents: (item) => `/projects/${item.project_id}/cover-sheet`,
      contacts: null,
    },
  },
};

const LABELS = { clients: 'Clients', projects: 'Projects', contacts: 'Contacts', documents: 'Documents' };

function emptyResultsFor(groups) {
  return Object.fromEntries(groups.map((g) => [g, []]));
}

export default function GlobalSearch({ role = 'admin' }) {
  const config = CONFIGS[role] || CONFIGS.admin;
  const router = useRouter();
  const containerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(() => emptyResultsFor(config.groups));
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
      setResults(emptyResultsFor(config.groups));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      fetch(`${config.endpoint}?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : emptyResultsFor(config.groups)))
        .then((data) => setResults(data))
        .catch(() => setResults(emptyResultsFor(config.groups)))
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, config.endpoint]);

  const totalCount = config.groups.reduce((sum, g) => sum + (results[g]?.length || 0), 0);

  function go(href) {
    setIsOpen(false);
    setQuery('');
    router.push(href);
  }

  function renderItem(group, item) {
    switch (group) {
      case 'clients':
        return (
          <>
            <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>
              {item.first_name} {item.last_name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{item.email}</div>
          </>
        );
      case 'projects':
        return (
          <>
            <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{item.name}</div>
            {item.address && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{item.address}</div>}
          </>
        );
      case 'contacts':
        return (
          <>
            <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{item.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {[item.company, item.trade].filter(Boolean).join(' · ')}
              {item.phone ? ` · ${item.phone}` : ''}
            </div>
          </>
        );
      case 'documents':
        return (
          <>
            <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{item.file_name}</div>
            {item.projects?.name && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{item.projects.name}</div>}
          </>
        );
      default:
        return null;
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
      <div style={{ position: 'relative' }}>
        <i
          className="ti ti-search"
          aria-hidden="true"
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}
        ></i>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={config.placeholder}
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
            border: '1px solid rgba(var(--border-rgb),0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: '420px',
            overflowY: 'auto',
            zIndex: 200,
          }}
        >
          {isLoading && <p style={{ padding: '0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Searching...</p>}

          {!isLoading && totalCount === 0 && (
            <p style={{ padding: '0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No results for &quot;{query}&quot;.</p>
          )}

          {!isLoading &&
            config.groups.map((group) => (
              <ResultGroup
                key={group}
                label={LABELS[group]}
                items={results[group] || []}
                onSelect={config.hrefs[group] ? (item) => go(config.hrefs[group](item)) : null}
                render={(item) => renderItem(group, item)}
              />
            ))}
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
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      {items.map((item) =>
        onSelect ? (
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
              borderTop: '1px solid rgba(var(--border-rgb),0.06)',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            {render(item)}
          </button>
        ) : (
          <div
            key={item.id}
            style={{
              padding: '0.5rem 0.85rem',
              borderTop: '1px solid rgba(var(--border-rgb),0.06)',
            }}
          >
            {render(item)}
          </div>
        )
      )}
    </div>
  );
}
