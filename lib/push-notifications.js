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

// APNs auth-key (.p8) tokens work for either environment, but a given
// device token is only valid against the host matching how the app was
// actually signed — a mismatch (e.g. our stored "environment" label is
// stale, or the app was archived under a different provisioning profile
// than expected) shows up as one of these reasons rather than a clean
// "wrong host" error.
const ENV_MISMATCH_REASONS = ['BadDeviceToken', 'BadEnvironmentKeyInToken'];

function isEnvMismatch(result) {
  return !result.success && ENV_MISMATCH_REASONS.some((reason) => (result.error || '').includes(reason));
}

// Tries the stored environment first; on a mismatch-shaped failure,
// retries the other host once rather than trusting our own guess —
// self-heals device_tokens.environment instead of requiring a native
// fix for something the server can resolve on its own.
async function sendToDeviceWithFallback(deviceToken, payload, environment) {
  const first = await sendToDevice(deviceToken, payload, environment);
  if (first.success || !isEnvMismatch(first)) return { ...first, environment };

  const fallbackEnv = environment === 'sandbox' ? 'production' : 'sandbox';
  const second = await sendToDevice(deviceToken, payload, fallbackEnv);
  return { ...second, environment: second.success ? fallbackEnv : environment };
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

  // The app icon badge is driven entirely by aps.badge on delivery —
  // there's no other way to set it remotely — so compute the
  // recipient's true unread total for every push rather than omitting
  // it (which had left the icon badge permanently blank).
  const { data: badgeCount } = await admin.rpc('get_unread_count_for_user', { p_user_id: userId });

  const payload = {
    aps: { alert: { title, body }, sound: 'default', badge: badgeCount ?? 0 },
    ...data,
  };

  const results = await Promise.allSettled(
    tokens.map((row) => sendToDeviceWithFallback(row.token, payload, row.environment))
  );

  const deadTokens = [];
  const environmentFixes = [];
  results.forEach((result, i) => {
    if (result.status !== 'fulfilled') {
      console.error('APNs send threw:', result.reason);
      return;
    }
    const { success, status, error, environment } = result.value;
    if (success) {
      if (environment !== tokens[i].environment) {
        environmentFixes.push({ token: tokens[i].token, environment });
      }
      return;
    }
    if (status === 410 || (error || '').includes('BadDeviceToken')) {
      deadTokens.push(tokens[i].token);
    } else {
      // Anything else (bad cert/env, expired provider token, wrong topic,
      // etc.) was previously swallowed silently — surface it so a
      // production delivery problem is actually diagnosable.
      console.error('APNs send failed:', { status, error });
    }
  });

  if (deadTokens.length > 0) {
    await admin.from('device_tokens').delete().in('token', deadTokens);
  }
  for (const fix of environmentFixes) {
    await admin.from('device_tokens').update({ environment: fix.environment }).eq('token', fix.token);
  }
}
