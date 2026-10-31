import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { checkAppsScriptConnection } from './apps-script.js';

const secret = 'test-only-'.repeat(5);
const env = { GOOGLE_DRIVE_SCRIPT_URL: 'https://script.google.com/macros/s/test-deployment/exec', GOOGLE_DRIVE_SHARED_SECRET: secret };
function script() {
  let reads = 0;
  const context = vm.createContext({ console, PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, computeHmacSha256Signature: (message, key) => [...createHmac('sha256', key).update(message).digest()] },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    DriveApp: { getFolderById: id => { reads++; assert.equal(id, '1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk'); return { isTrashed: () => false, getId: () => id }; } },
  });
  vm.runInContext(readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
  return { context, reads: () => reads };
}

test('serverondertekening wordt door Apps Script geaccepteerd', async () => {
  const { context, reads } = script();
  const result = await checkAppsScriptConnection({ env, request: async (_, options) => {
    assert.ok(!options.body.includes(secret));
    return Response.json(context.doPost({ postData: { contents: options.body } }));
  } });
  assert.equal(result.folderAccessible, true);
  assert.equal(reads(), 1);
});

test('gewijzigde of verlopen verzoeken krijgen geen Drive-toegang', async () => {
  const { context, reads } = script();
  await checkAppsScriptConnection({ env, request: async (_, options) => {
    const input = JSON.parse(options.body);
    for (const changed of [{ ...input, signature: '0'.repeat(64) }, { ...input, action: 'write' }, { ...input, timestamp: input.timestamp - 180000 }]) {
      assert.equal(context.doPost({ postData: { contents: JSON.stringify(changed) } }).ok, false);
    }
    assert.equal(context.doGet().ok, false);
    return Response.json({ ok: true, action: 'status', folderAccessible: true });
  } });
  assert.equal(reads(), 0);
});

test('configuratie en API-fouten worden afgehandeld', async () => {
  await assert.rejects(checkAppsScriptConnection({ env: {} }), /niet ingesteld/);
  await assert.rejects(checkAppsScriptConnection({ env: { ...env, GOOGLE_DRIVE_SCRIPT_URL: 'https://evil.example/exec' } }), /webapp-URL/);
  await assert.rejects(checkAppsScriptConnection({ env, request: async () => new Response('private', { status: 403 }) }), /HTTP 403/);
  await assert.rejects(checkAppsScriptConnection({ env, request: async () => new Response('<html>Login</html>') }), /geen JSON/);
});

test('verschillende Google-antwoorden leveren veilige diagnosecodes op', async () => {
  for (const [payload, code] of [
    [{ok:false,error:'Geen toegang.'}, 'SIGNATURE'],
    [{ok:false,error:'Drive-controle mislukt.'}, 'SCRIPT'],
    [null, 'RESPONSE'],
    [{error:'private information'}, 'RESPONSE'],
  ]) {
    await assert.rejects(checkAppsScriptConnection({env,request:async()=>Response.json(payload)}), error => error.code === code && !error.message.includes('private information'));
  }
});
