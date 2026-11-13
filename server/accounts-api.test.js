import {createHash} from 'node:crypto';
import {ONTRACK_HEADERS} from './ontrack-report/data.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAccountsHandler } from './accounts-api.js';
import { validateProfile } from './account-profiles.js';
import {renderEmailTemplate} from './email-template.js';

const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const profile = { id, firstName: 'Test', lastName: 'Account', company:'MOJO Concerts',jobTitle: 'Event Safety Manager', role: 'beheerder', modules:['shows','artists','reports'], activated: true, email: 'test@example.invalid' };
const env = { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'public-test', SUPABASE_SECRET_KEY: 'server-test', RESEND_API_KEY: 'mail-test' };
const token = (aal = 'aal2', sub = id) => `header.${Buffer.from(JSON.stringify({ aal, sub, amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }, ...(aal === 'aal2' ? [{ method: 'totp' }] : [])] })).toString('base64url')}.signature`;

test('Dataverse-concepten blijven achter account/MFA/Shows en behouden eigen samenvattingen',async()=>{
 const {createDataverseResearch}=await import('./dataverse-research.js');
 const {dataversePilot:pilot}=await import('../shared/dataverse-pilot.js');
 const calls=[],result={researchByNumber:{1:{answer:'Synthetisch AI-concept',source:'dataverse'}},researchErrors:{}};
 const researchService={...createDataverseResearch({env:{}}),load:async key=>{calls.push(key);return result;}};
 const body={concertId:pilot.concertId};
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker',modules:['artists']}}]){
  const {response}=await run({...input,action:'show-open',method:'POST',body,researchService});assert.ok([401,403].includes(response.code));
 }
 assert.equal(calls.length,0);
 const ownProfile={revision:4,analyses:{1:{summary:'Eigen tekst',status:'completed'}},finalization:{unchanged:true},researchByNumber:{1:{answer:'Oud'}}};
 const opened=await run({action:'show-open',method:'POST',body,researchService,showResult:{profile:ownProfile,tickets:{untouched:true}}});
 assert.equal(opened.response.code,200);assert.equal(opened.response.data.profile.researchByNumber[1].answer,'Synthetisch AI-concept');assert.deepEqual(opened.response.data.profile.analyses,ownProfile.analyses);assert.deepEqual(opened.response.data.tickets,{untouched:true});
 const detail=await run({action:'show-profile',method:'POST',body:{...body,operation:'read',questionNumber:1},researchService,showResult:ownProfile});assert.equal(detail.response.data.research.answer,'Synthetisch AI-concept');
 const save=await run({action:'show-profile',method:'POST',body:{...body,operation:'save',questionNumber:1,summary:'Eigen tekst',status:'draft',revision:4},researchService,showResult:ownProfile});assert.equal(save.response.code,200);assert.equal(calls.length,2,'Geen Dataverse-write of extra read bij opslaan');
});
test('Onderzoeksdiagnose vereist beheerder en accepteert geen vrije tabel/filter',async()=>{
 let calls=0;const researchService={diagnose:async()=>{calls++;return{code:'RESEARCH_NO_VISIBLE_ROWS'};}};
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}}]){
  const {response}=await run({...input,method:'POST',action:'dataverse-test',body:{operation:'research-read'},researchService});assert.ok([401,403].includes(response.code));
 }
 assert.equal(calls,0);
 assert.equal((await run({method:'POST',action:'dataverse-test',body:{operation:'research-read',table:'vrij'},researchService})).response.code,400);
 assert.equal((await run({method:'POST',action:'dataverse-test',body:{operation:'research-read'},researchService})).response.data.code,'RESEARCH_NO_VISIBLE_ROWS');assert.equal(calls,1);
});
test('Algemene Dataverse-discovery blijft achter Shows/MFA; Westlife krijgt metadata en showbundel',async()=>{
 const {createDataverseResearch}=await import('./dataverse-research.js');let reads=0;
 const source='westlife_ziggodome_20261123',key='dataverse_'+source;
 const researchService={...createDataverseResearch({env:{}}),configured:()=>true,sourceKeys:async()=>{reads++;return[source];},load:async()=>({researchByNumber:{1:{answer:'Westlife-concept'}},researchErrors:{}})};
 const showsSource=async(op,input)=>op==='list'?{checkedAt:'2026-11-12T10:00Z',concerts:[]}:op==='research-identities'?{concerts:[]}:op==='dataverse-ensure'?{concertId:input.show.key}:{profile:{revision:0,analyses:{},researchByNumber:{}},tickets:{preserved:true}};
 for(const params of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker',modules:['artists']}}]){
  assert.ok([401,403].includes((await run({...params,action:'shows',researchService,showsSource})).response.code));
 }
 assert.equal(reads,0);
 const listed=await run({action:'shows',researchService,showsSource});assert.equal(listed.response.code,200);assert.equal(listed.response.data.shows[0].name,'Westlife');assert.equal(listed.response.data.shows[0].venue,'Ziggo Dome');assert.doesNotMatch(JSON.stringify(listed.response.data),/answer|markdown|sourceKey/);
 const opened=await run({action:'show-open',method:'POST',body:{concertId:key},researchService,showsSource});assert.equal(opened.response.code,200);assert.equal(opened.response.data.profile.researchByNumber[1].answer,'Westlife-concept');
});

async function run({ aal, sub, valid = true, own = profile, body, method = 'GET', action = 'accounts', auth = true, origin, configuration = env, failOperation, failDelete = false, failMail = false, targetProfile, reportSource, confirmedAt = '2026-10-31', taskService, migrationService, tableService, choiceService, transitionService, managementResult={available:false}, researchService, showResult, showsSource, dataverseResult={configuration:true,token:true,dataverse:false,code:'DATAVERSE_FORBIDDEN'} } = {}) {
  const calls = [];
  const clientFactory = () => ({ auth: {
    getUser: async () => valid ? { data: { user: { id, factors: [{ factor_type: 'totp', status: 'verified' }] } } } : { error: new Error('invalid') },
    admin: {
      createUser: async input => { calls.push(['createAuth', input]); return { data: { user: { id: other } } }; },
      getUserById: async value => ({ data: { user: { id: value, email_confirmed_at: confirmedAt } } }),
      generateLink: async input => { calls.push(['invite', input]); return { data: { user: { id: other }, properties: { hashed_token: 'private-token' } } }; },
      deleteUser: async value => { calls.push(['deleteAuth', value]); return failDelete ? { error: new Error('failure') } : {}; },
      updateUserById: async (...args) => { calls.push(['password', ...args]); return {}; },
    },
  } });
  const handler = makeAccountsHandler({
    ...(taskService?{tasks:taskService,background:promise=>{calls.push(['task-background']);void promise.catch(()=>{});}}:{}),
    ...(migrationService?{showMigration:migrationService}:{}),
    ...(tableService?{dataverseTables:tableService}:{}),
    ...(choiceService?{dataverseChoices:choiceService}:{}),
    ...(transitionService?{dataTransition:transitionService}:{}), env: configuration, clientFactory, dataverseResearch:researchService, dataverseTest:async options=>{calls.push(['dataverseTest',options]);return dataverseResult;}, showManagement:{async manage(input){calls.push(['showManagement',input]);return managementResult;}}, photoService:async()=>null,
    ontrackReportStore:async(operation,actor,input)=>{calls.push(['ontrack-report',operation,actor,input]);return operation==='web-read'&&reportSource?reportSource:{ok:true};},
    mailingConcerts:async()=>({concerts:[],checkedAt:null}),
    ontrack:async(operation,actor,input)=>{calls.push(['ontrack',operation,actor,input]);return {revision:1,recipientIds:input?.recipientIds||[],received:2,converted:0,latest:[],accounts:[]};},
    shows:async(operation,input)=>{calls.push(['shows',operation,input]);return showsSource?showsSource(operation,input):showResult??(operation==='list'?{shows:[]}:{record:{revision:0}});},
    profiles: async (operation, actor, input) => {
      calls.push([operation, actor, input]);
      if (operation === failOperation) throw new Error('FORBIDDEN');
      return operation === 'self' ? own : operation === 'list' ? [targetProfile || { ...profile, id: other, activated: false }] : { ok: true };
    }, mail: async (input,mailOptions) => { calls.push(['mail', {...input,...renderEmailTemplate(input)},mailOptions]); if (failMail) throw new Error('private-response'); },
  });
  const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.code = value; return this; }, json(value) { this.data = value; return this; } };
  await handler({ method, body, headers: { ...(auth ? { authorization: `Bearer ${token(aal, sub)}` } : {}), ...(origin ? { origin } : {}) }, query: { action } }, response);
  return { response, calls };
}

test('zonder authenticatie geen profiel- of authenticatiebeheer', async () => {
  const { response, calls } = await run({ auth: false }); assert.equal(response.code, 401); assert.equal(calls.length, 0);
});
test('ongeldig of vervalst token wordt geweigerd voordat Drive wordt gebruikt', async () => {
  for (const input of [{ valid: false }, { sub: other }]) { const { response, calls } = await run(input); assert.equal(response.code, 401); assert.equal(calls.length, 0); }
});
test('alleen wachtwoord is onvoldoende, ook voor de sessiecontrole', async () => {
  for (const action of ['accounts', 'session', 'complete']) { const { response, calls } = await run({ aal: 'aal1', action }); assert.equal(response.code, 403); assert.equal(response.data.code, 'MFA_REQUIRED'); assert.equal(calls.length, 0); }
});
test('een gewone gebruiker kan geen accounts lezen, maken, wijzigen of verwijderen', async () => {
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) { const { response, calls } = await run({ method, own: { ...profile, role: 'gebruiker' } }); assert.equal(response.code, 403); assert.deepEqual(calls.map(call => call[0]), ['self']); }
});
test('onvoltooide activering geeft geen accountbeheer', async () => {
  const { response } = await run({ own: { ...profile, activated: false } }); assert.equal(response.data.code, 'SETUP_REQUIRED');
});
test('activering vereist een lang wachtwoord en slaat dat niet in Drive op', async () => {
  const short = await run({ method: 'POST', action: 'complete', own: { ...profile, activated: false }, body: { password: 'short' } }); assert.equal(short.response.code, 400);
  const result = await run({ method: 'POST', action: 'complete', own: { ...profile, activated: false }, body: { password: 'strong-password-test' } });
  assert.equal(result.response.code, 200); assert.deepEqual(result.calls.map(call => call[0]), ['self', 'password', 'activate']); assert.equal(JSON.stringify(result.calls.filter(call => call[0] === 'activate')).includes('strong-password'), false);
});
test('account aanmaken bewaart profiel in Drive en mailt de centrale activatiemail', async () => {
  const { response, calls } = await run({ method: 'POST', body: profile });
  assert.equal(response.code, 201); assert.deepEqual(calls.map(call => call[0]), ['self', 'createAuth', 'invite', 'create', 'mail']);
  assert.deepEqual(calls.find(call => call[0] === 'invite')[1], { type: 'invite', email: profile.email });
  const mail = calls.find(call => call[0] === 'mail')[1]; assert.match(mail.text, /#\/activeren\?token=/); assert.match(mail.text, /Beste Test,/); assert.match(mail.html, /Account activeren/); assert.match(mail.html, /#0046f2/); assert.equal(calls.filter(call=>call[0]==='mail').length,1);
  assert.equal(JSON.stringify(response.data).includes('private-token'), false);
});
test('mislukte Drive-opslag ruimt de nieuw gemaakte identiteit op', async () => {
  const { response, calls } = await run({ method: 'POST', body: profile, failOperation: 'create' });
  assert.equal(response.code, 403); assert.deepEqual(calls.map(call => call[0]), ['self', 'createAuth', 'invite', 'create', 'deleteAuth']);
});
test('mislukte uitnodigingsmail geeft een herstelbare status zonder geheime foutdetails', async () => {
  const { response } = await run({ method: 'POST', body: profile, failMail: true }); assert.equal(response.code, 202); assert.equal(JSON.stringify(response.data).includes('private-response'), false);
});
test('onderbroken activering kan met een nieuwe eenmalige link worden hervat', async () => {
  const { response, calls } = await run({ method: 'PATCH', body: { id: other, operation: 'invite' } });
  assert.equal(response.code, 200); assert.equal(calls.find(call => call[0] === 'invite')[1].type, 'recovery');
  assert.match(calls.find(call => call[0] === 'mail')[1].text, /type=recovery/);
});
test('Drive blokkeert eerst; bij falende Supabase-verwijdering blijft blokkade staan', async () => {
  const { response, calls } = await run({ method: 'DELETE', body: { id: other }, failDelete: true }); assert.equal(response.code, 503); assert.deepEqual(calls.map(call => call[0]), ['self', 'disable', 'deleteAuth']);
});
test('succesvol verwijderen ruimt na blokkeren ook profiel op', async () => {
  const { response, calls } = await run({ method: 'DELETE', body: { id: other } }); assert.equal(response.code, 200); assert.deepEqual(calls.map(call => call[0]), ['self', 'disable', 'deleteAuth', 'delete']);
});
test('onbekende origin en ontbrekende serverconfiguratie worden geweigerd', async () => {
  assert.equal((await run({ origin: 'https://evil.invalid' })).response.code, 403); assert.equal((await run({ configuration: {} })).response.code, 503);
});
test('responses bevatten nooit cachebare profielen', async () => {
  assert.equal((await run()).response.headers['Cache-Control'], 'no-store, private');
});
test('profielvalidatie weigert rollen, SVG-fotos, grote fotos en onvolledige profielen', () => {
  for (const input of [{ ...profile, role: 'owner' }, { ...profile, photo: 'data:image/svg+xml;base64,AAAA' }, { ...profile, photo: 'x'.repeat(100001) }, { ...profile, firstName: '' }]) assert.throws(() => validateProfile(input));
});
test('een gewone gebruiker kan alleen een eigen foto opslaan zonder beheersleutelacties', async () => {
  const { response, calls } = await run({ action: 'photo', method: 'PATCH', own: { ...profile, role: 'gebruiker' }, body: { photo: 'data:image/jpeg;base64,AAAA' } });
  assert.equal(response.code, 200); assert.deepEqual(calls.map(call => call[0]), ['self', 'photo']);
  assert.equal(calls[1][1], id); assert.deepEqual(calls[1][2], { photo: 'data:image/jpeg;base64,AAAA' });
});
test('eigen fotoroute weigert IDs, rollen en andere profielvelden in de aanvraag', async () => {
  for (const extra of [{ id: other }, { role: 'beheerder' }, { firstName: 'Changed' }]) {
    const { response, calls } = await run({ action: 'photo', method: 'PATCH', own: { ...profile, role: 'gebruiker' }, body: { photo: 'data:image/jpeg;base64,AAAA', ...extra } });
    assert.equal(response.code, 400); assert.deepEqual(calls.map(call => call[0]), ['self']);
  }
});
test('eigen fotoroute vereist TOTP en een geactiveerd profiel', async () => {
  for (const config of [{ aal: 'aal1' }, { own: { ...profile, activated: false } }]) {
    const { response, calls } = await run({ action: 'photo', method: 'PATCH', body: { photo: 'data:image/jpeg;base64,AAAA' }, ...config });
    assert.equal(response.code, 403); assert.equal(calls.some(call => call[0] === 'photo'), false);
  }
});

test('Nieuwe productionele routes vereisen account/MFA en gebruiken uitsluitend de server-actor',async()=>{
 for(const action of ['barrier-layout','floor-pressure','show-open']){
  const body=action==='show-open'?{concertId:'Test'}:{operation:'read',concertId:'Test'};
  assert.equal((await run({action,method:'POST',auth:false,body})).response.code,401);
  assert.equal((await run({action,method:'POST',aal:'aal1',body})).response.code,403);
  const success=await run({action,method:'POST',body});assert.equal(success.response.code,200);assert.equal(success.calls.find(c=>c[0]==='shows')[2].actor,id);
  assert.equal((await run({action,method:'POST',body:{...body,actor:other}})).response.code,400);
 }
});

test('accountmail gebruikt de afzonderlijke voornaam van de ontvanger, nooit de beheerder of overige profielvelden',async()=>{
 const body={...profile,firstName:'Anne Marie',lastName:'NietInDeMail',jobTitle:'CMT Leider',email:'ontvanger@example.invalid'};
 const {response,calls}=await run({method:'POST',own:{...profile,firstName:'Beheerder'},body});
 assert.equal(response.code,201);const mail=calls.find(c=>c[0]==='mail')[1];
 assert.equal(mail.to,body.email);assert.match(mail.html,/Beste Anne Marie,/);assert.match(mail.text,/Beste Anne Marie,/);
 for(const value of ['Beste Beheerder,','NietInDeMail','AlleenInDrive'])assert.equal(mail.html.includes(value)||mail.text.includes(value),false);
 assert.equal(mail.actions[0].url,'https://esmojo.nl/#/activeren?token=private-token');assert.equal(calls.filter(c=>c[0]==='mail').length,1);
});
test('opnieuw uitnodigen gebruikt de doelaccountnaam en behoudt invite/recovery zonder extra mail',async()=>{
 for(const confirmedAt of [null,'2026-10-31']){
  const {response,calls}=await run({method:'PATCH',own:{...profile,firstName:'Beheerder'},body:{id:other,operation:'invite'},confirmedAt,targetProfile:{...profile,id:other,activated:false,firstName:'Jan Pieter',email:'doel@example.invalid'}});
  assert.equal(response.code,200);const mail=calls.find(c=>c[0]==='mail')[1];assert.equal(mail.to,'doel@example.invalid');assert.match(mail.text,/Beste Jan Pieter,/);
  assert.equal(mail.actions[0].url,'https://esmojo.nl/#/activeren?token=private-token&type='+(confirmedAt?'recovery':'invite'));
  assert.equal(calls.filter(c=>c[0]==='mail').length,1);
 }
});
test('ontbrekende betrouwbare doelvoornaam gebruikt Beste collega zonder een naam uit het mailadres af te leiden',async()=>{
 const {calls,response}=await run({method:'PATCH',body:{id:other,operation:'invite'},targetProfile:{...profile,id:other,activated:false,firstName:undefined,email:'gedeeld@example.invalid'}});
 assert.equal(response.code,200);const mail=calls.find(c=>c[0]==='mail')[1];assert.match(mail.html,/Beste collega,/);assert.match(mail.text,/Beste collega,/);assert.equal(mail.text.includes('Beste gedeeld,'),false);
});

const emailTestBody={templateId:'account-activation',requestId:'11111111-1111-4111-8111-111111111111'};
test('Email-beheer toont automatisch beschikbare templates; alleen expliciete POST verstuurt één test naar de ingelogde beheerder',async()=>{
 const catalog=await run({action:'email'});assert.equal(catalog.response.code,200);assert.deepEqual(catalog.response.data.templates,[{id:'account-activation',label:'Account activeren',requiresShow:false},{id:'show-report',label:'Showrapportage',requiresShow:true,concertCatalog:'ontrack'}]);assert.equal(catalog.response.data.recipient,profile.email);assert.equal(catalog.calls.some(c=>c[0]==='mail'),false);
 const {response,calls}=await run({action:'email',method:'POST',body:emailTestBody});assert.equal(response.code,200);assert.equal(response.data.ok,true);assert.deepEqual(calls.map(c=>c[0]),['self','mail']);
 const sent=calls.find(c=>c[0]==='mail');assert.equal(sent[1].to,profile.email);assert.match(sent[1].subject,/^\[TEST\]/);assert.match(sent[1].text,/Beste Test,/);assert.equal(sent[1].text.includes('test-only-not-an-activation'),false);assert.equal(sent[1].html.includes('/activeren?token='),false);assert.ok(sent[1].html.includes('ESMOJO openen'));assert.equal(sent[2].idempotencyKey,'esmojo-test-'+emailTestBody.requestId);
});
test('Testmailroute vereist MFA/activatie/beheerder/origin en accepteert geen vrije ontvanger, inhoud of onbekend template',async()=>{
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,activated:false}},{own:{...profile,role:'gebruiker'}},{origin:'https://evil.invalid'},{failOperation:'self'}]){const {response,calls}=await run({...input,action:'email',method:'POST',body:emailTestBody});assert.ok([401,403].includes(response.code));assert.equal(calls.some(c=>c[0]==='mail'),false);}
 for(const body of [{...emailTestBody,to:'anders@example.invalid'},{...emailTestBody,html:'<h1>Vrij</h1>'},{...emailTestBody,subject:'Vrij'},{...emailTestBody,requestId:'ongeldig'},{...emailTestBody,templateId:'../../escape'},{...emailTestBody,concertId:'Onnodig'}]){const {response,calls}=await run({action:'email',method:'POST',body});assert.equal(response.code,400);assert.equal(calls.some(c=>c[0]==='mail'),false);}
 assert.equal((await run({action:'email',method:'POST',body:{...emailTestBody,templateId:'bestaat-niet'}})).response.code,404);
 assert.equal((await run({action:'email',method:'PATCH',body:emailTestBody})).response.code,405);
});
test('Testmail bewaart geen geheime providerfout; ontbrekende mailconfiguratie maakt geen verzending',async()=>{
 const missing=await run({action:'email',configuration:{...env,RESEND_API_KEY:''}});assert.equal(missing.response.data.canSend,false);
 const blocked=await run({action:'email',method:'POST',body:emailTestBody,configuration:{...env,RESEND_API_KEY:''}});assert.equal(blocked.response.code,503);assert.equal(blocked.calls.some(c=>c[0]==='mail'),false);
 const failed=await run({action:'email',method:'POST',body:emailTestBody,failMail:true});assert.equal(failed.response.code,503);assert.equal(JSON.stringify(failed.response.data).includes('private-response'),false);assert.equal(failed.calls.filter(c=>c[0]==='mail').length,1);
});

test('OnTrack vereist beheerder/MFA en verstuurt nooit mail via status of ontvangerkeuze',async()=>{
 const read=await run({action:'ontrack'});assert.equal(read.response.code,200);assert.deepEqual(read.calls.map(c=>c[0]),['self','ontrack']);assert.equal(read.calls[1][1],'status');
 const write=await run({action:'ontrack',method:'PATCH',body:{revision:0,recipientIds:[other]}});assert.equal(write.response.code,200);assert.deepEqual(write.calls[1],['ontrack','recipients',id,{revision:0,recipientIds:[other]}]);
 for(const options of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,activated:false}},{origin:'https://evil.invalid'}]){const r=await run({action:'ontrack',...options});assert.ok([401,403].includes(r.response.code));assert.equal(r.calls.some(c=>c[0]==='ontrack'),false);}
 const invalid=await run({action:'ontrack',method:'PATCH',body:{revision:0,recipientIds:[other],folderId:'arbitrary'}});assert.equal(invalid.response.code,400);assert.equal(invalid.calls.some(c=>c[0]==='ontrack'),false);assert.equal((await run({action:'ontrack',method:'POST'})).response.code,405);
});

test('Rapportacties zijn beheerder/MFA-only en accepteren geen eigen showmetadata, bijlage of ontvanger',async()=>{
 const body={operation:'link',sourceId:'csv_source',concertId:'canonieke-show',revision:0};
 for(const options of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,activated:false}},{origin:'https://evil.invalid'}]){const r=await run({action:'ontrack-report',method:'POST',body,...options});assert.ok([401,403].includes(r.response.code));assert.equal(r.calls.some(c=>c[0]==='ontrack-report'),false);}
 for(const extra of [{show:{name:'Vrije artiest'}},{to:'other@example.invalid'},{pdfBase64:'vrije bijlage'},{actor:other},{operation:'reserve'}]){const r=await run({action:'ontrack-report',method:'POST',body:{...body,...extra}});assert.equal(r.response.code,400);assert.equal(r.calls.some(c=>c[0]==='ontrack-report'),false);}
 assert.equal((await run({action:'ontrack-report',method:'GET'})).response.code,405);
});

test('Modules zijn onafhankelijk: ieder niet-toegekend onderdeel wordt vóór gegevensophaal/download en ongeacht beheerdersrol geweigerd',async()=>{
 const actions=[['artists','artists','GET'],['artists','artist-detail','POST'],['artists','artist-menu','GET'],['artists','artist-ranking','GET'],['artists','artist-view','POST'],['shows','shows','GET'],['shows','show-open','POST'],['shows','show-photo','POST'],['shows','show-profile','POST'],['shows','show-risks','POST'],['shows','show-profile-pdf','POST'],['shows','analysis-finalization','POST'],['shows','ticket-data','POST'],['shows','barrier-layout','POST'],['shows','floor-pressure','POST'],['shows','production-risks','POST'],['shows','operational-risk','POST'],['shows','measure','POST'],['reports','report-menu','GET'],['reports','report-web','POST'],['reports','ontrack','GET'],['reports','ontrack-report','POST'],['reports','report-download','POST']];
 for(const modules of [[],['shows'],['artists'],['reports']])for(const role of ['gebruiker','beheerder'])for(const [required,action,method]of actions){
  if(modules.includes(required))continue;
  const {response,calls}=await run({own:{...profile,role,modules},action,method,body:{operation:'download',reportId:'bekend-id',modules:['shows','artists','reports']}});
  assert.equal(response.code,403,role+' '+modules+' '+action);assert.equal(response.data.code,'MODULE_FORBIDDEN');assert.equal(response.data.module,required);assert.deepEqual(calls.map(call=>call[0]),['self']);
 }
});
test('Accountprofiel mag door een beheerder modules wijzigen, een gebruiker mag zichzelf geen modules geven',async()=>{
 const body={...profile,id:other,modules:['reports']};delete body.email;
 const saved=await run({method:'PATCH',body});assert.equal(saved.response.code,200);assert.deepEqual(saved.calls.find(call=>call[0]==='update')[2].profile.modules,['reports']);
 const denied=await run({own:{...profile,role:'gebruiker',modules:[]},method:'PATCH',body});assert.equal(denied.response.code,403);assert.equal(denied.calls.some(call=>call[0]==='update'),false);
 const photo=await run({own:{...profile,role:'gebruiker',modules:[]},action:'photo',method:'PATCH',body:{photo:'data:image/png;base64,AAAA',modules:['reports']}});assert.equal(photo.response.code,400);
 const session=await run({own:{...profile,modules:[]},action:'session'});assert.equal(session.response.code,200);assert.deepEqual(session.response.data.profile.modules,[]);
});
test('Super beheerder behoudt alle modules maar de website-API kent die rol nooit toe',async()=>{
 const own={...profile,role:'superbeheerder',email:'super-admin@example.invalid',modules:[]};
 const admin=await run({own});assert.equal(admin.response.code,200);
 assert.equal((await run({own,aal:'aal1'})).response.code,403);assert.equal((await run({own:{...own,activated:false},action:'ontrack'})).response.data.code,'SETUP_REQUIRED');
 for(const action of ['show-open','show-profile','ontrack','ontrack-report']){
  const result=await run({own,action,method:action==='ontrack'?'GET':'POST',body:{concertId:'Fixture',operation:'read'}});assert.notEqual(result.response.data.code,'MODULE_FORBIDDEN');
 }
 for(const method of ['POST','PATCH']){
  const result=await run({own,method,body:{...profile,id:other,role:'superbeheerder',email:'other@example.invalid'}});assert.equal(result.response.code,400);assert.equal(result.calls.some(call=>call[0]==='update'||call[0]==='createAuth'),false);
 }
 const body={...profile,id:own.id,modules:[]};delete body.role;const preserved=await run({own,method:'PATCH',body});assert.equal(preserved.response.code,200);assert.equal(preserved.calls.find(call=>call[0]==='update')[2].profile.role,'superbeheerder');
});

test('Rapportages-only gebruiker leest het vaste webvoorbeeld zonder Shows of beheerderrol; geen bronbytes in de HTTP-response',async()=>{
 const fields={ID:'fixture','Date and Time':'2026-11-03 - 06:00 PM',Division:'Medisch',Type:'Testmelding',Zone:'Fixture',Priority:'Low',Description:'Fictieve beschrijving','Affected Person':'1'};
 const csv=ONTRACK_HEADERS.join(',')+'\n'+ONTRACK_HEADERS.map(key=>fields[key]||'').join(',');
 const result=await run({own:{...profile,role:'gebruiker',modules:['reports']},action:'report-web',method:'POST',body:{slug:'jungle'},reportSource:{csvBase64:Buffer.from(csv).toString('base64'),modifiedAt:'2026-11-04T00:00:00Z',sourceHash:createHash('sha256').update(csv).digest('hex'),show:{key:'Jungle_Ziggo-Dome_03112026',name:'Jungle',venue:'Ziggo Dome',date:'2026-11-03',sourceUrl:'https://www.mojo.nl/concerten/jungle'},series:{dates:['2026-11-03'],shows:[{concertId:'Jungle_Ziggo-Dome_03112026',date:'2026-11-03'}]}}});
 assert.equal(result.response.code,200);assert.equal(result.response.data.report.incidents.length,1);assert.equal(result.calls.some(call=>call[0]==='shows'),false);assert.match(result.response.headers['Cache-Control'],/no-store/);assert.equal(JSON.stringify(result.response.data).includes('csvBase64'),false);
});

test('Operationele beoordeling vereist MFA/Shows en bindt actor uitsluitend aan de sessie',async()=>{
 const body={concertId:'Test',source:{revision:'a'.repeat(64),sha256:'b'.repeat(64)},riskId:'R01',revision:0,riskLevel:'medium',riskNote:'Synthetische maatregel'};
 for(const config of [{auth:false},{aal:'aal1'},{own:{...profile,modules:['reports']}}]){const result=await run({action:'operational-risk',method:'POST',body,...config});assert.ok([401,403].includes(result.response.code));assert.equal(result.calls.some(call=>call[0]==='shows'),false);}
 const ok=await run({action:'operational-risk',method:'POST',body});assert.equal(ok.response.code,200);assert.equal(ok.calls.find(call=>call[0]==='shows')[1],'risk-operational-save');assert.equal(ok.calls.find(call=>call[0]==='shows')[2].actor,id);
 for(const change of [{actor:other},{riskNote:''},{riskLevel:null}]){const rejected=await run({action:'operational-risk',method:'POST',body:{...body,...change}});assert.equal(rejected.response.code,400);assert.equal(rejected.calls.some(call=>call[0]==='shows'),false);}
});


test('Maatregel-API vereist sessie/MFA/Shows, bindt actor serverzijdig en weigert vrije bestanden',async()=>{
 const body={operation:'read',concertId:'Test',measureId:'production:barrier_layout'};
 for(const extra of [{auth:false},{aal:'aal1'},{own:{...profile,modules:['reports']}}]){const result=await run({action:'measure',method:'POST',body,...extra});assert.ok([401,403].includes(result.response.code));assert.equal(result.calls.some(call=>call[0]==='shows'),false);}
 const ok=await run({action:'measure',method:'POST',body});assert.equal(ok.response.code,200);const called=ok.calls.find(call=>call[0]==='shows');assert.equal(called[1],'measure-read');assert.equal(called[2].actor,id);
 for(const change of [{actor:other},{fileId:'free'},{measureId:'../secret'}])assert.equal((await run({action:'measure',method:'POST',body:{...body,...change}})).response.code,400);
 const bytes=Buffer.from('<html>not pdf</html>'),upload={operation:'upload',concertId:'Test',measureId:'production:barrier_layout',revision:0,basis:'basis',uploadId:'11111111-1111-4111-8111-111111111111',fileName:'fake.pdf',mime:'application/pdf',base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};const rejected=await run({action:'measure',method:'POST',body:upload});assert.equal(rejected.response.code,400);assert.equal(rejected.calls.some(call=>call[0]==='shows'),false);
});


test('Maatregel afronden vereist ook via de API een expliciete briefingkeuze',async()=>{
 const base={operation:'complete',concertId:'Test',measureId:'production:barrier_layout',revision:0,basis:'basis'};
 for(const data of [{riskLevelAfter:'low',briefing:null},{riskLevelAfter:'low'},{riskLevelAfter:null,briefing:false}]){const result=await run({action:'measure',method:'POST',body:{...base,data}});assert.equal(result.response.code,400);assert.equal(result.calls.some(call=>call[0]==='shows'),false);}
 for(const briefing of [true,false])assert.equal((await run({action:'measure',method:'POST',body:{...base,data:{riskLevelAfter:'low',briefing}}})).response.code,200);
});

test('PDF-meldingen na login vereisen sessie, MFA en Rapportages; de actor komt uitsluitend uit het gecontroleerde account',async()=>{
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker',modules:['shows']}},{own:{...profile,activated:false}}]){const result=await run({action:'report-alerts',...input});assert.ok([401,403].includes(result.response.code));assert.equal(result.calls.some(call=>call[0]==='ontrack-report'),false);}
 const result=await run({action:'report-alerts',own:{...profile,modules:['reports']}});assert.equal(result.response.code,200);assert.deepEqual(result.calls.find(call=>call[0]==='ontrack-report').slice(0,3),['ontrack-report','pdf-alerts',id]);assert.equal(result.calls.some(call=>call[0]==='mail'),false);assert.equal((await run({action:'report-alerts',method:'POST'})).response.code,405);
});


test('Login combineert actuele Drive-controle en sessiecookie in één profielread',async()=>{
 const {response,calls}=await run({action:'login',method:'POST',body:{refreshToken:'synthetic-refresh-token'}});
 assert.equal(response.code,200);assert.equal(response.data.profile.id,id);assert.match(response.headers['Set-Cookie'],/HttpOnly; Secure/);assert.equal(calls.filter(call=>call[0]==='self').length,1);assert.equal(calls[0][2].includeHome,true);
});
test('Actieve replaypoort weigert direct Auth-token zonder applicatiebewijs vóór Drive',async()=>{
 const {response,calls}=await run({action:'session',configuration:{...env,MFA_REPLAY_ENABLED:'true'}});
 assert.equal(response.code,403);assert.equal(response.data.code,'MFA_REQUIRED');assert.equal(calls.length,0);
});


test('Mailhistorie vereist beheerder en Rapportages; ontvangst schrijft uitsluitend gevalideerde actor',async()=>{
 const denied=await run({action:'report-email-history',own:{...profile,role:'gebruiker',modules:['reports']}});assert.equal(denied.response.code,403);assert.equal(denied.calls.some(call=>call[0]==='ontrack-report'),false);
 const history=await run({action:'report-email-history'});assert.equal(history.response.code,200);assert.deepEqual(history.calls.find(call=>call[0]==='ontrack-report').slice(1),['email-history',id,{}]);
 const body={concertId:'Synthetic_show',token:'a'.repeat(64)},opened=await run({action:'report-email-open',method:'POST',body,own:{...profile,role:'gebruiker',modules:['reports']}});assert.equal(opened.response.code,200);assert.deepEqual(opened.calls.find(call=>call[0]==='ontrack-report').slice(1),['email-open',id,body]);
 const forged=await run({action:'report-email-open',method:'POST',body:{...body,actor:other}});assert.equal(forged.response.code,400);assert.equal(forged.calls.some(call=>call[0]==='ontrack-report'),false);
 const revoked=await run({action:'report-email-history',own:{...profile,role:'gebruiker',modules:['shows']}});assert.equal(revoked.response.code,403);assert.equal(revoked.calls.some(call=>call[0]==='ontrack-report'),false);
});

test('Onvolledige organisatie en externe beheerder worden vóór Auth-creatie/mail geweigerd',async()=>{
 for(const extra of [{company:undefined},{company:'TSC Crowd Management',jobTitle:'CMT Leider',role:'gebruiker'},{company:'Ziggo Dome',jobTitle:'Management',role:'beheerder'}]){const {response,calls}=await run({method:'POST',body:{...profile,...extra}});assert.equal(response.code,400);assert.equal(calls.some(call=>['createAuth','invite','create','mail'].includes(call[0])),false);}
 const {response,calls}=await run({method:'POST',body:{...profile,company:'AFAS Live',jobTitle:'Management',role:undefined}});assert.equal(response.code,201);assert.equal(calls.find(call=>call[0]==='create')[2].profile.company,'AFAS Live');assert.equal(calls.find(call=>call[0]==='create')[2].profile.role,'gebruiker');assert.deepEqual(Object.keys(calls.find(call=>call[0]==='createAuth')[1]).sort(),['email','email_confirm']);
});

test('Private testmailconfiguratie verlaat de server niet via het accountprofiel',async()=>{
 const own={...profile,role:'superbeheerder',emailTestCopyTo:'test-copy@example.invalid'};
 const session=await run({action:'session',own});assert.equal(session.response.code,200);assert.equal(session.response.data.profile.emailTestCopyTo,undefined);
 const catalog=await run({action:'email',own});assert.equal(catalog.response.code,200);assert.deepEqual(catalog.response.data.recipients,[own.email,'test-copy@example.invalid']);
 const ordinary=await run({action:'email',own:{...own,role:'beheerder'}});assert.equal(ordinary.response.code,200);assert.deepEqual(ordinary.response.data.recipients,[own.email]);
});

test('Beheerder kopieert eenmalige activeringslink zonder mail, opslag of profielwijziging',async()=>{
 for(const confirmedAt of [null,'2026-10-31']){
  const {response,calls}=await run({method:'PATCH',body:{id:other,operation:'activation-link'},confirmedAt,configuration:{...env,RESEND_API_KEY:undefined}});
  assert.equal(response.code,200);assert.equal(calls.find(c=>c[0]==='invite')[1].type,confirmedAt?'recovery':'invite');
  const url=new URL(response.data.activationUrl);assert.equal(url.origin,'https://esmojo.nl');assert.equal(url.search,'');assert.ok(url.hash.startsWith('#/activeren?token='));
  assert.equal(calls.some(c=>['mail','create','update','deleteAuth','createAuth','password'].includes(c[0])),false);
  assert.match(response.headers['Cache-Control'],/no-store/);
 }
});
test('Kopieerlink blijft afgeschermd voor gewone gebruikers, MFA-fouten, actieve/geblokkeerde of onbekende accounts',async()=>{
 for(const options of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{targetProfile:{...profile,id:other,activated:true}},{targetProfile:{...profile,id:other,activated:false,disabled:true}}]){
  const {response,calls}=await run({method:'PATCH',body:{id:other,operation:'activation-link'},...options});assert.ok([401,403,409].includes(response.code));assert.equal(calls.some(c=>c[0]==='invite'),false);
 }
 for(const body of [{id:'invalid',operation:'activation-link'},{id:other,operation:'activation-link',email:'elsewhere@example.invalid'}]){const {response,calls}=await run({method:'PATCH',body});assert.equal(response.code,400);assert.equal(calls.some(c=>c[0]==='invite'),false);}
});


test('Showbeheer aanmaken en status blijven achter account, MFA, activering en Shows-rechten',async()=>{
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,activated:false}},{own:{...profile,role:'gebruiker',modules:['artists']}}]){
  const {response,calls}=await run({...input,action:'show-management',method:'POST',body:{operation:'create',concertId:'Fixture'}});assert.ok([401,403].includes(response.code));assert.ok(!calls.some(call=>call[0]==='showManagement'));
 }
 for(const operation of ['status','create']){const body={operation,concertId:'Fixture'},result=await run({action:'show-management',method:'POST',body});assert.equal(result.response.code,200);assert.deepEqual(result.calls.find(call=>call[0]==='showManagement'),['showManagement',body]);}
 const result=await run({action:'show-management',method:'GET'});assert.equal(result.response.code,405);assert.ok(!result.calls.some(call=>call[0]==='showManagement'));
});

test('Dataverse-proef vereist account, MFA en actuele beheerder; geen providerverzoek bij weigering',async()=>{
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,activated:false}},{own:{...profile,role:'gebruiker'}}]){const result=await run({...input,action:'dataverse-test',method:'POST',body:{operation:'status'}});assert.ok([401,403].includes(result.response.code));assert.ok(!result.calls.some(call=>call[0]==='dataverseTest'));}
 const good=await run({action:'dataverse-test',method:'POST',body:{operation:'status'}});assert.equal(good.response.code,200);assert.equal(good.response.data.code,'DATAVERSE_FORBIDDEN');assert.equal(good.calls.filter(call=>call[0]==='dataverseTest').length,1);
 for(const input of [{method:'GET'},{method:'POST',body:{operation:'create'}},{method:'POST',body:{operation:'status',url:'https://evil.invalid'}}]){const result=await run({action:'dataverse-test',...input});assert.ok([400,405].includes(result.response.code));assert.ok(!result.calls.some(call=>call[0]==='dataverseTest'));}
});

test('Dataverse table-read accepteert alleen vaste operatie achter dezelfde beheerderbeveiliging',async()=>{
 const result=await run({action:'dataverse-test',method:'POST',body:{operation:'table-read'}});assert.equal(result.response.code,200);assert.deepEqual(result.calls.find(call=>call[0]==='dataverseTest'),['dataverseTest',{table:true}]);
 const denied=await run({own:{...profile,role:'gebruiker'},action:'dataverse-test',method:'POST',body:{operation:'table-read'}});assert.equal(denied.response.code,403);assert.ok(!denied.calls.some(call=>call[0]==='dataverseTest'));
 const extra=await run({action:'dataverse-test',method:'POST',body:{operation:'table-read',table:'other'}});assert.equal(extra.response.code,400);assert.ok(!extra.calls.some(call=>call[0]==='dataverseTest'));
});

test('Dataverse-schrijfproef vereist expliciete vaste actie en beheerder/MFA, zonder vrije recordwaarden',async()=>{
 const body={operation:'table-write'},result=await run({action:'dataverse-test',method:'POST',body});assert.equal(result.response.code,200);assert.deepEqual(result.calls.find(call=>call[0]==='dataverseTest'),['dataverseTest',{table:true,write:true}]);
 for(const input of [{own:{...profile,role:'gebruiker'}},{auth:false},{aal:'aal1'},{body:{operation:'table-write',recordId:'other'}}]){const denied=await run({action:'dataverse-test',method:'POST',body,...input});assert.ok([400,401,403].includes(denied.response.code));assert.ok(!denied.calls.some(call=>call[0]==='dataverseTest'));}
});


test('datatransitie vereist beheerder, Shows, geactiveerd account en MFA vóór brongebruik',async()=>{
 let calls=0;const transitionService=async()=>{calls++;return{shows:[]};};
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,activated:false}},{own:{...profile,modules:['artists']}}]){
  const {response}=await run({...input,action:'data-transition',method:'POST',body:{operation:'list'},transitionService});assert.ok([401,403].includes(response.code));
 }
 assert.equal(calls,0);
 const good=await run({action:'data-transition',method:'POST',body:{operation:'list'},transitionService});assert.equal(good.response.code,200);assert.equal(calls,1);assert.match(good.response.headers['Cache-Control'],/no-store/);
 const denied=await run({action:'data-transition',method:'GET',transitionService});assert.equal(denied.response.code,405);assert.equal(calls,1);
 const failure=await run({action:'data-transition',method:'POST',body:{operation:'list'},transitionService:async()=>{throw Error('secret provider data');}});assert.equal(failure.response.code,503);assert.doesNotMatch(JSON.stringify(failure.response.data),/secret provider/);
});


test('keuzelijstsetup vereist admin/Shows/activatie/MFA en laat providerfouten niet door',async()=>{
 let count=0;const choiceService=async()=>{count++;return{choices:[]};};
 for(const params of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,activated:false}},{own:{...profile,modules:['artists']}},{origin:'https://evil.invalid'}]){
  const {response}=await run({...params,action:'dataverse-choices',method:'POST',body:{operation:'list'},choiceService});assert.ok([401,403].includes(response.code));
 }
 assert.equal(count,0);
 const good=await run({action:'dataverse-choices',method:'POST',body:{operation:'list'},choiceService});assert.equal(good.response.code,200);assert.equal(count,1);assert.match(good.response.headers['Cache-Control'],/no-store/);
 const denied=await run({action:'dataverse-choices',method:'GET',choiceService});assert.equal(denied.response.code,405);assert.equal(count,1);
 const fail=await run({action:'dataverse-choices',method:'POST',body:{operation:'list'},choiceService:async()=>{throw Error('private provider credentials');}});assert.equal(fail.response.code,503);assert.doesNotMatch(JSON.stringify(fail.response.data),/private provider credentials/);
 const invalid=await run({action:'dataverse-choices',method:'POST',body:{operation:'delete',name:'arbitrary'}});assert.equal(invalid.response.code,400);
});


test('tabelsetup vereist actuele admin/Shows/activatie/MFA en accepteert geen vrije metadata',async()=>{
 let calls=0;const tableService=async()=>{calls++;return{tableCount:30,steps:[]};};
 for(const params of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,activated:false}},{own:{...profile,modules:['artists']}},{origin:'https://evil.invalid'}]){
  const {response}=await run({...params,action:'dataverse-tables',method:'POST',body:{operation:'plan'},tableService});assert.ok([401,403].includes(response.code));
 }
 assert.equal(calls,0);const ok=await run({action:'dataverse-tables',method:'POST',body:{operation:'plan'},tableService});assert.equal(ok.response.code,200);assert.equal(calls,1);assert.match(ok.response.headers['Cache-Control'],/no-store/);
 assert.equal((await run({action:'dataverse-tables',method:'GET',tableService})).response.code,405);assert.equal(calls,1);
 const bad=await run({action:'dataverse-tables',method:'POST',body:{operation:'apply',stepId:'arbitrary',body:{}}});assert.equal(bad.response.code,400);
 const failure=await run({action:'dataverse-tables',method:'POST',body:{operation:'plan'},tableService:async()=>{throw Error('private provider data');}});assert.equal(failure.response.code,503);assert.doesNotMatch(JSON.stringify(failure.response.data),/private provider data/);
});

test('table setup exposes temporary processing safely and keeps permanent failures nonretryable',async()=>{
 for(const [code,status] of [['TABLE_PUBLISH_UNCONFIRMED',200],['SETUP_TEMPORARY',200],['SETUP_THROTTLED',200],['TABLE_CREATE_REJECTED',424],['CHOICE_FORBIDDEN',403],['CHOICE_CONFIG',424]]){
  const result=await run({action:'dataverse-tables',method:'POST',body:{operation:'apply',stepId:'fixed'},tableService:async()=>{throw Object.assign(Error(code),{retryAfterSeconds:12});}});
  assert.equal(result.response.code,status);
  if(status===200){assert.equal(result.response.data.reason,'METADATA_PROCESSING');assert.equal(result.response.data.verified,false);assert.equal(result.response.data.retryAfterSeconds,12);}
 }
});

test('full Shows migration requires admin, current Shows access, MFA and allowed Origin; safe errors only',async()=>{
 let calls=0;const migrationService=async(body,actor)=>{calls++;assert.equal(actor,id);return{status:'blocked',reason:'KEY_INDEX_PENDING'};};
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,modules:['artists']}},{origin:'https://untrusted.invalid'}]){const {response}=await run({...input,action:'show-migration',method:'POST',body:{operation:'start'},migrationService});assert.ok([401,403].includes(response.code));}assert.equal(calls,0);
 const good=await run({action:'show-migration',method:'POST',body:{operation:'start'},migrationService});assert.equal(good.response.code,200);assert.equal(calls,1);assert.match(good.response.headers['Cache-Control'],/no-store/);
 assert.equal((await run({action:'show-migration',method:'GET',migrationService})).response.code,405);
 const bad=await run({action:'show-migration',method:'POST',body:{operation:'start'},migrationService:async()=>{throw Error('private source text and secrets');}});assert.equal(bad.response.code,503);assert.doesNotMatch(JSON.stringify(bad.response.data),/private source|secrets/);
 const conflict=await run({action:'show-migration',method:'POST',body:{operation:'start'},migrationService:async()=>{throw Error('MIGRATION_CONFLICT');}});assert.equal(conflict.response.code,424);
});

test('migration conflict response identifies approved table/columns without source or target content',async()=>{
 const migrationService=async()=>{throw Object.assign(Error('MIGRATION_CONFLICT'),{migration:{table:'esmojo_artiest',differences:[{column:'esmojo_biografieopgehaaldop',reason:'DATETIME_DIFFERENCE',expected:'private source',actual:'private target'}]}});};
 const result=await run({action:'show-migration',method:'POST',body:{operation:'start'},migrationService});assert.equal(result.response.code,424);assert.match(result.response.data.error,/Tabel: Artiest/);assert.equal(result.response.data.details.differences[0].column,'esmojo_biografieopgehaaldop');assert.doesNotMatch(JSON.stringify(result.response.data),/private source|private target|expected|actual/);
});

test('background-task controls require current admin/Shows/MFA and only explicit commands schedule work',async()=>{
 let controls=0,runs=0;const taskService={control:async(body,actor)=>{controls++;assert.equal(actor,id);return{task:body.operation==='status'?null:{status:'queued',type:'shows-migration-v1'}};},run:async()=>{runs++;return{steps:0};}};
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,modules:['artists']}},{origin:'https://untrusted.invalid'}]){const result=await run({...input,action:'background-tasks',method:'POST',body:{operation:'start',type:'shows-migration-v1'},taskService});assert.ok([401,403].includes(result.response.code));}assert.equal(controls,0);
 const status=await run({action:'background-tasks',method:'POST',body:{operation:'status',type:'shows-migration-v1'},taskService});assert.equal(status.response.code,200);assert.equal(runs,0);assert.ok(!status.calls.some(call=>call[0]==='task-background'));
 const start=await run({action:'background-tasks',method:'POST',body:{operation:'start',type:'shows-migration-v1'},taskService});assert.equal(start.response.code,200);assert.equal(runs,1);assert.ok(start.calls.some(call=>call[0]==='task-background'));assert.match(start.response.headers['Cache-Control'],/no-store/);
 assert.equal((await run({action:'background-tasks',method:'GET',taskService})).response.code,405);
});

test('native status-only own profile opens Shows but cannot authorize administrator endpoints',async()=>{
 const own={id,activated:true,disabled:false,modules:['shows']};
 const result=await run({own,action:'show-open',method:'POST',body:{concertId:'Test_Gashouder_15112026'},showResult:{profile:{},tickets:{},risks:{},barrier:{},floor:{}}});assert.equal(result.response.code,200);
 const denied=await run({own,action:'accounts'});assert.equal(denied.response.code,403);
});

test('Reports schema setup requires production admin Reports access and does not reopen legacy migration',async()=>{
 let calls=0;const taskService={control:async input=>{calls++;return{task:{status:'queued',type:input.type}};},run:async()=>({steps:0})},body={operation:'start',type:'reports-schema-v1'},configuration={...env,VERCEL_ENV:'production'};
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,modules:['shows']}},{configuration:{...env,VERCEL_ENV:'development'}},{configuration:{...configuration,MFA_REPLAY_ENABLED:'true'}}]){const result=await run({configuration,action:'background-tasks',method:'POST',body,taskService,...input});assert.ok([401,403].includes(result.response.code),'Reports setup denial returned '+result.response.code);}
 assert.equal(calls,0);
 const showsSource=Object.assign(async()=>{throw Error('No Shows access needed');},{allowLegacyMaintenance:async()=>{throw Error('STORAGE_ACTIVE');}});
 const result=await run({configuration,own:{...profile,modules:['reports']},action:'background-tasks',method:'POST',body,taskService,showsSource});assert.equal(result.response.code,200);assert.equal(calls,1);
});

test('Reports migration requires production admin Reports access and does not reopen legacy migration',async()=>{
 let calls=0;const taskService={control:async input=>{calls++;return{task:{status:'queued',type:input.type}};},run:async()=>({steps:0})},body={operation:'start',type:'reports-migration-v1'},configuration={...env,VERCEL_ENV:'production'};
 for(const input of [{auth:false},{aal:'aal1'},{own:{...profile,role:'gebruiker'}},{own:{...profile,modules:['shows']}},{configuration:{...env,VERCEL_ENV:'development'}},{configuration:{...configuration,MFA_REPLAY_ENABLED:'true'}}]){const result=await run({configuration,action:'background-tasks',method:'POST',body,taskService,...input});assert.ok([401,403].includes(result.response.code),'Reports setup denial returned '+result.response.code);}
 assert.equal(calls,0);
 const showsSource=Object.assign(async()=>{throw Error('No Shows access needed');},{allowLegacyMaintenance:async()=>{throw Error('STORAGE_ACTIVE');}});
 const result=await run({configuration,own:{...profile,modules:['reports']},action:'background-tasks',method:'POST',body,taskService,showsSource});assert.equal(result.response.code,200);assert.equal(calls,1);
});
