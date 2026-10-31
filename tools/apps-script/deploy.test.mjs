import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { deploy } from './deploy.mjs';

const config = JSON.parse(readFileSync(new URL('./deployment.json', import.meta.url), 'utf8'));
const env = { CLASPRC_JSON: JSON.stringify({ tokens: { default: { refresh_token: 'fake-test-only' } } }), GITHUB_SHA: 'abc123' };

test('ontbrekende credentials veroorzaken geen netwerkactie', async () => {
  await assert.rejects(deploy({ env: {}, execute: () => assert.fail() }), /ontbreekt/);
  await assert.rejects(deploy({ env: { CLASPRC_JSON: '{}' }, execute: () => assert.fail() }), /refresh token/);
});

test('bestaande URL en manifest blijven behouden; alleen scriptbron wordt bijgewerkt', async () => {
  const commands = [];
  let temporary;
  const manifest = JSON.stringify({ timeZone: 'Europe/Amsterdam', runtimeVersion: 'V8', webapp: { access: 'ANYONE_ANONYMOUS', executeAs: 'USER_DEPLOYING' } });
  const result = await deploy({ env, verify: false, execute: (args, source) => {
    temporary = dirname(source);
    const command = args[args.includes('--json') ? 5 : 4];
    commands.push(command);
    if (command === 'list-deployments') return JSON.stringify([{ deploymentId: config.deploymentId }]);
    if (command === 'pull') {
      writeFileSync(join(source, 'appsscript.json'), manifest);
      writeFileSync(join(source, 'Code.gs'), '// old');
      writeFileSync(join(source, 'Extra.gs'), '// preserve remote file');
    }
    if (command === 'push') {
      assert.equal(readFileSync(join(source, 'appsscript.json'), 'utf8'), manifest);
      assert.match(readFileSync(join(source, 'Code.gs'), 'utf8'), /function doPost/);
      assert.equal(readFileSync(join(source, 'Extra.gs'), 'utf8'), '// preserve remote file');
      assert.ok(!existsSync(join(source, 'credentials.json')));
    }
    if (command === 'create-version') return JSON.stringify({ versionNumber: 12 });
    if (command === 'update-deployment') {
      assert.equal(args[6], config.deploymentId);
      assert.ok(args.includes('12'));
      return JSON.stringify({ deploymentId: config.deploymentId, versionNumber: 12 });
    }
    return '';
  } });
  assert.equal(result.versionNumber, 12);
  assert.deepEqual(commands, ['list-deployments', 'pull', 'push', 'create-version', 'update-deployment']);
  assert.equal(existsSync(temporary), false);
});

test('onbekende deployment stopt vóór push en ruimt credentials op', async () => {
  let temporary;
  await assert.rejects(deploy({ env, verify: false, execute: (args, source) => {
    temporary = dirname(source);
    assert.equal(args[5], 'list-deployments');
    return '[]';
  } }), /niet gevonden/);
  assert.equal(existsSync(temporary), false);
});

test('clasp-foutinhoud wordt niet gelogd of herhaald', async () => {
  await assert.rejects(deploy({ env, verify: false, execute: () => { throw new Error('private-token'); } }), error => !error.message.includes('private-token') && /clasp/.test(error.message));
});
