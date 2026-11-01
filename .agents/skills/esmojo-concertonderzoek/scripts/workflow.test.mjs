import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { catalogue, loadPrompt, prepareQuestion, validateResult } from './workflow.mjs';

const context = { ok: true, selected: { concertId: 'Fixture_Gashouder_08112026', artist: 'Fixture', date: '2026-11-08', venue: 'Gashouder', city: 'Amsterdam' }, storage: { concertId: 'Fixture_Gashouder_06112026', date: '2026-11-06' }, seriesDates: ['2026-11-06', '2026-11-07', '2026-11-08'], completedQuestions: [] };
const sources = [{ title: 'Testbron één', url: 'https://example.org/een' }, { title: 'Testbron twee', url: 'https://example.org/twee' }];
const summary25 = Array.from({ length: 25 }, () => 'testwoord').join(' ');
function fixture(number = 1, { summary = number === 5 ? summary25 : 'Dit is alleen een lokale test.', withSources = false, analysis } = {}) {
  return { question: loadPrompt(number).question,
    answer: `### Samenvatting\n\n${summary}\n\n### Volledige analyse\n\n${analysis || (withSources ? '- Bevestigd: dit is uitsluitend een testclaim.<sup>1</sup>\n- Onbekend: tweede testclaim.<sup>2</sup>\n- Aanwijzing: hergebruik eerste testbron.<sup>1</sup>' : '- Onbekend: deze lokale fixture voert geen onderzoek uit.')}\n\n### Bronnen\n\n${withSources ? sources.map((source, i) => `${i + 1}. [${source.title}](${source.url}) — testuitgever; testdatum onbekend.`).join('\n') : 'Geen verifieerbare bronnen beschikbaar'}`,
    sources: withSources ? sources.map(source => ({ ...source })) : [], researchedAt: '2026-11-01T08:00:00Z' };
}

test('elf originele bestanden zijn integraal overgenomen, uniek genummerd en centraal bewerkbaar', () => {
  assert.equal(catalogue.prompts.length, 11);
  assert.deepEqual(catalogue.prompts.map(item => item.number), Array.from({ length: 11 }, (_, i) => i + 1));
  for (const entry of catalogue.prompts) {
    const loaded = loadPrompt(entry.number);
    assert.match(entry.file, /^\.\.\/\.\.\/\.\.\/onderzoeksprompts\/\d{2}_/);
    assert.equal(createHash('sha256').update(loaded.prompt).digest('hex'), entry.sha256);
    assert.equal(loaded.modifiedSinceImport, false); assert.ok(loaded.question.length < 6000);
    assert.match(loaded.prompt, /geen woordlimiet/); assert.match(loaded.prompt, /## Verplicht antwoordformaat/);
  }
});
test('een bewuste MD-wijziging wordt gelezen zonder kopie of handmatige hashupdate', () => {
  const before = loadPrompt(1), changed = before.prompt.replace('Man/vrouw-verhouding', 'Aangepaste testtitel');
  const loaded = loadPrompt(1, { read: () => changed });
  assert.equal(loaded.title, 'Aangepaste testtitel'); assert.equal(loaded.modifiedSinceImport, true); assert.notEqual(loaded.promptRevision, before.promptRevision);
});
test('context invullen is lokaal en houdt onderzoeksdatum en eerdere opslagdatum uit elkaar', () => {
  const filled = prepareQuestion(3, context, { LAND: 'Nederland' }, new Date('2026-10-31T23:30:00Z'));
  assert.equal(filled.selectedConcertId, context.selected.concertId); assert.equal(filled.storageConcertId, context.storage.concertId);
  assert.ok(filled.prompt.includes('2026-11-08')); assert.ok(filled.prompt.includes('2026-11-01')); assert.ok(filled.prompt.includes('Amsterdam / Nederland'));
  assert.equal(filled.prompt.includes('{{'), false); assert.ok(filled.prompt.includes('Niet aangeleverd; eerst verifiëren')); assert.equal(filled.prompt.includes('22:00'), false);
});
test('alle elf prompts kunnen zonder verzonnen aanvullende gegevens worden voorbereid', () => {
  for (let number = 1; number <= 11; number++) {
    const filled = prepareQuestion(number, context);
    assert.equal(filled.questionNumber, number); assert.equal(filled.prompt.includes('{{'), false); assert.equal(filled.promptRevision.length, 64);
  }
});
test('ongeldige context, onbekende nummers of overschrijven van concertidentiteit wordt geweigerd', () => {
  assert.throws(() => loadPrompt(12), /PROMPT_NUMBER/);
  assert.throws(() => prepareQuestion(1, {}), /CONTEXT/);
  assert.throws(() => prepareQuestion(1, context, { ARTIEST: 'anders' }), /CONTEXT/);
});
test('alle elf fixtures passen zonder website- of schemaverandering in de bestaande JSON-brug', () => {
  for (let number = 1; number <= 11; number++) assert.equal(validateResult(number, fixture(number)).valid, true);
});
test('samenvatting maximaal 50 woorden; vraag 5 exact 25, niet 24 of 26', () => {
  assert.equal(validateResult(5, fixture(5)).summaryWords, 25);
  for (const count of [24, 26]) assert.throws(() => validateResult(5, fixture(5, { summary: Array.from({ length: count }, () => 'woord').join(' ') })), /SUMMARY/);
  assert.throws(() => validateResult(1, fixture(1, { summary: Array.from({ length: 51 }, () => 'woord').join(' ') })), /SUMMARY/);
  assert.throws(() => validateResult(1, fixture(1, { summary: 'Eerste alinea.\n\nTweede alinea.' })), /SUMMARY/);
});
test('drie secties, vaste volgorde, echte vraagtekst en puntsgewijze analyse zijn verplicht', () => {
  assert.throws(() => validateResult(1, { ...fixture(), question: 'verkeerde vraag' }), /QUESTION/);
  const good = fixture();
  assert.throws(() => validateResult(1, { ...good, answer: good.answer.replace('### Volledige analyse', '### Bronnen') }), /SECTIONS/);
  assert.throws(() => validateResult(1, fixture(1, { analysis: 'Geen opsomming.' })), /ANALYSIS/);
});
test('superscripts en bronregels verwijzen in dezelfde volgorde naar dezelfde JSON-bronnen', () => {
  assert.equal(validateResult(1, fixture(1, { withSources: true })).sources, 2);
  const good = fixture(1, { withSources: true });
  assert.throws(() => validateResult(1, { ...good, answer: good.answer.replace('<sup>1</sup>', '<sup>2</sup>') }), /CITATIONS/);
  assert.throws(() => validateResult(1, { ...good, answer: good.answer.replace('https://example.org/een', 'https://example.org/verkeerd') }), /SOURCES/);
  assert.throws(() => validateResult(1, { ...good, answer: good.answer.replace('<sup>2</sup>', '<sup>0</sup>') }), /CITATIONS/);
});
test('nul bronnen vereist expliciete onzekerheid en geen fictieve verwijzingen', () => {
  const good = fixture(); assert.equal(validateResult(1, good).sources, 0);
  assert.throws(() => validateResult(1, { ...good, answer: good.answer.replace('Geen verifieerbare bronnen beschikbaar', 'Bronnen niet nodig') }), /SOURCES/);
  assert.throws(() => validateResult(1, fixture(1, { analysis: '- Geen bron.<sup>1</sup>' })), /CITATIONS/);
});
test('te grote analyse wordt niet afgekapt of stilzwijgend aangepast', () => {
  const tooLong = fixture(1, { analysis: '- Onbekend: ' + 'x'.repeat(31000) }), before = tooLong.answer;
  assert.throws(() => validateResult(1, tooLong), /TRANSPORT_LIMIT/); assert.equal(tooLong.answer, before);
});
