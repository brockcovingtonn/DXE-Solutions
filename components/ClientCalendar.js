'use client';

import { useState } from 'react';
import CalendarView from '@/components/CalendarView';
import AddToCalendarLink from '@/components/AddToCalendarLink';

export default function ClientCalendar({ events }) {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <CalendarView events={events} onSelectEvent={setSelected} selectedEventId={selected?.id} />

      {selected && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid rgba(62,84,104,0.12)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--navy)' }}>{selected.title}</div>
            <AddToCalendarLink event={selected} />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gold)', marginTop: '0.3rem' }}>
            {selected.all_day
              ? new Date(selected.start_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : new Date(selected.start_time).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
          {selected.description && (
            <p style={{ fontSize: '0.85rem', color: '#4a5568', lineHeight: 1.6, marginTop: '0.6rem' }}>{selected.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
