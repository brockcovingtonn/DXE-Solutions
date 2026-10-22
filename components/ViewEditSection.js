'use client';

import { useState } from 'react';
import styles from '@/components/portal-shared.module.css';
import Modal from '@/components/Modal';

export default function ViewEditSection({ title, actionLabel = 'Edit', modalMaxWidth, view, edit }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.fullWidthCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(var(--border-rgb),0.18)',
            color: 'var(--navy)',
            padding: '0.35rem 0.85rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.03em',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <i className={`ti ${actionLabel === 'Add' ? 'ti-plus' : 'ti-pencil'}`} aria-hidden="true" style={{ marginRight: '0.3rem' }}></i>
          {actionLabel}
        </button>
      </div>

      {view}

      {open && (
        <Modal title={title} onClose={() => setOpen(false)} maxWidth={modalMaxWidth}>
          {edit}
        </Modal>
      )}
    </div>
  );
}
