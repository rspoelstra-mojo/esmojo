import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateResearchRequest } from '../../server/research-validation.js';

const endpoint = 'https://esmojo.nl/api/research';
const allowedErrors = ['CONFIG', 'FORBIDDEN', 'VALIDATION', 'NOT_FOUND', 'CONFLICT', 'AMBIGUOUS', 'BUSY', 'UNAVAILABLE'];
export function callResearch(input, { env = process.env, execute = execFileSync } = {}) {
  const request = validateResearchRequest(input), token = env.ESMOJO_RESEARCH_TOKEN;
  // Een proxy-placeholder is geldig: nooit lokaal hashen of als ruwe sleutel beoordelen.
  if (typeof token !== 'string' || !token || token.length > 2048 || /[\r\n\x00]/.test(token)) throw new Error('CONFIG: ESMOJO_RESEARCH_TOKEN ontbreekt of is ongeldig.');
  const config = `header = ${JSON.stringify(`Authorization: Bearer ${token}`)}\nheader = "Content-Type: application/json"\nrequest = "POST"\ndata-binary = ${JSON.stringify(JSON.stringify(request))}\n`;
  const args = ['-q', '--config', '-', '--silent', '--show-error', '--fail-with-body', '--proto', '=https', '--tlsv1.2', '--max-time', '55', '--max-redirs', '0', '--write-out', '\n%{http_code}', '--url', endpoint];
  let output;
  try {
    // Sleutel en JSON gaan via stdin, niet via shell, argumenten, logs of een tijdelijk bestand.
    output = execute('curl', args, { input: config, encoding: 'utf8', timeout: 60000, maxBuffer: 256000, stdio: ['pipe', 'pipe', 'pipe'], env });
  } catch (error) {
    // Nooit ruwe curl-fouten tonen: een foutobject bevat ook procesargumenten/output.
    if (typeof error.stdout !== 'string') throw new Error('UNAVAILABLE: onderzoeksbrug niet bereikbaar.');
    output = error.stdout;
  }
  const split = output.lastIndexOf('\n'), status = Number(output.slice(split + 1));
  let data; try { data = JSON.parse(output.slice(0, split)); } catch { throw new Error('UNAVAILABLE: geen geldig antwoord van de onderzoeksbrug.'); }
  if (status !== 200 || data.ok !== true) {
    const code = allowedErrors.includes(data.code) ? data.code : 'UNAVAILABLE';
    throw new Error(`${code}: verzoek niet voltooid${code === 'AMBIGUOUS' ? '; vraag de gebruiker welke artiest bedoeld wordt' : ''}.`);
  }
  return data;
}

export function saveResearch(concertId, questionNumber, result, options = {}) {
  const input = validateResearchRequest({ operation: 'write', concertId, questionNumber, result });
  const saved = callResearch(input, options);
  if (typeof saved.concertId !== 'string' || saved.filename !== `onderzoek_${String(questionNumber).padStart(2, '0')}.json` || typeof saved.created !== 'boolean') throw new Error('VERIFY: onvolledige opslagbevestiging.');
  const read = callResearch({ operation: 'read', concertId: saved.concertId, questionNumber }, options);
  const document = read.document;
  if (!document || document.managedBy !== 'ESMOJO/Research-v1' || document.classification !== 'openbaar' || document.status !== 'concept'
      || document.concertId !== saved.concertId || document.questionNumber !== questionNumber
      || JSON.stringify({ question: document.question, answer: document.answer, sources: document.sources, researchedAt: document.researchedAt }) !== JSON.stringify(input.result)) throw new Error('VERIFY: teruggelezen onderzoek wijkt af.');
  return { verified: true, concertId: saved.concertId, filename: saved.filename, created: saved.created };
}

export function main(args = process.argv.slice(2)) {
  const [command, first, second, third] = args;
  let result;
  if (command === 'resolve' && args.length === 3) result = callResearch({ operation: 'resolve', artist: first, venue: second });
  else if (command === 'context' && args.length === 2) result = callResearch({ operation: 'context', concertId: first });
  else if (command === 'read' && args.length === 3) result = callResearch({ operation: 'read', concertId: first, questionNumber: Number(second) });
  else if (command === 'save' && args.length === 4) {
    let input;
    try {
      const contents = readFileSync(third, 'utf8');
      if (Buffer.byteLength(contents) > 40000) throw new Error();
      input = JSON.parse(contents);
    } catch { throw new Error('VALIDATION: gebruik een geldig onderzoeks-JSON-bestand van maximaal 40 kB.'); }
    result = saveResearch(first, Number(second), input);
  } else throw new Error('Gebruik: resolve "artiest" "zaal" | context "concertId" | read "concertId" 1 | save "concertId" 1 "/pad/antwoord.json"');
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    // Validatie toont alleen een code; nooit inkomende JSON of secretwaarden.
    console.error(error.code === 'VALIDATION' ? 'VALIDATION: controleer de onderzoeks-JSON.' : error.message);
    process.exitCode = 1;
  }
}
