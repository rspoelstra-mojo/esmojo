import { createHash, createHmac, randomBytes } from 'node:crypto';

// Dit verkeer bevat vertrouwelijke profielen. Geen logging of persistente cache.
export function createProfiles({ env = process.env, request = fetch } = {}) {
  return async function profiles(operation, actor, payload = {}) {
    const url = env.GOOGLE_DRIVE_SCRIPT_URL;
    const secret = env.GOOGLE_DRIVE_SHARED_SECRET;
    if (!url || !secret || secret.length < 32) throw new Error('DRIVE_CONFIG');
    const parsed = new URL(url);
    if (parsed.origin !== 'https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash) throw new Error('DRIVE_CONFIG');
    const body = JSON.stringify({ operation, actor, ...payload });
    const timestamp = Date.now();
    const nonce = randomBytes(16).toString('hex');
    const digest = createHash('sha256').update(body).digest('hex');
    const signature = createHmac('sha256', secret).update(`accounts\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
    const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accounts', timestamp, nonce, signature, body }), signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error('DRIVE_UNAVAILABLE');
    const result = await response.json();
    if (!result.ok) throw new Error(result.code === 'FORBIDDEN' ? 'FORBIDDEN' : result.code === 'CONFLICT' ? 'CONFLICT' : 'DRIVE_UNAVAILABLE');
    return result.data;
  };
}

export function validateProfile(input) {
  const output = {};
  for (const name of ['firstName', 'lastName', 'jobTitle']) {
    const value = input[name];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw new Error('VALIDATION');
    output[name] = value.trim();
  }
  if (!['beheerder', 'gebruiker'].includes(input.role)) throw new Error('VALIDATION');
  output.role = input.role;
  if (input.photo !== undefined) {
    if (input.photo !== '' && (typeof input.photo !== 'string' || input.photo.length > 100000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(input.photo))) throw new Error('VALIDATION');
    output.photo = input.photo;
  }
  return output;
}
