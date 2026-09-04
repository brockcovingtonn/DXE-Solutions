// One-way sync helper: app calendar_events -> the connected admin's
// Google Calendar. Plain fetch() against Google's REST APIs rather than
// the googleapis SDK, since we only need a handful of calls.
//
// A Google API failure here should never block the underlying DB write —
// every export below is safe to call and log-on-failure; callers should
// still wrap calls in try/catch as a second layer of defense.

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

// Returns a valid access token for this admin (refreshing if expired), or
// null if they haven't connected Google Calendar. `adminClient` must be
// the service-role client — this table has no client-readable RLS policy.
async function getValidAccessToken(adminClient, userId) {
  const { data: conn } = await adminClient
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!conn) return null;

  const expiresAt = new Date(conn.token_expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) {
    return { accessToken: conn.access_token, calendarId: conn.calendar_id };
  }

  const refreshed = await refreshAccessToken(conn.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await adminClient
    .from('google_calendar_connections')
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiresAt })
    .eq('user_id', userId);

  return { accessToken: refreshed.access_token, calendarId: conn.calendar_id };
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

  return body;
}

// Creates or updates the Google Calendar event mirroring this app event.
// Returns the google_event_id to persist, or null if there's no
// connection (or the sync call failed).
export async function syncEventToGoogle(adminClient, userId, event) {
  const conn = await getValidAccessToken(adminClient, userId);
  if (!conn) return null;

  const method = event.google_event_id ? 'PATCH' : 'POST';
  const url = event.google_event_id
    ? `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(conn.calendarId)}/events/${event.google_event_id}`
    : `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(conn.calendarId)}/events`;

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
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(conn.calendarId)}/events/${googleEventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${conn.accessToken}` } }
    );
  } catch (err) {
    console.error('Google Calendar delete failed:', err);
  }
}
