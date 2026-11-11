import { test } from 'node:test';
import assert from 'node:assert/strict';
import { researchView, researchInline, researchBlocks, researchSourceMarkdown, safeResearchUrl } from './research-view.js';
const research = number => ({ answer: `### Samenvatting\n\nAntwoord **${number}** met een [bron](https://example.org).\n\n### Volledige analyse\n\n- **Bevestigd:** bevinding ${number}.<sup>1, 2</sup>\n- Onbekend: beperking.\n\n### Bronnen\n\n1. [Bron](https://example.org) — geraadpleegd op peildatum.`, sources: [{ title: 'Bron', url: 'https://example.org' }] });
test('Genummerde bronnen staan afzonderlijk met behoud van link, datum en toelichting',()=>{
 const a='[1] [Eerste](https://example.org/1) — geraadpleegd op datum.',b='[2] [Tweede](https://example.org/2) — datum onbekend.';
 for(const separator of ['\n','\r\n',' ','\n\n']){
  const blocks=researchBlocks(researchSourceMarkdown(a+separator+b));assert.equal(blocks.length,2);assert.equal(blocks[0].text,a);assert.equal(blocks[1].text,b);
 }
 const citation='[1] [Eerste](https://example.org/1) — zie ook [2] voor uitleg.';assert.equal(researchSourceMarkdown(citation),citation);
 const ordered='1. [Eerste](https://example.org/1)\n2. [Tweede](https://example.org/2)';assert.equal(researchSourceMarkdown(ordered),ordered);
});
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
test('Alle elf imports splitsen losse, vetgemaakte en gemengde kopregels',()=>{
 for(let n=1;n<=11;n++)for(const headings of [['Samenvatting','Volledige analyse','Bronnen'],['**Samenvatting**','**Volledige analyse**','**Bronnen**'],['Samenvatting:','## Volledige analyse','__Bronnen:__']]){
  const view=researchView({answer:`${headings[0]}\r\n\r\nBeperking ${n}.\r\n\r\n${headings[1]}\r\n\r\n- Bevinding ${n}.<sup>1</sup>\r\n\r\n${headings[2]}\r\n\r\n[1] [Bron](https://example.org)`});
  assert.equal(view.summaryText,`Beperking ${n}.`);assert.equal(view.analysis,`- Bevinding ${n}.<sup>1</sup>`);assert.equal(view.sourcesMarkdown,'[1] [Bron](https://example.org)');
 }
});
test('Subkoppen blijven bij de analyse; sectienamen binnen zinnen of code zijn geen scheiding',()=>{
 const view=researchView({answer:'Samenvatting\n\nEen korte tekst.\n\nVolledige analyse\n\n### Onderdeel\n\nBronnen zijn beperkt.\n\n```text\nBronnen\n```\n\nBronnen\n\nEen echte bron.'});
 assert.ok(view.analysis.includes('### Onderdeel'));assert.ok(view.analysis.includes('Bronnen zijn beperkt.'));assert.ok(view.analysis.includes('```text\nBronnen\n```'));assert.equal(view.sourcesMarkdown,'Een echte bron.');
});
