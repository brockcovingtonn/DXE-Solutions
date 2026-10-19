'use client';

import { useState } from 'react';
import Link from 'next/link';
import AddToCalendarLink from '@/components/AddToCalendarLink';
import { startOfDay, isSameDay, formatTime, eventsOnDay } from '@/lib/calendar-utils';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function monthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

export default function MiniMonthCalendar({ events, viewAllHref }) {
  const today = startOfDay(new Date());
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const cells = monthGrid(monthCursor);
  const selectedEvents = eventsOnDay(events, selected);
  const isToday = isSameDay(selected, today);

  function changeMonth(delta) {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem' }}
        >
          <i className="ti ti-chevron-left" aria-hidden="true"></i>
        </button>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--navy)' }}>
          {monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem' }}
        >
          <i className="ti ti-chevron-right" aria-hidden="true"></i>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '1rem' }}>
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-tertiary)', paddingBottom: '0.25rem' }}>
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const count = eventsOnDay(events, day).length;
          const isSelected = isSameDay(day, selected);
          const isTodayCell = isSameDay(day, today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(day)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: isTodayCell ? 700 : 400,
                color: isSelected ? 'var(--white)' : isTodayCell ? 'var(--gold)' : 'var(--navy)',
                background: isSelected ? 'var(--navy)' : 'transparent',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
              }}
            >
              {day.getDate()}
              {count > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '3px',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--gold-light)' : 'var(--gold)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--navy)', marginBottom: '0.75rem' }}>
        {isToday ? 'Today' : selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      {selectedEvents.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>Nothing scheduled.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {selectedEvents.map((e) => (
            <div key={e.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 600, flexShrink: 0, width: '4.2rem' }}>
                {e.all_day ? 'All day' : formatTime(e.start_time)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{e.title}</div>
                {e.projects?.name && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{e.projects.name}</div>}
              </div>
              <AddToCalendarLink event={e} iconOnly />
            </div>
          ))}
        </div>
      )}

      {viewAllHref && (
        <Link href={viewAllHref} style={{ fontSize: '0.78rem', color: 'var(--navy)', fontWeight: 500 }}>
          View full calendar →
        </Link>
      )}
    </div>
  );
}
