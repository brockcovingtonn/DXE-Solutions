'use client';

import { buildIcsDataUrl } from '@/lib/ics';

export default function AddToCalendarLink({ event, iconOnly, style }) {
  const href = buildIcsDataUrl({
    title: event.title,
    description: event.description,
    startTime: event.start_time,
    endTime: event.end_time,
    allDay: event.all_day,
  });

  const fileName = `${(event.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;

  return (
    <a
      href={href}
      download={fileName}
      title="Add to Calendar"
      style={{
        fontSize: '0.75rem',
        color: 'var(--navy)',
        fontWeight: 500,
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        flexShrink: 0,
        ...style,
      }}
    >
      <i className="ti ti-calendar-plus" aria-hidden="true"></i>
      {!iconOnly && ' Add to Calendar'}
    </a>
  );
}
