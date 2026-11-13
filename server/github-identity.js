import { createPublicKey, verify } from 'node:crypto';

// Alleen vaste workflows op main in onze eigen repository mogen beveiligde achtergrondtaken starten.
export async function verifyImportIdentity(token, { request = fetch, now = Date.now(), audience = 'https://esmojo.nl/api/shows-sync', workflow = 'mojo-shows.yml' } = {}) {
  if (typeof token !== 'string' || token.length > 20000) throw new Error('FORBIDDEN');
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error();
    const header = JSON.parse(Buffer.from(parts[0], 'base64url'));
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url'));
    if (header.alg !== 'RS256' || typeof header.kid !== 'string'
        || claims.iss !== 'https://token.actions.githubusercontent.com'
        || claims.aud !== audience
        || claims.sub !== 'repo:rspoelstra-mojo@350283629/esmojo@1439724175:ref:refs/heads/main'
        || claims.repository_id !== '1439724175' || claims.repository_owner_id !== '350283629'
        || claims.repository !== 'rspoelstra-mojo/esmojo' || claims.ref !== 'refs/heads/main'
        || !['shows-runtime.yml','shows-validation.yml','background-tasks.yml','mojo-shows.yml','ontrack-reports.yml','web-reports.yml','show-storage.yml','email-deliverability.yml','mfa-security-check.yml','artist-biographies.yml'].includes(workflow) || claims.workflow_ref !== `rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`
        || !(['schedule', 'workflow_dispatch'].includes(claims.event_name)||((workflow==='artist-biographies.yml'&&audience==='https://esmojo.nl/api/artist-biographies-sync')||(workflow==='web-reports.yml'&&audience==='https://esmojo.nl/api/incident-references-sync'))&&['push','workflow_run'].includes(claims.event_name))
        || !Number.isFinite(claims.exp) || !Number.isFinite(claims.nbf) || !Number.isFinite(claims.iat)
        || claims.exp * 1000 <= now || claims.nbf * 1000 > now + 30000 || claims.iat * 1000 < now - 600000) throw new Error();
    const response = await request('https://token.actions.githubusercontent.com/.well-known/jwks', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error();
    const { keys } = await response.json();
    const key = keys.find(item => item.kid === header.kid && item.kty === 'RSA' && item.use === 'sig');
    if (!key || !verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) throw new Error();
    return { runId: String(claims.run_id) };
  } catch { throw new Error('FORBIDDEN'); }
}
