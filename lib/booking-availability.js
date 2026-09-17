import { createAdminClient } from './supabase-admin';
import { getPrimaryConnectedAdminId, getFreeBusy } from './google-calendar';

// Availability rules for the public booking page — single-row settings
// table, same pattern as lib/site-settings.js. Actual open slots are
// computed live against whichever admin connected their Google Calendar
// first (getPrimaryConnectedAdminId) — this only holds the rules.

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export async function getBookingAvailability() {
  const db = createAdminClient();
  const { data } = await db.from('booking_availability').select('*').eq('id', true).maybeSingle();
  return data;
}

export async function setBookingAvailability(patch) {
  const db = createAdminClient();
  const { error } = await db
    .from('booking_availability')
    .upsert({ id: true, ...patch, updated_at: new Date().toISOString() });
  if (error) throw error;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

// Converts a wall-clock "YYYY-MM-DD" + "HH:mm" reading in `timeZone` to the
// UTC instant it represents. No timezone library in this repo — this is
// the standard dependency-free trick: format the same instant in both the
// target zone and UTC, and shift by the difference between the two.
function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  const asTz = new Date(naive.toLocaleString('en-US', { timeZone }));
  const asUtc = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offset = asUtc.getTime() - asTz.getTime();
  return new Date(naive.getTime() + offset);
}

// One calendar day's open slots (in `date`'s own weekday, per the
// configured weekly_hours), filtered by notice/lookahead and by real
// busy time on the connected calendar. `connected: false` means no admin
// has connected a calendar yet — the public page should just show nothing
// rather than pretend every slot is open.
export async function computeAvailableSlots({ date }) {
  const config = await getBookingAvailability();
  if (!config) return { slots: [], connected: false };

  const db = createAdminClient();
  const adminId = await getPrimaryConnectedAdminId(db);
  if (!adminId) return { slots: [], connected: false };

  const weekday = WEEKDAY_KEYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const windows = config.weekly_hours?.[weekday] || [];
  if (!windows.length) return { slots: [], connected: true };

  const now = new Date();
  const minStart = addMinutes(now, config.min_notice_hours * 60);
  const maxStart = addMinutes(now, config.max_days_out * 24 * 60);

  let candidates = [];
  for (const window of windows) {
    let cursor = zonedTimeToUtc(date, window.start, config.timezone);
    const end = zonedTimeToUtc(date, window.end, config.timezone);
    while (addMinutes(cursor, config.session_minutes) <= end) {
      candidates.push(cursor);
      cursor = addMinutes(cursor, config.session_minutes);
    }
  }
  candidates = candidates.filter((c) => c >= minStart && c <= maxStart);
  if (!candidates.length) return { slots: [], connected: true };

  const dayStart = zonedTimeToUtc(date, '00:00', config.timezone);
  const dayEnd = addMinutes(dayStart, 24 * 60);
  const busy = await getFreeBusy(db, adminId, dayStart.toISOString(), dayEnd.toISOString());
  // null means the freebusy check itself failed (e.g. missing scope,
  // token/network error) — never fall back to "assume clear" for
  // something this consequential. Report as connected (so the UI doesn't
  // say "not connected" when it plainly is) but with no offerable slots.
  if (busy === null) return { slots: [], connected: true };
  const bufferMs = config.buffer_minutes * 60_000;

  const free = candidates.filter((slotStart) => {
    const slotEnd = addMinutes(slotStart, config.session_minutes);
    return !busy.some((b) => {
      const busyStart = new Date(b.start).getTime() - bufferMs;
      const busyEnd = new Date(b.end).getTime() + bufferMs;
      return slotStart.getTime() < busyEnd && slotEnd.getTime() > busyStart;
    });
  });

  return { slots: free.map((d) => d.toISOString()), connected: true };
}

// Re-checked right before actually booking, to close the race window
// between "the visitor loaded the slot list" and "they clicked one".
export async function isSlotStillFree(startTimeISO) {
  const config = await getBookingAvailability();
  const db = createAdminClient();
  const adminId = await getPrimaryConnectedAdminId(db);
  if (!config || !adminId) return { free: false, adminId: null, config, start: null, end: null };

  const start = new Date(startTimeISO);
  const end = addMinutes(start, config.session_minutes);
  const bufferMs = config.buffer_minutes * 60_000;
  const busy = await getFreeBusy(
    db,
    adminId,
    new Date(start.getTime() - bufferMs).toISOString(),
    new Date(end.getTime() + bufferMs).toISOString()
  );
  // Same rule as computeAvailableSlots: a failed check is never "free".
  const free = busy !== null && !busy.some((b) => start.getTime() < new Date(b.end).getTime() && end.getTime() > new Date(b.start).getTime());
  return { free, adminId, config, start, end };
}
