import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyImportIdentity } from './github-identity.js';
// De bestaande controles vergelijken alleen de run; het event is een apart, nieuw resultaatveld.
const runIdOf=async(...args)=>({runId:(await verifyImportIdentity(...args)).runId});
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const now = Date.now();
const claims = { iss: 'https://token.actions.githubusercontent.com', aud: 'https://esmojo.nl/api/shows-sync', sub: 'repo:rspoelstra-mojo@350283629/esmojo@1439724175:ref:refs/heads/main', repository_id: '1439724175', repository_owner_id: '350283629', repository: 'rspoelstra-mojo/esmojo', ref: 'refs/heads/main', workflow_ref: 'rspoelstra-mojo/esmojo/.github/workflows/mojo-shows.yml@refs/heads/main', event_name: 'workflow_dispatch', nbf: Math.floor(now / 1000) - 10, iat: Math.floor(now / 1000) - 10, exp: Math.floor(now / 1000) + 300, run_id: '123' };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(overrides = {}, header = {}) {
  const body = `${encode({ alg: 'RS256', kid: 'test-key', ...header })}.${encode({ ...claims, ...overrides })}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`;
}
const request = async url => { assert.equal(url, 'https://token.actions.githubusercontent.com/.well-known/jwks'); return Response.json({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig' }] }); };
test('Reports validation requires its exact audience/workflow/main and authorized publication or dispatch',async()=>{
 const audience='https://esmojo.nl/api/reports-validation-sync',workflow='reports-validation.yml',workflow_ref=`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`;
 for(const event_name of ['workflow_dispatch','push'])assert.deepEqual(await runIdOf(token({aud:audience,workflow_ref,event_name}),{request,now,audience,workflow}),{runId:'123'});
 for(const patch of [{aud:'other'},{workflow_ref:claims.workflow_ref},{ref:'refs/heads/task'},{event_name:'workflow_run'},{event_name:'schedule'},{event_name:'pull_request'},{repository_id:'other'}])await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,...patch}),{request,now,audience,workflow}),/FORBIDDEN/);
 await assert.rejects(verifyImportIdentity(token({workflow_ref}),{request,now,workflow}),/FORBIDDEN/);
});
test('alleen geldig GitHub-token voor vaste workflow, repository, main en audience wordt geaccepteerd', async () => {
  assert.deepEqual(await runIdOf(token(), { request, now }), { runId: '123' });
  for (const change of [{ iss: 'https://evil.invalid' }, { aud: 'other' }, { sub: 'repo:other:ref:refs/heads/main' }, { ref: 'refs/heads/task' }, { repository: 'other/repo' }, { workflow_ref: 'other.yml' }, { event_name: 'pull_request' }, { exp: 0 }, { nbf: now / 1000 + 120 }, { iat: 0 }]) await assert.rejects(verifyImportIdentity(token(change), { request, now }), /FORBIDDEN/);
});
test('ontbrekende, vervalste of alg-none tokens en onbekende sleutels krijgen geen toegang', async () => {
  for (const value of [undefined, 'invalid', token().slice(0, -10), token({}, { alg: 'none' }), token({}, { kid: 'untrusted' })]) await assert.rejects(verifyImportIdentity(value, { request, now }), /FORBIDDEN/);
});
test('identity diagnostics contain only closed stage names, never raw token or claim values',async()=>{
 for(const [patch,stage]of [[{sub:'private-subject-value'},'subject'],[{aud:'private-audience-value'},'audience'],[{iss:'private-issuer-value'},'issuer']])await assert.rejects(verifyImportIdentity(token(patch),{request,now}),error=>{assert.equal(error.message,'FORBIDDEN');assert.equal(error.identityStage,stage);assert.doesNotMatch(JSON.stringify(error),/private/);return true;});
});
test('retired biography identity is refused and only the fixed agenda publication probe allows push',async()=>{
 const audience='https://esmojo.nl/api/artist-biographies-sync',workflow='artist-biographies.yml',workflow_ref=`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`;
 for(const event_name of ['schedule','workflow_dispatch','push','workflow_run'])await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,event_name}),{request,now,audience,workflow}),/FORBIDDEN/);
 assert.deepEqual(await runIdOf(token({event_name:'push'}),{request,now}),{runId:'123'});await assert.rejects(verifyImportIdentity(token({event_name:'workflow_run'}),{request,now}),/FORBIDDEN/);
});

test('immutable subject en eigenaar-/repository-ID zijn verplicht, niet alleen herbruikbare namen', async () => {
  for (const change of [{ repository_id: '1' }, { repository_owner_id: '1' }, { sub: 'repo:rspoelstra-mojo/esmojo:ref:refs/heads/main' }]) await assert.rejects(verifyImportIdentity(token(change), { request, now }), /FORBIDDEN/);
});
test('OnTrack-import heeft een eigen vaste audience en behoudt alle workflow/main-controles',async()=>{
 const audience='https://esmojo.nl/api/ontrack-concerts-sync';
 await assert.rejects(verifyImportIdentity(token({aud:audience}),{request,now,audience}),/FORBIDDEN/);
 await assert.rejects(verifyImportIdentity(token(),{request,now,audience}),/FORBIDDEN/);
 await assert.rejects(verifyImportIdentity(token({aud:audience}),{request,now}),/FORBIDDEN/);
 await assert.rejects(verifyImportIdentity(token({aud:audience,ref:'refs/heads/task'}),{request,now,audience}),/FORBIDDEN/);
});

test('Rapportworker heeft uitsluitend de eigen audience en eigen vaste workflow op main',async()=>{
 const audience='https://esmojo.nl/api/ontrack-reports-sync',workflow='ontrack-reports.yml',signed=token({aud:audience,workflow_ref:'rspoelstra-mojo/esmojo/.github/workflows/ontrack-reports.yml@refs/heads/main'});
 assert.deepEqual(await runIdOf(signed,{request,now,audience,workflow}),{runId:'123'});await assert.rejects(verifyImportIdentity(signed,{request,now,audience}),/FORBIDDEN/);await assert.rejects(verifyImportIdentity(token({aud:audience}),{request,now,audience,workflow}),/FORBIDDEN/);await assert.rejects(verifyImportIdentity(signed,{request,now,audience,workflow:'unknown.yml'}),/FORBIDDEN/);
});

test('de opname op de showdag is gestopt: de audience van het oude tijdschemaeindpunt wordt niet meer geaccepteerd', async () => {
 const request = async () => ({ ok: true, json: async () => ({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig' }] }) });
 const audience='https://esmojo.nl/api/timetables-sync';
 await assert.rejects(verifyImportIdentity(token({aud:audience}),{request,now,audience}),/FORBIDDEN/);
 assert.equal((await verifyImportIdentity(token(),{request,now,audience:'https://esmojo.nl/api/shows-sync'})).runId,'123');
});

test('Homepageprojectie vereist eigen audience en de vaste middagworkflow op main',async()=>{
 const audience='https://esmojo.nl/api/home-planning-sync';await assert.rejects(verifyImportIdentity(token({aud:audience}),{request,now,audience}),/FORBIDDEN/);await assert.rejects(verifyImportIdentity(token(),{request,now,audience}),/FORBIDDEN/);await assert.rejects(verifyImportIdentity(token({aud:audience,ref:'refs/heads/other'}),{request,now,audience}),/FORBIDDEN/);
});

test('Webinventaris heeft eigen audience en aparte workflow; mailworkeridentiteit krijgt geen toegang',async()=>{
 const audience='https://esmojo.nl/api/web-reports-sync',workflow='web-reports.yml',signed=token({aud:audience,workflow_ref:'rspoelstra-mojo/esmojo/.github/workflows/web-reports.yml@refs/heads/main'});assert.deepEqual(await runIdOf(signed,{request,now,audience,workflow}),{runId:'123'});await assert.rejects(verifyImportIdentity(signed,{request,now,audience}),/FORBIDDEN/);await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref:'rspoelstra-mojo/esmojo/.github/workflows/ontrack-reports.yml@refs/heads/main'}),{request,now,audience,workflow}),/FORBIDDEN/);
});

test('Eenmalige bezorgproef accepteert uitsluitend de eigen workflow/audience op main',async()=>{
 const audience='https://esmojo.nl/api/email-deliverability',workflow='email-deliverability.yml',signed=token({aud:audience,workflow_ref:`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`});
 assert.deepEqual(await runIdOf(signed,{request,now,audience,workflow}),{runId:'123'});await assert.rejects(verifyImportIdentity(signed,{request,now,audience}),/FORBIDDEN/);await assert.rejects(verifyImportIdentity(token({aud:audience}),{request,now,audience,workflow}),/FORBIDDEN/);await assert.rejects(verifyImportIdentity(signed,{request,now,workflow}),/FORBIDDEN/);
});

test('MFA-cachecheck vereist eigen vaste workflow, audience en main-identiteit',async()=>{
 const audience='https://esmojo.nl/api/mfa',workflow='mfa-security-check.yml';
 const signed=token({aud:audience,workflow_ref:`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`});
 assert.deepEqual(await runIdOf(signed,{request,now,audience,workflow}),{runId:'123'});
 await assert.rejects(verifyImportIdentity(token({aud:audience}),{request,now,audience,workflow}),/FORBIDDEN/);
 await assert.rejects(verifyImportIdentity(signed,{request,now,audience:'other',workflow}),/FORBIDDEN/);
});
test('Automatische incidentherberekening accepteert alleen webworkflow/main/eigen audience, geen fork of andere workflow',async()=>{
 const audience='https://esmojo.nl/api/incident-references-sync',workflow='web-reports.yml',workflow_ref=`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`;
 for(const event_name of ['push','workflow_run']){
  assert.deepEqual(await runIdOf(token({aud:audience,workflow_ref,event_name}),{request,now,audience,workflow}),{runId:'123'});
  for(const patch of [{ref:'refs/heads/task'},{repository_id:'123'},{repository_owner_id:'123'},{aud:'other'},{workflow_ref:'other'}])await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,event_name,...patch}),{request,now,audience,workflow}),/FORBIDDEN/);
 }
});

test('background tasks require their own OIDC audience/workflow on main, with fixed push and no PR authority',async()=>{
 const audience='https://esmojo.nl/api/background-tasks-sync',workflow='background-tasks.yml',workflow_ref=`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`;
 for(const event_name of ['schedule','workflow_dispatch','push'])assert.deepEqual(await runIdOf(token({aud:audience,workflow_ref,event_name}),{request,now,audience,workflow}),{runId:'123'});
 for(const patch of [{aud:'other'},{workflow_ref:claims.workflow_ref},{ref:'refs/heads/task'},{event_name:'workflow_run'},{event_name:'pull_request'},{repository_id:'other'}])await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,...patch}),{request,now,audience,workflow}),/FORBIDDEN/);
 await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref}),{request,now,audience}),/FORBIDDEN/);
});
test('Reports cutover accepts only its fixed main workflow/audience for dispatch or its own push',async()=>{
 const audience='https://esmojo.nl/api/reports-cutover-sync',workflow='reports-cutover.yml',workflow_ref=`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`;
 for(const event_name of ['workflow_dispatch','push'])assert.deepEqual(await runIdOf(token({aud:audience,workflow_ref,event_name}),{request,now,audience,workflow}),{runId:'123'});
 for(const event_name of ['schedule','pull_request','workflow_run'])await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,event_name}),{request,now,audience,workflow}),/FORBIDDEN/);
 await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,event_name:'push',ref:'refs/heads/other'}),{request,now,audience,workflow}),/FORBIDDEN/);
 await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,event_name:'push',repository_id:'1'}),{request,now,audience,workflow}),/FORBIDDEN/);
});


test('MFA technical probe permits only its fixed main publication identity',async()=>{
 const audience='https://esmojo.nl/api/mfa',workflow='mfa-security-check.yml',workflow_ref=`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`;
 assert.deepEqual(await runIdOf(token({aud:audience,workflow_ref,event_name:'push'}),{request,now,audience,workflow}),{runId:'123'});
 for(const patch of [{aud:'other'},{workflow_ref:claims.workflow_ref},{ref:'refs/heads/task'},{event_name:'pull_request'},{repository_id:'other'}])await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,event_name:'push',...patch}),{request,now,audience,workflow}),/FORBIDDEN/);
});
test('background publication identity cannot be reused for another endpoint even with matching signed claims',async()=>{const audience='https://esmojo.nl/api/mfa',workflow='background-tasks.yml',workflow_ref=`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`;await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,event_name:'push'}),{request,now,audience,workflow}),/FORBIDDEN/);});

test('Google-detachment push accepts only the fixed main read-only audit audience, never the technical write-probe audience',async()=>{
 const workflow='shows-runtime.yml',workflow_ref=`rspoelstra-mojo/esmojo/.github/workflows/${workflow}@refs/heads/main`,audience='https://esmojo.nl/api/shows-runtime-sync?audit=google-detachment';
 assert.deepEqual(await runIdOf(token({aud:audience,workflow_ref,event_name:'push'}),{request,now,audience,workflow}),{runId:'123'});
 for(const change of [{ref:'refs/heads/task'},{repository_id:'other'},{workflow_ref:claims.workflow_ref},{event_name:'pull_request'},{event_name:'workflow_run'},{aud:'other'}])await assert.rejects(verifyImportIdentity(token({aud:audience,workflow_ref,event_name:'push',...change}),{request,now,audience,workflow}),/FORBIDDEN/);
 for(const other of ['https://esmojo.nl/api/shows-runtime-sync','https://esmojo.nl/api/mfa'])await assert.rejects(verifyImportIdentity(token({aud:other,workflow_ref,event_name:'push'}),{request,now,audience:other,workflow}),/FORBIDDEN/);
});
test('identiteit geeft de bevestigde event-naam terug voor de handmatige-run-controle', async () => {
  const request = async () => ({ ok: true, json: async () => ({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig' }] }) });
  for (const event_name of ['schedule', 'workflow_dispatch']) assert.equal((await verifyImportIdentity(token({ event_name }), { request, now })).event, event_name);
});
