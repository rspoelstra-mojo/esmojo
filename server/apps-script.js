import { createHmac, randomBytes } from 'node:crypto';

// Alleen servercode. De beheerderscontrole vereist authenticatie; geen gegevenscache.
export async function checkAppsScriptConnection({ env = process.env, request = fetch, now = Date.now } = {}) {
  const url = env.GOOGLE_DRIVE_SCRIPT_URL;
  const secret = env.GOOGLE_DRIVE_SHARED_SECRET;
  if (!url || !secret || secret.length < 32) throw new Error('Apps Script is nog niet ingesteld.');
  const parsed = new URL(url);
  if (parsed.origin !== 'https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname)
      || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('Gebruik de Apps Script-webapp-URL die eindigt op /exec.');
  }
  const action = 'status';
  const timestamp = now();
  const nonce = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', secret).update(`${action}\n${timestamp}\n${nonce}`).digest('hex');
  const response = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, timestamp, nonce, signature }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Apps Script-verzoek mislukt (HTTP ${response.status}).`);
  let data;
  try { data = await response.json(); } catch { throw new Error('Apps Script gaf geen JSON terug. Controleer de deployment-toegang.'); }
  if (data.ok !== true || data.action !== 'status' || data.folderAccessible !== true) {
    throw new Error('Apps Script kon de toegang tot de ESMOJO-map niet bevestigen.');
  }
  return { ok: true, folderAccessible: true };
}
