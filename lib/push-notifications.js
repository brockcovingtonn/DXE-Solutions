import http2 from 'http2';
import jwt from 'jsonwebtoken';
import { createAdminClient } from '@/lib/supabase-admin';

// Shared helper for sending push notifications to the native app via
// direct APNs (Apple's HTTP/2 provider API) — no third-party service.
// Used by API routes the same way lib/email-notifications.js is: called
// directly after a write that the other party should be told about.
//
// Requires APNS_KEY_ID, APNS_TEAM_ID, and APNS_PRIVATE_KEY (the .p8 key's
// contents) as env vars. Until those are set, this quietly no-ops —
// same graceful-skip pattern as getResend() in email-notifications.js —
// so nothing breaks before Apple Developer Portal setup is finished.

const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'com.dxesolutions.native';

// APNs provider tokens are valid up to an hour; Apple asks that you not
// mint a fresh one on every request. Cache it across warm serverless
// invocations (harmless if the process is cold and this resets).
let cachedProviderToken = null;
let cachedProviderTokenIssuedAt = 0;

function isConfigured() {
  return !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY);
}

function getProviderToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedProviderToken && now - cachedProviderTokenIssuedAt < 55 * 60) {
    return cachedProviderToken;
  }

  const privateKey = process.env.APNS_PRIVATE_KEY.replace(/\\n/g, '\n');

  cachedProviderToken = jwt.sign(
    { iss: process.env.APNS_TEAM_ID, iat: now },
    privateKey,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: process.env.APNS_KEY_ID } }
  );
  cachedProviderTokenIssuedAt = now;
  return cachedProviderToken;
}

function sendToDevice(deviceToken, payload, environment) {
  return new Promise((resolve) => {
    const host = environment === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
    const client = http2.connect(host);

    client.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${getProviderToken()}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    });

    let status = null;
    let responseBody = '';

    req.on('response', (headers) => {
      status = headers[':status'];
    });
    req.on('data', (chunk) => {
      responseBody += chunk;
    });
    req.on('end', () => {
      client.close();
      resolve({ success: status === 200, status, error: responseBody });
    });
    req.on('error', (err) => {
      client.close();
      resolve({ success: false, error: err.message });
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Sends a push notification to every device a user is signed into the
 * native app on. Silently does nothing if APNs isn't configured yet, or
 * the user has no registered devices — callers never need to check
 * either condition themselves.
 *
 * @param {string} userId
 * @param {{ title: string, body: string, data?: object }} notification
 */
export async function sendPushToUser(userId, { title, body, data = {} }) {
  if (!isConfigured()) return;
  if (!userId) return;

  const admin = createAdminClient();
  const { data: tokens } = await admin
    .from('device_tokens')
    .select('token, environment')
    .eq('user_id', userId);

  if (!tokens || tokens.length === 0) return;

  const payload = {
    aps: { alert: { title, body }, sound: 'default' },
    ...data,
  };

  const results = await Promise.allSettled(
    tokens.map((row) => sendToDevice(row.token, payload, row.environment))
  );

  const deadTokens = [];
  results.forEach((result, i) => {
    if (result.status !== 'fulfilled') return;
    const { success, status, error } = result.value;
    if (!success && (status === 410 || (error || '').includes('BadDeviceToken'))) {
      deadTokens.push(tokens[i].token);
    }
  });

  if (deadTokens.length > 0) {
    await admin.from('device_tokens').delete().in('token', deadTokens);
  }
}
