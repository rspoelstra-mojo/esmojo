import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyImportIdentity } from './github-identity.js';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const now = Date.now();
const claims = { iss: 'https://token.actions.githubusercontent.com', aud: 'https://esmojo.nl/api/shows-sync', sub: 'repo:rspoelstra-mojo/esmojo:ref:refs/heads/main', repository: 'rspoelstra-mojo/esmojo', ref: 'refs/heads/main', workflow_ref: 'rspoelstra-mojo/esmojo/.github/workflows/mojo-shows.yml@refs/heads/main', event_name: 'workflow_dispatch', nbf: Math.floor(now / 1000) - 10, iat: Math.floor(now / 1000) - 10, exp: Math.floor(now / 1000) + 300, run_id: '123' };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(overrides = {}, header = {}) {
  const body = `${encode({ alg: 'RS256', kid: 'test-key', ...header })}.${encode({ ...claims, ...overrides })}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`;
}
const request = async url => { assert.equal(url, 'https://token.actions.githubusercontent.com/.well-known/jwks'); return Response.json({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig' }] }); };
test('alleen geldig GitHub-token voor vaste workflow, repository, main en audience wordt geaccepteerd', async () => {
  assert.deepEqual(await verifyImportIdentity(token(), { request, now }), { runId: '123' });
  for (const change of [{ iss: 'https://evil.invalid' }, { aud: 'other' }, { sub: 'repo:other:ref:refs/heads/main' }, { ref: 'refs/heads/task' }, { repository: 'other/repo' }, { workflow_ref: 'other.yml' }, { event_name: 'pull_request' }, { exp: 0 }, { nbf: now / 1000 + 120 }, { iat: 0 }]) await assert.rejects(verifyImportIdentity(token(change), { request, now }), /FORBIDDEN/);
});
test('ontbrekende, vervalste of alg-none tokens en onbekende sleutels krijgen geen toegang', async () => {
  for (const value of [undefined, 'invalid', token().slice(0, -10), token({}, { alg: 'none' }), token({}, { kid: 'untrusted' })]) await assert.rejects(verifyImportIdentity(value, { request, now }), /FORBIDDEN/);
});
