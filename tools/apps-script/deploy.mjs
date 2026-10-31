import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, readdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = fileURLToPath(new URL('.', import.meta.url));
const repository = resolve(toolDir, '../..');

// Pull behoudt het bestaande manifest en eventuele niet door Git beheerde code.
// Wijzigingen van Code.gs worden uitsluitend uit de repository overgenomen.
export async function overlaySources(source, target) {
  const manifest = await readFile(join(target, 'appsscript.json'), 'utf8');
  JSON.parse(manifest);
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Geen symlinks in Apps Script-broncode toegestaan.');
    if (entry.isDirectory()) {
      await mkdir(join(target, entry.name), { recursive: true });
      // Momenteel één Code.gs; submappen pas na expliciete ondersteuning.
      throw new Error('Apps Script-submappen worden nog niet ondersteund.');
    }
    if (entry.isFile() && /\.(gs|html)$/.test(entry.name)) {
      await copyFile(join(source, entry.name), join(target, entry.name));
    }
  }
  if (await readFile(join(target, 'appsscript.json'), 'utf8') !== manifest) {
    throw new Error('Het bestaande Google-manifest is onverwacht gewijzigd.');
  }
}

export async function deploy({ env = process.env, execute, verify = true } = {}) {
  if (!env.CLASPRC_JSON) throw new Error('GitHub-secret CLASPRC_JSON ontbreekt. Rond eerst de Google-autorisatie af.');
  let credentials;
  try { credentials = JSON.parse(env.CLASPRC_JSON); } catch { throw new Error('CLASPRC_JSON bevat geen geldige JSON.'); }
  if (!credentials.tokens?.default?.refresh_token) throw new Error('CLASPRC_JSON bevat geen standaard clasp-login met refresh token.');
  const config = JSON.parse(await readFile(join(toolDir, 'deployment.json'), 'utf8'));
  if (!/^[\w-]+$/.test(config.scriptId) || !/^[\w-]+$/.test(config.deploymentId)) throw new Error('Ongeldige publicatieconfiguratie.');
  const temporary = await mkdtemp(join(tmpdir(), 'esmojo-clasp-'));
  try {
    const source = join(temporary, 'source');
    await mkdir(source, { mode: 0o700 });
    const auth = join(temporary, 'credentials.json');
    const project = join(temporary, 'project.json');
    await writeFile(auth, JSON.stringify(credentials), { mode: 0o600 });
    await writeFile(project, JSON.stringify({ scriptId: config.scriptId, rootDir: source, scriptExtensions: ['gs'], htmlExtensions: ['html'], jsonExtensions: ['json'] }));
    const command = (args, json = false) => {
      const fullArgs = ['--auth', auth, '--project', project, ...(json ? ['--json'] : []), ...args];
      let output;
      try {
        if (execute) output = execute(fullArgs, source);
        else {
          const childEnv = { ...env, NO_COLOR: '1' };
          delete childEnv.CLASPRC_JSON; delete childEnv.DEBUG;
          output = execFileSync(join(toolDir, 'node_modules/.bin/clasp'), fullArgs, {
            encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'], env: childEnv,
          });
        }
      } catch {
        // Geen raw tool-output: Google-fouten kunnen credentialinformatie bevatten.
        throw new Error(`clasp ${args[0]} mislukt. Controleer de Apps Script API-toegang, autorisatie en projectrechten.`);
      }
      return json ? JSON.parse(output) : output;
    };
    const deployments = command(['list-deployments'], true);
    if (!deployments.some(item => item.deploymentId === config.deploymentId)) throw new Error('Bestaande webapp-deployment niet gevonden; er wordt geen nieuwe aangemaakt.');
    command(['pull']);
    await overlaySources(join(repository, 'google-apps-script'), source);
    command(['push']);
    const description = `ESMOJO ${(env.GITHUB_SHA || 'manual').slice(0, 12)}`;
    const { versionNumber } = command(['create-version', description], true);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) throw new Error('Google heeft geen geldig versienummer teruggegeven.');
    const result = command(['update-deployment', config.deploymentId, '--versionNumber', String(versionNumber), '--description', description], true);
    if (result.deploymentId !== config.deploymentId || result.versionNumber !== versionNumber) throw new Error('Google heeft de verwachte deploymentversie niet bevestigd.');
    if (verify) {
      const response = await fetch(`https://script.google.com/macros/s/${config.deploymentId}/exec`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('Nieuwe webapp-versie is gepubliceerd, maar de bereikbaarheidstest geeft een HTTP-fout.');
      let health;
      try { health = await response.json(); } catch { throw new Error('Nieuwe webapp-versie is gepubliceerd, maar geeft geen JSON-status terug.'); }
      if (health.ok !== false || health.error !== 'Gebruik een ondertekend serververzoek.') throw new Error('Nieuwe webapp-versie is gepubliceerd, maar de anonieme toegang wordt niet zoals verwacht geweigerd.');
    }
    console.log(`Apps Script versie ${versionNumber} gepubliceerd op de bestaande webapp-URL.`);
    return result;
  } finally {
    // Alleen de hierboven aangemaakte tijdelijke directory, ook bij fouten.
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deploy().catch(error => { console.error(error.message); process.exitCode = 1; });
}
