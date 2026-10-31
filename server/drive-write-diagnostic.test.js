import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function run(failure) {
  const calls = [], logs = [];
  const context = vm.createContext({
    ESMOJO_FOLDER_ID: 'test-folder',
    console: { log: text => logs.push(text) },
    Utilities: { newBlob: (content, mimeType, name) => ({ content, mimeType, name }) },
    DriveApp: { getFolderById: id => {
      calls.push(['folder', id]);
      return { isTrashed: () => false, createFile: blob => {
        calls.push(['create', blob]); if (failure) throw new Error(failure);
        return { setTrashed: value => calls.push(['trash', value]) };
      } };
    } },
  });
  vm.runInContext(readFileSync(new URL('../google-apps-script/Setup.gs', import.meta.url), 'utf8'), context);
  return { execute: () => context.diagnoseAccountStorage(), calls, logs };
}
test('schrijftest maakt alleen een leeg JSON-bestand en ruimt alleen dat bestand op', () => {
  const h = run(); h.execute();
  assert.equal(h.calls[1][1].content, '{}'); assert.equal(h.calls[1][1].mimeType, 'application/json');
  assert.deepEqual(h.calls[2], ['trash', true]); assert.match(h.logs[0], /geslaagd/);
});
test('schrijftest behoudt relevante Google-fout maar wist accountnamen, links en IDs', () => {
  const h = run('DriveApp.Folder.createFile: storage quota exceeded for private@example.invalid https://google.invalid/token=private abcdefghijklmnopqrstuvwxyz123456');
  assert.throws(h.execute, error => /storage quota exceeded/.test(error.message) && /leeg testbestand maken/.test(error.message)
    && !error.message.includes('private') && !error.message.includes('abcdefghijklmnopqrstuvwxyz'));
  assert.equal(h.calls.some(call => call[0] === 'trash'), false);
});
