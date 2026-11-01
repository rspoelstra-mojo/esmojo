import { test } from 'node:test';
import assert from 'node:assert/strict';
import { researchView, researchInline, researchBlocks, safeResearchUrl } from './research-view.js';
const research = number => ({ answer: `### Samenvatting\n\nAntwoord **${number}** met een [bron](https://example.org).\n\n### Volledige analyse\n\n- **Bevestigd:** bevinding ${number}.<sup>1, 2</sup>\n- Onbekend: beperking.\n\n### Bronnen\n\n1. [Bron](https://example.org) — geraadpleegd op peildatum.`, sources: [{ title: 'Bron', url: 'https://example.org' }] });
test('alle elf onderwerpen krijgen de echte samenvatting, analyse en bronnen afzonderlijk', () => {
  for (let number = 1; number <= 11; number++) {
    const view = researchView(research(number));
    assert.equal(view.summaryText, `Antwoord ${number} met een bron.`);
    assert.ok(view.analysis.startsWith('- **Bevestigd:**'));
    assert.ok(!view.analysis.includes('### Samenvatting'));
    assert.ok(!view.analysis.includes('### Bronnen'));
    assert.ok(view.sourcesMarkdown.includes('geraadpleegd op peildatum'));
    assert.equal(view.sources.length, 1);
  }
});
test('ook CRLF, meerdere samenvattingsalinea’s en analyses zonder sectiekoppen blijven leesbaar', () => {
  assert.equal(researchView({ answer: '## Samenvatting\r\n\r\nEerste.\r\n\r\nTweede.\r\n\r\n## Volledige analyse\r\n\r\nFeit.' }).summaryText, 'Eerste.\n\nTweede.');
  assert.equal(researchView({ answer: '# Titel\n\nEen bestaand antwoord.\n\nMeer analyse.' }).summaryText, 'Een bestaand antwoord.');
  assert.equal(researchView(null).summaryText, '');
  assert.equal(researchView({ answer: 'Alleen een antwoord.' }).analysis, 'Alleen een antwoord.');
});
test('inline-opmaak en bronverwijzingen worden beperkte tokens; HTML en onveilige links blijven tekst', () => {
  assert.deepEqual(researchInline('**Bevestigd:** feit<sup>1</sup>').map(t => t.type), ['strong', 'text', 'sup']);
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'http://example.org', 'https://user:pass@example.org']) assert.equal(safeResearchUrl(value), null);
  assert.ok(researchInline('<img src=x onerror=alert(1)>')[0].type === 'text');
  assert.ok(researchInline('[x](javascript:alert(1))')[0].type === 'text');
  assert.equal(researchView({ ...research(1), sources: [{ title: 'X', url: 'javascript:alert(1)' }] }).sources.length, 0);
  assert.equal(researchBlocks('- Eerste\n- Tweede')[0].items.length, 2);
});
