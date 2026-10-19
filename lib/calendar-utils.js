export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfWeek(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function eventsOnDay(events, day) {
  return (events || [])
    .filter((e) => {
      const start = startOfDay(new Date(e.start_time));
      const end = e.end_time ? startOfDay(new Date(e.end_time)) : start;
      return start <= day && day <= end;
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}
