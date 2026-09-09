// Two-way sync helper between app calendar_events and the connected
// admin's Google Calendar. Plain fetch() against Google's REST APIs
// rather than the googleapis SDK, since we only need a handful of calls.
//
// Push (app -> Google): syncEventToGoogle/deleteEventFromGoogle, called
// right after a calendar_events write.
//
// Pull (Google -> app): Google can't call our functions directly, so we
// register a push-notification "watch" channel (watchCalendar) pointing
// at /api/admin/google-calendar/webhook. Google pings that endpoint
// whenever something changes; the handler then calls
// pullChangesFromGoogle to fetch the actual diff via an incremental
// sync token and apply it to calendar_events. Watch channels expire
// (max ~7 days) and are renewed by a daily cron hitting
// /api/cron/renew-google-calendar-watch.
//
// A Google API failure here should never block the underlying DB write —
// every export below is safe to call and log-on-failure; callers should
// still wrap calls in try/catch as a second layer of defense.

import { randomUUID } from 'node:crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function redirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/google-calendar/callback`;
}

export function getGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: state || '',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to exchange code for tokens: ${await res.text()}`);
  }

  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Google access token: ${await res.text()}`);
  }

  return res.json(); // { access_token, expires_in, ... }
}

// Returns { accessToken, calendarId, syncToken } for this admin
// (refreshing the access token if expired), or null if they haven't
// connected Google Calendar. `adminClient` must be the service-role
// client — this table has no client-readable RLS policy.
async function getValidAccessToken(adminClient, userId) {
  const { data: conn } = await adminClient
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!conn) return null;

  const expiresAt = new Date(conn.token_expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) {
    return { accessToken: conn.access_token, calendarId: conn.calendar_id, syncToken: conn.sync_token };
  }

  const refreshed = await refreshAccessToken(conn.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await adminClient
    .from('google_calendar_connections')
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiresAt })
    .eq('user_id', userId);

  return { accessToken: refreshed.access_token, calendarId: conn.calendar_id, syncToken: conn.sync_token };
}

function toGoogleEvent(event) {
  const body = {
    summary: event.title,
    description: event.description || undefined,
  };

  if (event.all_day) {
    body.start = { date: event.start_time.slice(0, 10) };
    body.end = { date: (event.end_time || event.start_time).slice(0, 10) };
  } else {
    body.start = { dateTime: event.start_time };
    body.end = { dateTime: event.end_time || event.start_time };
  }

  if (event.guests?.length) {
    body.attendees = event.guests.map((g) => ({ email: g.email, displayName: g.name || undefined }));
  }

  return body;
}

// Creates or updates the Google Calendar event mirroring this app event.
// `event.guests` (if present) is pushed as real Google attendees —
// sendUpdates=all means Google emails them an actual invite. Returns the
// google_event_id to persist, or null if there's no connection (or the
// sync call failed).
export async function syncEventToGoogle(adminClient, userId, event) {
  const conn = await getValidAccessToken(adminClient, userId);
  if (!conn) return null;

  const method = event.google_event_id ? 'PATCH' : 'POST';
  const base = event.google_event_id
    ? `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(conn.calendarId)}/events/${event.google_event_id}`
    : `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(conn.calendarId)}/events`;
  const url = `${base}?sendUpdates=all`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${conn.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toGoogleEvent(event)),
  });

  if (!res.ok) {
    console.error('Google Calendar sync failed:', await res.text());
    return event.google_event_id || null;
  }

  const data = await res.json();
  return data.id;
}

export async function deleteEventFromGoogle(adminClient, userId, googleEventId) {
  if (!googleEventId) return;

  const conn = await getValidAccessToken(adminClient, userId);
  if (!conn) return;

  try {
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(conn.calendarId)}/events/${googleEventId}?sendUpdates=all`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${conn.accessToken}` } }
    );
  } catch (err) {
    console.error('Google Calendar delete failed:', err);
  }
}

// Any admin who hasn't connected their own calendar yet still needs
// employee-created events to land somewhere — returns the
// earliest-connected admin's user_id, or null if none has connected.
export async function getPrimaryConnectedAdminId(adminClient) {
  const { data } = await adminClient
    .from('google_calendar_connections')
    .select('user_id')
    .order('connected_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.user_id || null;
}

// Employees can now connect their own Google Calendar too (same as
// admin). An employee's event syncs to their own calendar if they've
// connected one; otherwise it falls back to whichever admin has one
// connected, so it still lands somewhere.
export async function getSyncTargetUserId(adminClient, actingUserId) {
  const { data } = await adminClient
    .from('google_calendar_connections')
    .select('user_id')
    .eq('user_id', actingUserId)
    .maybeSingle();
  if (data?.user_id) return data.user_id;
  return getPrimaryConnectedAdminId(adminClient);
}

function webhookUrl() {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/google-calendar/webhook`;
}

// Registers (or renews) a push-notification channel so Google pings our
// webhook whenever this admin's calendar changes. Channels expire after
// at most ~7 days — renewal is handled by a daily cron. Safe to call
// repeatedly; each call replaces the previous channel.
export async function watchCalendar(adminClient, userId) {
  const conn = await getValidAccessToken(adminClient, userId);
  if (!conn) return;

  const { data: row } = await adminClient
    .from('google_calendar_connections')
    .select('calendar_id')
    .eq('user_id', userId)
    .single();
  if (!row) return;

  const channelId = randomUUID();
  const token = randomUUID();

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(row.calendar_id)}/events/watch`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: channelId, type: 'web_hook', address: webhookUrl(), token }),
    }
  );

  if (!res.ok) {
    console.error('Google Calendar watch registration failed:', await res.text());
    return;
  }

  const data = await res.json();
  await adminClient
    .from('google_calendar_connections')
    .update({
      watch_channel_id: channelId,
      watch_resource_id: data.resourceId,
      watch_token: token,
      watch_expiration: new Date(Number(data.expiration)).toISOString(),
    })
    .eq('user_id', userId);
}

export async function stopWatchingCalendar(adminClient, userId) {
  const { data: row } = await adminClient
    .from('google_calendar_connections')
    .select('access_token, watch_channel_id, watch_resource_id')
    .eq('user_id', userId)
    .single();
  if (!row?.watch_channel_id) return;

  try {
    await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${row.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.watch_channel_id, resourceId: row.watch_resource_id }),
    });
  } catch (err) {
    console.error('Google Calendar stop-watch failed:', err);
  }
}

// Attendees Google returns alongside the organizer — drop the
// organizer's own entry so it doesn't show up as a "guest".
function nonOrganizerAttendees(attendees) {
  return (attendees || []).filter((a) => !a.self && !a.organizer);
}

async function applyGoogleEventToDb(adminClient, userId, item) {
  // Matched purely by google_event_id (unique per calendar) — NOT also
  // scoped to created_by = userId. An event pushed to Google can have
  // been created by an employee (synced via the connected admin's
  // calendar, so created_by is the employee's id, not this admin's);
  // scoping by created_by would miss it and insert a duplicate instead
  // of updating the original.
  const { data: existing } = await adminClient
    .from('calendar_events')
    .select('id')
    .eq('google_event_id', item.id)
    .maybeSingle();

  if (item.status === 'cancelled') {
    if (existing) await adminClient.from('calendar_events').delete().eq('id', existing.id);
    return;
  }

  const allDay = !!item.start?.date;
  const startTime = allDay ? new Date(`${item.start.date}T00:00:00Z`).toISOString() : item.start?.dateTime;
  const endTime = allDay
    ? item.end?.date ? new Date(`${item.end.date}T00:00:00Z`).toISOString() : null
    : item.end?.dateTime || null;
  if (!startTime) return;

  const fields = {
    title: item.summary || '(no title)',
    description: item.description || null,
    start_time: startTime,
    end_time: endTime,
    all_day: allDay,
    google_event_id: item.id,
  };

  let eventId = existing?.id;
  if (existing) {
    await adminClient.from('calendar_events').update(fields).eq('id', existing.id);
  } else {
    const { data: inserted, error } = await adminClient
      .from('calendar_events')
      .insert({ ...fields, project_id: null, event_type: 'other', visible_to_client: false, created_by: userId })
      .select('id')
      .single();
    if (error) {
      console.error('Failed to insert event pulled from Google:', error.message);
      return;
    }
    eventId = inserted.id;
  }

  const guests = nonOrganizerAttendees(item.attendees);
  await adminClient.from('calendar_event_guests').delete().eq('calendar_event_id', eventId);
  if (guests.length > 0) {
    await adminClient.from('calendar_event_guests').insert(
      guests.map((g) => ({
        calendar_event_id: eventId,
        email: g.email,
        name: g.displayName || null,
        response_status: g.responseStatus || 'needsAction',
      }))
    );
  }
}

// Pulls changes made directly in Google Calendar back into calendar_events
// (new events, edits, and deletions). Uses Google's incremental sync
// tokens so each call only processes what changed since the last one.
// On first run (no stored sync token), this captures a baseline token
// without importing any existing events — only events created or edited
// after that point will ever flow into the app, so a personal calendar's
// history/existing future events don't get pulled in.
export async function pullChangesFromGoogle(adminClient, userId) {
  const conn = await getValidAccessToken(adminClient, userId);
  if (!conn) return;

  const { data: row } = await adminClient
    .from('google_calendar_connections')
    .select('calendar_id')
    .eq('user_id', userId)
    .single();
  if (!row) return;

  const isBaseline = !conn.syncToken;
  let pageToken;
  let nextSyncToken;
  const items = [];

  do {
    const params = new URLSearchParams({ singleEvents: 'true', maxResults: '250' });
    if (conn.syncToken) params.set('syncToken', conn.syncToken);
    else params.set('timeMin', new Date().toISOString());
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(row.calendar_id)}/events?${params}`,
      { headers: { Authorization: `Bearer ${conn.accessToken}` } }
    );

    if (!res.ok) {
      if (res.status === 410) {
        // Sync token expired/invalid — drop it and re-baseline.
        await adminClient.from('google_calendar_connections').update({ sync_token: null }).eq('user_id', userId);
        return pullChangesFromGoogle(adminClient, userId);
      }
      console.error('Google Calendar pull failed:', await res.text());
      return;
    }

    const data = await res.json();
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
  } while (pageToken);

  if (!isBaseline) {
    for (const item of items) {
      await applyGoogleEventToDb(adminClient, userId, item);
    }
  }

  if (nextSyncToken) {
    await adminClient.from('google_calendar_connections').update({ sync_token: nextSyncToken }).eq('user_id', userId);
  }
}
