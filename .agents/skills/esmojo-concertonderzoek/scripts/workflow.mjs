import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateResearchRequest } from '../../../../server/research-validation.js';

const root = new URL('../', import.meta.url);
export const catalogue = JSON.parse(readFileSync(new URL('references/catalogue.json', root), 'utf8'));
const fail = message => { throw new Error(message); };
const dateNL = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

export function loadPrompt(number, { read = path => readFileSync(path, 'utf8') } = {}) {
  const entry = catalogue.prompts.find(item => item.number === number);
  if (!entry) fail('PROMPT_NUMBER: gebruik een vraagnummer van 1 t/m 11.');
  const prompt = read(new URL(entry.file, root));
  const promptRevision = createHash('sha256').update(prompt).digest('hex');
  const question = /## Onderzoeksvraag\s*\n([\s\S]*?)\n## Onderzoekslijnen/.exec(prompt)?.[1]?.trim().replace(/\*\*/g, '').replace(/\s+/g, ' ');
  if (!question) fail('PROMPT_FORMAT: onderzoeksvraag ontbreekt.');
  return { ...entry, title: prompt.split('\n')[0].replace(/^# ESMOJO-onderzoeksprompt — /, ''), prompt, question, promptRevision, modifiedSinceImport: promptRevision !== entry.sha256 };
}

export function prepareQuestion(number, context, supplied = {}, now = new Date()) {
  const original = loadPrompt(number), selected = context?.selected, storage = context?.storage;
  if (!context?.ok || !selected?.concertId || !storage?.concertId || !selected.artist || !selected.date || !selected.venue || !selected.city) fail('CONTEXT: gebruik een echte resolve/context-response van de brug.');
  const optional = ['LAND', 'MOJO_URL', 'DEUREN_OPEN', 'SUPPORT_START', 'SHOW_START', 'TICKET_TYPE_OPSTELLING', 'SHOW_END_CURFEW', 'TICKETMASTER_URL', 'TICKETSWAP_URL'];
  if (!supplied || Array.isArray(supplied) || typeof supplied !== 'object' || Object.keys(supplied).some(key => !optional.includes(key))) fail('CONTEXT: alleen geverifieerde aanvullende waarden zijn toegestaan.');
  for (const value of Object.values(supplied)) if (typeof value !== 'string' || !value.trim() || /[\r\n\x00]/.test(value) || value.includes('{{')) fail('CONTEXT: ongeldige aanvullende waarde.');
  const values = { ARTIEST: selected.artist, CONCERTDATUM: selected.date, VENUE: selected.venue,
    STAD_LAND: `${selected.city} / ${supplied.LAND || 'land nog te verifiëren'}`, PEILDATUM: dateNL(now), ...supplied };
  const render = value => value.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => values[key] || 'Niet aangeleverd; eerst verifiëren indien beschikbaar');
  return { questionNumber: number, title: original.title, selectedConcertId: selected.concertId, storageConcertId: storage.concertId,
    promptVersion: catalogue.promptVersion, promptRevision: original.promptRevision, modifiedSinceImport: original.modifiedSinceImport, question: render(original.question), prompt: render(original.prompt) };
}

export function wordCount(text) {
  return text.trim().split(/\s+/u).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
}
export function validateResult(number, result, concertId = 'validation-only-not-an-upload') {
  const original = loadPrompt(number);
  if (result?.question !== original.question) fail('QUESTION: gebruik de onderzoeksvraag uit het originele promptbestand.');
  if (typeof result.answer !== 'string' || !Array.isArray(result.sources)) fail('FORMAT: antwoord of bronnen ontbreken.');
  const headers = [...result.answer.matchAll(/^#{1,6}\s+(.+)$/gm)];
  if (headers.length !== 3 || headers.map(item => item[0]).join('|') !== '### Samenvatting|### Volledige analyse|### Bronnen' || result.answer.slice(0, headers[0].index).trim()) fail('SECTIONS: precies Samenvatting, Volledige analyse en Bronnen zijn verplicht.');
  const section = index => result.answer.slice(headers[index].index + headers[index][0].length, headers[index + 1]?.index ?? result.answer.length).trim();
  const summary = section(0), analysis = section(1), sourceText = section(2), count = wordCount(summary);
  if (!count || count > 50 || (number === 5 && count !== 25) || /\n\s*\n/.test(summary) || /^\s*[-*]\s/m.test(summary)) fail('SUMMARY: één alinea, maximaal 50 woorden; vraag 5 precies 25.');
  if (!/^\s*[-*]\s+\S/m.test(analysis)) fail('ANALYSIS: puntsgewijze onderbouwing ontbreekt.');
  const seen = new Set(), urls = new Set();
  for (const cite of analysis.matchAll(/<sup>(.*?)<\/sup>/g)) {
    if (!/^\d+(?:,\s*\d+)*$/.test(cite[1])) fail('CITATIONS: ongeldige superscriptverwijzing.');
    for (const value of cite[1].split(',')) {
      const n = Number(value.trim());
      if (n < 1 || n > result.sources.length || (!seen.has(n) && n !== seen.size + 1)) fail('CITATIONS: nummer bronnen op eerste gebruik en verwijs uitsluitend naar bestaande bronnen.');
      seen.add(n);
    }
  }
  if (seen.size !== result.sources.length) fail('CITATIONS: ongebruikte bronnen of ontbrekende superscripts.');
  if (!result.sources.length) {
    if (!/^Geen verifieerbare bronnen beschikbaar\.?$/.test(sourceText)) fail('SOURCES: benoem expliciet dat er geen verifieerbare bronnen zijn.');
  } else {
    const lines = sourceText.split(/\n/).filter(line => line.trim());
    if (lines.length !== result.sources.length) fail('SOURCES: één genummerde bronregel per JSON-bron.');
    result.sources.forEach((source, index) => {
      const match = /^(\d+)\. \[(.+)\]\((https:\/\/\S+)\)(?:\s+[—–-]\s+.*)?$/.exec(lines[index]);
      if (!match || Number(match[1]) !== index + 1 || match[2].replace(/\\([\[\]])/g, '$1') !== source.title || match[3] !== source.url || urls.has(source.url)) fail('SOURCES: Markdown-links, titels, volgorde of dubbele bron wijken af van sources.');
      urls.add(source.url);
    });
  }
  const request = { operation: 'write', concertId, questionNumber: number, result };
  if (Buffer.byteLength(JSON.stringify(request)) > 40000 || result.answer.length > 30000 || result.sources.length > 40) fail('TRANSPORT_LIMIT: niets afkappen; volledig antwoord lokaal bewaren en eerst uitbreiding van de brug bespreken.');
  validateResearchRequest(request);
  return { valid: true, questionNumber: number, summaryWords: count, sources: result.sources.length, bytes: Buffer.byteLength(JSON.stringify(request)) };
}

export function main(args = process.argv.slice(2)) {
  const [command, n, path, extraPath] = args;
  if (command === 'catalogue' && args.length === 1) {
    console.log(JSON.stringify(catalogue.prompts.map(entry => { const { number, title } = loadPrompt(entry.number); return { number, title, filename: `onderzoek_${String(number).padStart(2, '0')}.json` }; }), null, 2)); return;
  }
  if (command === 'prompt' && [3, 4].includes(args.length)) {
    const context = JSON.parse(readFileSync(path, 'utf8')), extra = extraPath ? JSON.parse(readFileSync(extraPath, 'utf8')) : {};
    console.log(JSON.stringify(prepareQuestion(Number(n), context, extra), null, 2)); return;
  }
  if (command === 'validate' && args.length === 3) {
    console.log(JSON.stringify(validateResult(Number(n), JSON.parse(readFileSync(path, 'utf8'))), null, 2)); return;
  }
  fail('Gebruik: catalogue | prompt 1 /tmp/context.json [/tmp/geverifieerde-invoer.json] | validate 1 /tmp/antwoord.json');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.code === 'VALIDATION' ? 'VALIDATION: resultaat past niet in het bestaande brugformaat.' : error.message); process.exitCode = 1; }
}
