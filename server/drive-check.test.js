import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDriveCheck } from './drive-check.js';
const env = { GOOGLE_DRIVE_SHARED_SECRET: 'test-only-'.repeat(5), GOOGLE_DRIVE_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec' };
const res = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } });
const req = secret => ({ method: 'POST', headers: { origin: 'https://esmojo.nl' }, body: { secret } });

test('formulier bevat geen geheim en GET doet geen Drive-verzoek', async () => {
  const output = res();
  await createDriveCheck({ env, check: () => assert.fail() })({ method: 'GET' }, output);
  assert.equal(output.statusCode, 200);
  assert.ok(!output.body.includes(env.GOOGLE_DRIVE_SHARED_SECRET));
  assert.equal(output.headers['Cache-Control'], 'no-store, private');
  assert.equal(output.headers['Referrer-Policy'], 'same-origin');
});
test('verkeerd geheim of herkomst bereikt Google niet', async () => {
  const handler = createDriveCheck({ env, check: () => assert.fail() });
  for (const input of [req('wrong'), ...['https://evil.example', 'null', undefined].map(origin => ({ ...req(env.GOOGLE_DRIVE_SHARED_SECRET), headers: { origin } }))]) {
    const output = res(); await handler(input, output); assert.equal(output.statusCode, 403);
  }
});
test('geautoriseerde controle toont alleen resultaat en tijd', async () => {
  const output = res();
  await createDriveCheck({ env, check: async () => ({ ok: true, folderAccessible: true }) })(req(env.GOOGLE_DRIVE_SHARED_SECRET), output);
  assert.equal(output.statusCode, 200);
  assert.match(output.body, /Verbinding geslaagd/);
  assert.ok(!output.body.includes(env.GOOGLE_DRIVE_SHARED_SECRET));
});
test('foutdetails worden niet doorgegeven', async () => {
  const output = res();
  await createDriveCheck({ env, check: async () => { throw new Error('private'); } })(req(env.GOOGLE_DRIVE_SHARED_SECRET), output);
  assert.equal(output.statusCode, 502);
  assert.ok(!output.body.includes('private'));
});
