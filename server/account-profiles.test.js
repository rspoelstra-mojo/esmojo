import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import vm from 'node:vm';
import { createProfiles } from './account-profiles.js';

const secret = 'test-only-secret-'.repeat(4);
const admin = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const profile = (id, role = 'beheerder') => ({ id, email: `${id}@example.invalid`, firstName: 'Test', lastName: 'User', company:'MOJO Concerts',jobTitle: 'Event Safety Manager', role, activated: true, disabled: false });
function harness(profiles = [profile(admin), profile(user, 'gebruiker')], { exists = true, failWrite = false,superAdminId,copyTo } = {}) {
  let state = JSON.stringify({profiles,nonces:{},...(superAdminId?{superAdminId,emailTestCopy:{actor:superAdminId,address:copyTo},securityIdentityV1:true}:{})});
  let writes = 0, locked = false;
  const file = { getBlob: () => ({ getDataAsString: () => state }), setContent: value => { assert.ok(locked); state = value; writes++; } };
  const context = vm.createContext({ Date, JSON, Number, Object,
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    LockService: { getScriptLock: () => ({ tryLock: () => { locked = true; return true; }, releaseLock: () => { locked = false; } }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (algorithm, text) => [...createHash(algorithm).update(text).digest()], computeHmacSha256Signature: (message, key) => [...createHmac('sha256', key).update(message).digest()], newBlob: (content, mimeType, name) => ({ content, mimeType, name }) },
    DriveApp: { getFolderById: () => ({ isTrashed: () => false, getFilesByName: () => { let used = !exists; return { hasNext: () => !used, next: () => { used = true; return file; } }; }, createFile: blob => {
      assert.ok(locked); assert.equal(blob.name, '_esmojo_accounts_v1.json'); assert.equal(blob.mimeType, 'application/json');
      if (failWrite) throw new Error('sensitive-provider-message');
      state = blob.content; exists = true; writes++; return file;
    } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  });
  vm.runInContext(readFileSync(new URL('../google-apps-script/AccountModules.gs',import.meta.url),'utf8'),context);vm.runInContext(readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL('../google-apps-script/AccountEmployment.gs',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../google-apps-script/Accounts.gs', import.meta.url), 'utf8'), context);
  return { send: input => context.doPost({ postData: { contents: JSON.stringify(input) } }), state: () => JSON.parse(state), writes: () => writes };
}
function signed(body, extra = {}) {
  const timestamp = Date.now(), nonce = Math.random().toString(16).slice(2).padEnd(32, '0');
  const serialized = JSON.stringify(body);
  const digest = createHash('sha256').update(serialized).digest('hex');
  return { action: 'accounts', body: serialized, timestamp, nonce, signature: createHmac('sha256', secret).update(`accounts\n${timestamp}\n${nonce}\n${digest}`).digest('hex'), ...extra };
}
test('Drive weigert gewijzigde payload, verlopen verzoeken en onjuiste HMAC', () => {
  const h = harness(); const request = signed({ operation: 'list', actor: admin });
  for (const changed of [{ ...request, body: JSON.stringify({ operation: 'list', actor: user }) }, { ...request, timestamp: Date.now() - 180000 }, { ...request, signature: '0'.repeat(64) }]) assert.equal(h.send(changed).ok, false);
  assert.equal(h.writes(), 0);
});
test('Drive controleert rollen onafhankelijk van de server en geeft geen fotos in de lijst', () => {
  const h = harness(); assert.equal(h.send(signed({ operation: 'list', actor: user })).ok, false);
  const result = h.send(signed({ operation: 'list', actor: admin })); assert.equal(result.ok, true); assert.equal(result.data.length, 2); assert.equal('photo' in result.data[0], false);
});
test('eigen beheerder en laatste beheerder kunnen niet worden verwijderd of gedegradeerd', () => {
  const h = harness();
  for (const operation of ['disable', 'delete', 'update']) assert.equal(h.send(signed({ operation, actor: admin, id: admin, profile: profile(admin, 'gebruiker') })).ok, false);
  assert.equal(h.writes(), 0);
});
test('herhaalde schrijfverzoeken worden niet nogmaals uitgevoerd', () => {
  const h = harness(); const request = signed({ operation: 'update', actor: admin, id: user, profile: { ...profile(user, 'gebruiker'), firstName: 'Nieuw' } });
  assert.equal(h.send(request).ok, true); assert.equal(h.send(request).ok, false); assert.equal(h.writes(), 1); assert.equal(h.state().profiles[1].firstName, 'Nieuw');
});
test('geblokkeerde en niet-geactiveerde accounts kunnen geen beheeracties uitvoeren', () => {
  for (const override of [{ disabled: true }, { activated: false }]) {
    const h = harness([{ ...profile(admin), ...override }]); assert.equal(h.send(signed({ operation: 'list', actor: admin })).ok, false);
  }
});
test('bootstrap weigert een bestaand register te overschrijven', () => {
  const h = harness(); assert.equal(h.send(signed({ operation: 'bootstrap', actor: user, profile: profile(user) })).ok, false); assert.equal(h.writes(), 0);
});
test('eerste beheerder maakt een nieuw JSON-register via een blob aan', () => {
  const h = harness([], { exists: false });
  const result = h.send(signed({ operation: 'bootstrap', actor: 'operator', profile: profile(admin) }));
  assert.equal(result.ok, true); assert.equal(h.writes(), 1); assert.equal(h.state().profiles[0].id, admin); assert.equal(h.state().profiles[0].activated, false);
});
test('mislukte eerste opslag geeft de schrijffase aan zonder providerdetails', () => {
  const h = harness([], { exists: false, failWrite: true });
  const result = h.send(signed({ operation: 'bootstrap', actor: 'operator', profile: profile(admin) }));
  assert.equal(result.code, 'DRIVE_WRITE'); assert.equal(JSON.stringify(result).includes('sensitive-provider-message'), false); assert.equal(h.writes(), 0);
});
test('ongeldig eerste profiel wordt van een schrijffout onderscheiden', () => {
  const h = harness([], { exists: false });
  assert.equal(h.send(signed({ operation: 'bootstrap', actor: 'operator', profile: { ...profile(admin), jobTitle: '' } })).code, 'PROFILE_INVALID'); assert.equal(h.writes(), 0);
});
test('serveradapter ondertekent ook de payload en actor', async () => {
  const h = harness();
  const request = createProfiles({ env: { GOOGLE_DRIVE_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec', GOOGLE_DRIVE_SHARED_SECRET: secret }, request: async (_, options) => Response.json(h.send(JSON.parse(options.body))) });
  assert.equal((await request('self', admin)).id, admin); await assert.rejects(request('list', user));
});
test('Drive laat een gebruiker alleen de eigen foto wijzigen en behoudt de andere velden', () => {
  const h = harness(); const before = h.state().profiles[1];
  const result = h.send(signed({ operation: 'photo', actor: user, photo: 'data:image/jpeg;base64,AAAA' }));
  assert.equal(result.ok, true); assert.equal(result.data.id, user);
  assert.deepEqual(h.state().profiles[1], { ...before, modules:['shows','artists','reports'], photo: 'data:image/jpeg;base64,AAAA' });
  assert.equal(h.state().profiles[0].photo, undefined);
});
test('Drive weigert gerichte foto-aanpassingen van een ander en rolwijzigingen', () => {
  for (const extra of [{ id: admin }, { role: 'beheerder' }, { profile: { role: 'beheerder' } }]) {
    const h = harness(); assert.equal(h.send(signed({ operation: 'photo', actor: user, photo: 'data:image/jpeg;base64,AAAA', ...extra })).ok, false);
    assert.equal(h.writes(), 0);
  }
});
test('Drive weigert SVG, te grote fotos en niet-geactiveerde profielen', () => {
  for (const photo of ['data:image/svg+xml;base64,AAAA', 'x'.repeat(100001)]) {
    const h = harness(); assert.equal(h.send(signed({ operation: 'photo', actor: user, photo })).ok, false); assert.equal(h.writes(), 0);
  }
  const h = harness([{ ...profile(user, 'gebruiker'), activated: false }]);
  assert.equal(h.send(signed({ operation: 'photo', actor: user, photo: 'data:image/jpeg;base64,AAAA' })).ok, false);
});
test('editorinstelling ondertekent het profiel, verwijdert tijdelijke invoer en logt geen persoonsgegevens', () => {
  for (const ok of [true, false]) {
    const input = profile(admin);
    const properties = { ESMOJO_SHARED_SECRET: secret, ESMOJO_FIRST_ADMIN_PROFILE: JSON.stringify(input) };
    const messages = [];
    const context = vm.createContext({
      console: { log: message => messages.push(message) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key], deleteProperty: key => { delete properties[key]; } }) },
      Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha256' }, getUuid: () => admin,
        computeDigest: (algorithm, text) => [...createHash(algorithm).update(text).digest()], computeHmacSha256Signature: (message, key) => [...createHmac('sha256', key).update(message).digest()] },
      esmojoAccounts_: request => {
        const body = JSON.parse(request.body);
        assert.equal(body.operation, 'bootstrap'); assert.equal(body.profile.id, admin); assert.equal(body.profile.role, 'beheerder');
        const digest = createHash('sha256').update(request.body).digest('hex');
        assert.equal(request.signature, createHmac('sha256', secret).update(`accounts\n${request.timestamp}\n${request.nonce}\n${digest}`).digest('hex'));
        return { getContent: () => JSON.stringify({ ok, code: ok ? undefined : 'CONFLICT' }) };
      },
    });
    vm.runInContext(readFileSync(new URL('../google-apps-script/Setup.gs', import.meta.url), 'utf8'), context);
    if (ok) { context.setupFirstAdministrator(); assert.equal(properties.ESMOJO_FIRST_ADMIN_PROFILE, undefined); }
    else { assert.throws(() => context.setupFirstAdministrator(), /bestaat al/); assert.ok(properties.ESMOJO_FIRST_ADMIN_PROFILE); }
    for (const message of messages) { assert.equal(message.includes(input.email), false); assert.equal(message.includes(input.id), false); }
  }
});
test('Drive bewaart modulekeuzes alleen via beheer en behoudt bestaande keuzes bij een update zonder moduleveld',()=>{
 const h=harness();let result=h.send(signed({operation:'update',actor:admin,id:user,profile:{...profile(user,'gebruiker'),modules:['reports']}}));assert.equal(result.ok,true);assert.deepEqual(h.state().profiles[1].modules,['reports']);
 result=h.send(signed({operation:'update',actor:admin,id:user,profile:{...profile(user,'gebruiker'),jobTitle:'Productiemanager'}}));assert.equal(result.ok,true);assert.deepEqual(h.state().profiles[1].modules,['reports']);
 assert.equal(h.send(signed({operation:'update',actor:user,id:user,profile:{...profile(user,'gebruiker'),modules:['shows','artists','reports']}})).ok,false);
 assert.equal(h.send(signed({operation:'photo',actor:user,photo:'data:image/png;base64,AAAA',modules:['reports']})).ok,false);
 for(const modules of [null,['reports','reports'],['onbekend']])assert.equal(h.send(signed({operation:'update',actor:admin,id:user,profile:{...profile(user,'gebruiker'),modules}})).ok,false);
 assert.deepEqual(h.state().profiles[1].modules,['reports']);
 result=h.send(signed({operation:'update',actor:admin,id:user,profile:{...profile(user,'gebruiker'),modules:[]}}));assert.equal(result.ok,true);assert.deepEqual(h.state().profiles[1].modules,[]);
});
test('Private vaste beheerder-ID behoudt superrol; geen website-/Drive-toekenning aan anderen of degradatie door gewone beheerders',()=>{
 const richard={...profile(user,'superbeheerder'),email:'super-admin@example.invalid',modules:[]},h=harness([profile(admin),richard],{superAdminId:user,copyTo:'test-copy@example.invalid'});
 const initial=h.send(signed({operation:'self',actor:user}));assert.equal(initial.ok,true);assert.equal(initial.data.role,'superbeheerder');assert.equal(h.state().profiles[1].role,'superbeheerder');assert.equal(initial.data.emailTestCopyTo,'test-copy@example.invalid');assert.equal(h.writes(),1);
 assert.equal(h.send(signed({operation:'self',actor:user})).data.role,'superbeheerder');assert.equal(h.writes(),1);
 for(const operation of ['disable','delete'])assert.equal(h.send(signed({operation,actor:admin,id:user})).ok,false);
 assert.equal(h.send(signed({operation:'update',actor:admin,id:user,profile:{...richard,role:'beheerder'}})).ok,false);
 assert.equal(h.send(signed({operation:'update',actor:admin,id:admin,profile:{...profile(admin),role:'superbeheerder'}})).ok,false);
 const copy={...profile('33333333-3333-4333-8333-333333333333'),role:'superbeheerder'};assert.equal(h.send(signed({operation:'create',actor:user,profile:copy})).ok,false);
 assert.equal(h.send(signed({operation:'update',actor:user,id:user,profile:{...richard,role:'superbeheerder',jobTitle:'CMT Leider'}})).ok,true);assert.equal(h.state().profiles[1].role,'superbeheerder');
});

test('Bedrijf en functie worden in Drive onafhankelijk gecontroleerd, externe rollen zijn gebruiker',()=>{
 const third='33333333-3333-4333-8333-333333333333';
 for(const extra of [{company:undefined},{company:'TSC Crowd Management',jobTitle:'Event Safety Manager',role:'gebruiker'},{company:'AFAS Live',jobTitle:'Management',role:'beheerder'}]){const h=harness();assert.equal(h.send(signed({operation:'create',actor:admin,profile:{...profile(third),...extra}})).code,'PROFILE_INVALID');assert.equal(h.writes(),0);}
 const h=harness();assert.equal(h.send(signed({operation:'create',actor:admin,profile:{...profile(third,'gebruiker'),company:'TSC Crowd Management',jobTitle:'Projectleider',modules:['reports']}})).ok,true);const record=h.state().profiles.find(row=>row.id===third);assert.equal(record.company,'TSC Crowd Management');assert.equal(record.role,'gebruiker');assert.deepEqual(record.modules,['reports']);
 assert.equal(h.send(signed({operation:'update',actor:admin,id:third,profile:{...record,role:'beheerder'}})).code,'PROFILE_INVALID');assert.equal(h.state().profiles.find(row=>row.id===third).role,'gebruiker');
});
test('Bestaande accounts krijgen één keer MOJO zonder functies/rechten te wijzigen; nieuwe externe accounts blijven extern',()=>{
 const old=[profile(admin),{...profile(user,'gebruiker'),jobTitle:'Bestaande functie',modules:['reports']}].map(row=>{const copy={...row};delete copy.company;return copy;}),h=harness(old);
 assert.equal(h.send(signed({operation:'self',actor:user})).data.company,'MOJO Concerts');assert.equal(h.writes(),1);
 assert.deepEqual(h.state().profiles,old.map(row=>({...row,company:'MOJO Concerts',modules:row.modules??['shows','artists','reports']})));assert.equal(h.state().companyMigrationV1,true);
 assert.equal(h.send(signed({operation:'list',actor:admin})).ok,true);assert.equal(h.writes(),1);
 const third='33333333-3333-4333-8333-333333333333';assert.equal(h.send(signed({operation:'create',actor:admin,profile:{...profile(third,'gebruiker'),company:'Insomniac',jobTitle:'Management'}})).ok,true);
 h.send(signed({operation:'self',actor:user}));assert.equal(h.state().profiles.find(row=>row.id===third).company,'Insomniac');assert.equal(h.writes(),2);
});
test('Onbevoegde requests voeren geen bedrijfsmigratie uit; bootstrap kan de externe rolregel niet omzeilen',()=>{
 const old=profile(admin);delete old.company;const h=harness([old,profile(user,'gebruiker')]);assert.equal(h.send(signed({operation:'list',actor:user})).ok,false);assert.equal(h.writes(),0);
 for(const email of ['bootstrap@example.invalid','super-admin@example.invalid']){const fresh=harness([],{exists:false});assert.equal(fresh.send(signed({operation:'bootstrap',actor:'operator',profile:{...profile(admin,'gebruiker'),email,company:'Ziggo Dome',jobTitle:'Management'}})).code,'PROFILE_INVALID');assert.equal(fresh.writes(),0);}
});

test('Beveiligingsmigratie maakt legacytoegang eenmaal expliciet zonder beperkte accounts uit te breiden',()=>{
 const profiles=[profile(admin),{...profile(user,'gebruiker'),modules:['reports']}];
 const h=harness(profiles);const before=h.state();
 const result=h.send(signed({operation:'self',actor:user}));assert.equal(result.ok,true);
 assert.deepEqual(h.state().profiles[0],{...before.profiles[0],modules:['shows','artists','reports']});
 assert.deepEqual(h.state().profiles[1],before.profiles[1]);assert.equal(h.state().moduleMigrationV1,true);
 const writes=h.writes();assert.equal(h.send(signed({operation:'self',actor:user})).ok,true);assert.equal(h.writes(),writes);
});

test('Private mailuitzondering is uitsluitend zichtbaar voor het vaste superaccount',()=>{
 const h=harness([profile(admin),profile(user,'superbeheerder')],{superAdminId:user,copyTo:'test-copy@example.invalid'});
 const own=h.send(signed({operation:'self',actor:admin}));assert.equal(own.data.emailTestCopyTo,undefined);
 const fixed=h.send(signed({operation:'self',actor:user}));assert.equal(fixed.data.emailTestCopyTo,'test-copy@example.invalid');
 assert.equal(JSON.stringify(h.send(signed({operation:'list',actor:admin}))).includes('test-copy@example.invalid'),false);
 assert.equal(h.send(signed({operation:'security-prepare'})).ok,false);
});
test('show authorization-only self keeps current permissions but never returns an avatar or test recipient',()=>{
 const h=harness([{...profile(admin,'superbeheerder'),photo:'data:image/jpeg;base64,AAAA',modules:['shows']},{...profile(user,'gebruiker'),modules:[]}],{superAdminId:admin,copyTo:'test-copy@example.invalid'});
 const full=h.send(signed({operation:'self',actor:admin}));assert.equal(full.ok,true);assert.ok(full.data.photo);const writes=h.writes();
 const compact=h.send(signed({operation:'self',actor:admin,authorizationOnly:true}));assert.equal(compact.ok,true);for(const key of ['id','role','activated','disabled','modules'])assert.deepEqual(compact.data[key],full.data[key]);
 assert.equal('photo'in compact.data,false);assert.equal('emailTestCopyTo'in compact.data,false);assert.equal(h.writes(),writes);
 h.send(signed({operation:'update',actor:admin,id:user,profile:{...profile(user,'gebruiker'),modules:['reports']}}));
 assert.deepEqual(h.send(signed({operation:'self',actor:user,authorizationOnly:true})).data.modules,['reports']);
 const invalid=signed({operation:'self',actor:admin,authorizationOnly:true});invalid.signature='0'.repeat(64);assert.equal(h.send(invalid).ok,false);
});
