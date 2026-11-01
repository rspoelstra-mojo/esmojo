import { test } from 'node:test';
import assert from 'node:assert/strict';
import { singleSubmission } from '../src/lib/single-submission.js';

test('snelle dubbele aanmelding verstuurt maar één verzoek tot de reactie er is', async () => {
  let resolve, calls = 0;
  const response = new Promise(done => { resolve = done; });
  const submit = singleSubmission(async () => { calls++; await response; });
  const first = submit(); await Promise.all([submit(), submit(), submit()]);
  assert.equal(calls, 1); resolve(); await first;
  await submit(); assert.equal(calls, 2);
});
test('verkeerde authenticatorcode kan na een voltooide fout opnieuw worden verzonden', async () => {
  let calls = 0;
  const submit = singleSubmission(async () => { calls++; if (calls === 1) throw new Error('invalid_code'); return 'verified'; });
  await assert.rejects(submit(), /invalid_code/); assert.equal(await submit(), 'verified'); assert.equal(calls, 2);
});
test('autofill op een vervangen formulier wordt genegeerd', async () => {
  let current = true, calls = 0;
  const submit = singleSubmission(async () => { calls++; }, () => current);
  await submit(); current = false; await submit(); assert.equal(calls, 1);
});
