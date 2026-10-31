import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import vm from 'node:vm';
import { createProfiles } from './account-profiles.js';

const secret = 'test-only-secret-'.repeat(4);
const admin = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const profile = (id, role = 'beheerder') => ({ id, email: `${id}@example.invalid`, firstName: 'Test', lastName: 'User', jobTitle: 'Tester', role, activated: true, disabled: false });
function harness(profiles = [profile(admin), profile(user, 'gebruiker')]) {
  let state = JSON.stringify({ profiles, nonces: {} });
  let writes = 0, locked = false;
  const file = { getBlob: () => ({ getDataAsString: () => state }), setContent: value => { assert.ok(locked); state = value; writes++; } };
  const context = vm.createContext({ Date, JSON, Number, Object,
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    LockService: { getScriptLock: () => ({ tryLock: () => { locked = true; return true; }, releaseLock: () => { locked = false; } }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (algorithm, text) => [...createHash(algorithm).update(text).digest()], computeHmacSha256Signature: (message, key) => [...createHmac('sha256', key).update(message).digest()] },
    DriveApp: { getFolderById: () => ({ isTrashed: () => false, getFilesByName: () => { let used = false; return { hasNext: () => !used, next: () => { used = true; return file; } }; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  });
  vm.runInContext(readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL('../google-apps-script/Accounts.gs', import.meta.url), 'utf8'), context);
  return { send: input => context.doPost({ postData: { contents: JSON.stringify(input) } }), state: () => JSON.parse(state), writes: () => writes };
}
function signed(body, extra = {}) {
  const timestamp = Date.now(), nonce = Math.random().toString(16).slice(2).padEnd(32, '0');
  const serialized = JSON.stringify(body);
  const digest = createHash('sha256').update(serialized).digest('hex');
  return { action: 'accounts', body: serialized, timestamp, nonce, signature: createHmac('sha256', secret).update(`accounts\n${timestamp}\n${nonce}\n${digest}`).digest('hex'), ...extra };
}
test('Drive weigert gewijzigde payload, verlopen verzoeken en onjuiste HMAC', () => {
  const h = harness(); const request = signed({ operation: 'list', actor: admin });
  for (const changed of [{ ...request, body: JSON.stringify({ operation: 'list', actor: user }) }, { ...request, timestamp: Date.now() - 180000 }, { ...request, signature: '0'.repeat(64) }]) assert.equal(h.send(changed).ok, false);
  assert.equal(h.writes(), 0);
});
test('Drive controleert rollen onafhankelijk van de server en geeft geen fotos in de lijst', () => {
  const h = harness(); assert.equal(h.send(signed({ operation: 'list', actor: user })).ok, false);
  const result = h.send(signed({ operation: 'list', actor: admin })); assert.equal(result.ok, true); assert.equal(result.data.length, 2); assert.equal('photo' in result.data[0], false);
});
test('eigen beheerder en laatste beheerder kunnen niet worden verwijderd of gedegradeerd', () => {
  const h = harness();
  for (const operation of ['disable', 'delete', 'update']) assert.equal(h.send(signed({ operation, actor: admin, id: admin, profile: profile(admin, 'gebruiker') })).ok, false);
  assert.equal(h.writes(), 0);
});
test('herhaalde schrijfverzoeken worden niet nogmaals uitgevoerd', () => {
  const h = harness(); const request = signed({ operation: 'update', actor: admin, id: user, profile: { ...profile(user, 'gebruiker'), firstName: 'Nieuw' } });
  assert.equal(h.send(request).ok, true); assert.equal(h.send(request).ok, false); assert.equal(h.writes(), 1); assert.equal(h.state().profiles[1].firstName, 'Nieuw');
});
test('geblokkeerde en niet-geactiveerde accounts kunnen geen beheeracties uitvoeren', () => {
  for (const override of [{ disabled: true }, { activated: false }]) {
    const h = harness([{ ...profile(admin), ...override }]); assert.equal(h.send(signed({ operation: 'list', actor: admin })).ok, false);
  }
});
test('bootstrap weigert een bestaand register te overschrijven', () => {
  const h = harness(); assert.equal(h.send(signed({ operation: 'bootstrap', actor: user, profile: profile(user) })).ok, false); assert.equal(h.writes(), 0);
});
test('serveradapter ondertekent ook de payload en actor', async () => {
  const h = harness();
  const request = createProfiles({ env: { GOOGLE_DRIVE_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec', GOOGLE_DRIVE_SHARED_SECRET: secret }, request: async (_, options) => Response.json(h.send(JSON.parse(options.body))) });
  assert.equal((await request('self', admin)).id, admin); await assert.rejects(request('list', user));
});
