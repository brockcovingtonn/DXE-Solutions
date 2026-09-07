// Builds a minimal RFC 5545 .ics file for a single calendar event, as a
// data: URL the browser can download/open directly into whatever
// calendar app is installed (Apple Calendar, Outlook, etc.) — no
// provider-specific integration needed.

function pad(n) {
  return String(n).padStart(2, '0');
}

function localDateOnly(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function utcDateTime(d) {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildIcsDataUrl({ title, description, startTime, endTime, allDay }) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;

  let dtstart;
  let dtend;

  if (allDay) {
    dtstart = `DTSTART;VALUE=DATE:${localDateOnly(start)}`;
    const endDate = end && end.getTime() !== start.getTime() ? end : start;
    const exclusiveEnd = new Date(endDate);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
    dtend = `DTEND;VALUE=DATE:${localDateOnly(exclusiveEnd)}`;
  } else {
    dtstart = `DTSTART:${utcDateTime(start)}`;
    const endInstant = end || new Date(start.getTime() + 60 * 60 * 1000);
    dtend = `DTEND:${utcDateTime(endInstant)}`;
  }

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@dxesolutions.com`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DXE Solutions//Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcDateTime(new Date())}`,
    dtstart,
    dtend,
    `SUMMARY:${escapeText(title)}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const ics = lines.join('\r\n');
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}
