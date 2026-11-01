import { createHash, createHmac, randomBytes } from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const opaque = prefix => `${prefix}_${randomBytes(32).toString('base64url')}`;
export function createMcpAuthStore({ env = process.env, request = fetch } = {}) {
  return async input => {
    const url = env.GOOGLE_DRIVE_SCRIPT_URL, secret = env.GOOGLE_DRIVE_SHARED_SECRET;
    if (!url || !secret || secret.length < 32) throw Error('CONFIG');
    const parsed = new URL(url);
    if (parsed.origin !== 'https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash || parsed.username || parsed.password) throw Error('CONFIG');
    const body = JSON.stringify(input), timestamp = Date.now(), nonce = randomBytes(16).toString('hex');
    const signature = createHmac('sha256', secret).update(`mcp-auth\n${timestamp}\n${nonce}\n${digest(body)}`).digest('hex');
    const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mcp-auth', body, timestamp, nonce, signature }), signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw Error('UNAVAILABLE');
    const value = await response.json();
    if (!value.ok) throw Error(['INVALID_CLIENT', 'INVALID_GRANT', 'INVALID_TOKEN', 'BUSY', 'LIMIT', 'FORBIDDEN'].includes(value.code) ? value.code : 'UNAVAILABLE');
    return value.data;
  };
}
