import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callResearch, saveResearch } from './client.mjs';
const env = { ESMOJO_RESEARCH_TOKEN: 'sidecar-placeholder-not-a-raw-secret', HTTPS_PROXY: 'http://proxy:8080' };
const result = { question: 'Test', answer: 'Geen echt onderzoek', sources: [], researchedAt: '2026-11-01T12:00:00Z' };
const response = body => JSON.stringify({ ok: true, ...body }) + '\n200';
test('proxy-placeholder werkt; curl behoudt proxy, gebruikt alleen vaste HTTPS-host en sleutel staat alleen op stdin', () => {
  const data = callResearch({ operation: 'resolve', artist: 'A $(nooit-uitvoeren)', venue: 'Gashouder' }, { env, execute: (cmd, args, options) => {
    assert.equal(cmd, 'curl'); assert.equal(args.includes(env.ESMOJO_RESEARCH_TOKEN), false); assert.equal(args.at(-1), 'https://esmojo.nl/api/research');
    assert.equal(args.includes('--location'), false); assert.equal(args.includes('--insecure'), false); assert.equal(args[0], '-q'); assert.equal(options.env, env);
    assert.ok(options.input.includes('Authorization: Bearer ' + env.ESMOJO_RESEARCH_TOKEN)); assert.ok(options.input.includes('$(nooit-uitvoeren)')); assert.equal(options.shell, undefined);
    return response({ completedQuestions: [] });
  } });
  assert.deepEqual(data.completedQuestions, []);
});
test('sleutel ontbreekt: geen netwerk; ongeldige JSON krijgt geen toegang tot curl', () => {
  const execute = () => { throw new Error('mag niet worden aangeroepen'); };
  assert.throws(() => callResearch({ operation: 'context', concertId: 'known' }, { env: {}, execute }), /CONFIG/);
  assert.throws(() => callResearch({ operation: 'delete', concertId: 'known' }, { env, execute }), /VALIDATION/);
});
test('opslaan moet teruggelezen en inhoudelijk bevestigd worden; afwijking is geen succes', () => {
  let calls = 0;
  const execute = () => ++calls === 1 ? response({ concertId: 'canonical', filename: 'onderzoek_01.json', created: true }) : response({ document: { managedBy: 'ESMOJO/Research-v1', classification: 'openbaar', status: 'concept', concertId: 'canonical', questionNumber: 1, ...result } });
  assert.deepEqual(saveResearch('later-show', 1, result, { env, execute }), { verified: true, concertId: 'canonical', filename: 'onderzoek_01.json', created: true }); assert.equal(calls, 2);
  calls = 0;
  const mismatch = () => ++calls === 1 ? response({ concertId: 'canonical', filename: 'onderzoek_01.json', created: true }) : response({ document: { answer: 'afwijkend' } });
  assert.throws(() => saveResearch('later-show', 1, result, { env, execute: mismatch }), /VERIFY/);
});
test('HTTP-fouten en curl-fouten tonen nooit ruwe secrets of providerinhoud', () => {
  const execute = () => { const error = new Error(env.ESMOJO_RESEARCH_TOKEN); error.stdout = JSON.stringify({ code: 'FORBIDDEN', secret: env.ESMOJO_RESEARCH_TOKEN }) + '\n403'; throw error; };
  assert.throws(() => callResearch({ operation: 'context', concertId: 'known' }, { env, execute }), error => /FORBIDDEN/.test(error.message) && !error.message.includes(env.ESMOJO_RESEARCH_TOKEN));
  assert.throws(() => callResearch({ operation: 'context', concertId: 'known' }, { env, execute: () => { throw Error(env.ESMOJO_RESEARCH_TOKEN); } }), error => /UNAVAILABLE/.test(error.message) && !error.message.includes(env.ESMOJO_RESEARCH_TOKEN));
});
