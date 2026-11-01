import { createHash, createHmac, randomBytes } from 'node:crypto';

export function createShowsStore({ env = process.env, request = fetch } = {}) {
  return async function shows(operation, payload = {}) {
    const url = env.GOOGLE_DRIVE_SCRIPT_URL, secret = env.GOOGLE_DRIVE_SHARED_SECRET;
    if (!url || !secret || secret.length < 32) throw new Error('SHOWS_CONFIG');
    const parsed = new URL(url);
    if (parsed.origin !== 'https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error('SHOWS_CONFIG');
    const body = JSON.stringify({ operation, ...payload }), timestamp = Date.now(), nonce = randomBytes(16).toString('hex');
    const digest = createHash('sha256').update(body).digest('hex');
    const signature = createHmac('sha256', secret).update(`shows\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
    const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'shows', timestamp, nonce, signature, body }), signal: AbortSignal.timeout(operation === 'sync' ? 240000 : 25000) });
    if (!response.ok) throw new Error('SHOWS_UNAVAILABLE');
    const result = await response.json();
    if (!result.ok) throw new Error('SHOWS_UNAVAILABLE');
    return result.data;
  };
}
