import { createHash, createHmac, randomBytes } from 'node:crypto';
import { ResearchError } from './research-validation.js';

export function createResearchStore({ env = process.env, request = fetch } = {}) {
  return async function research(input) {
    const url = env.GOOGLE_DRIVE_SCRIPT_URL, secret = env.GOOGLE_DRIVE_SHARED_SECRET;
    if (!url || !secret || secret.length < 32) throw new ResearchError('CONFIG');
    const parsed = new URL(url);
    if (parsed.origin !== 'https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash || parsed.username || parsed.password) throw new ResearchError('CONFIG');
    const body = JSON.stringify(input), timestamp = Date.now(), nonce = randomBytes(16).toString('hex');
    const digest = createHash('sha256').update(body).digest('hex');
    const signature = createHmac('sha256', secret).update(`research\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
    const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'research', body, timestamp, nonce, signature }), signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new ResearchError('UNAVAILABLE');
    const result = await response.json();
    if (!result.ok) throw new ResearchError(['NOT_FOUND', 'CONFLICT', 'BUSY', 'VALIDATION'].includes(result.code) ? result.code : 'UNAVAILABLE');
    return result.data;
  };
}
