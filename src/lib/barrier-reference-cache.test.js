import {test} from 'node:test';import assert from 'node:assert/strict';import {createBarrierReferenceCache} from './barrier-reference-cache.js';
const profile={id:'synthetic',role:'gebruiker',activated:true,modules:['shows']},type='seated',data={type,mime:'image/png',sha256:'a'.repeat(64),base64:'AQID'},manifest={seated:{size:3,sha256:'a'.repeat(64)}};
test('Geen afbeelding vóór Shows-toegang; gedeelde aanvraag en revoke bij afmelden/moduleverlies',async()=>{
 let calls=0;const revoked=[],cache=createBarrierReferenceCache({manifest,request:async()=>{calls++;return data;},createUrl:()=> 'blob:synthetic',revokeUrl:url=>revoked.push(url)});
 await assert.rejects(cache.load(type),/FORBIDDEN/);assert.equal(calls,0);cache.bind(profile);assert.deepEqual(await Promise.all([cache.load(type),cache.load(type)]),['blob:synthetic','blob:synthetic']);assert.equal(calls,1);
 cache.bind({...profile,modules:['reports']});assert.deepEqual(revoked,['blob:synthetic']);await assert.rejects(cache.load(type),/FORBIDDEN/);
});
test('Late respons na afmelden wordt niet zichtbaar of als blob bewaard; fout is opnieuw opvraagbaar',async()=>{
 let resolve,urls=0;const cache=createBarrierReferenceCache({manifest,request:()=>new Promise(done=>resolve=done),createUrl:()=>{urls++;return'blob:test';}});cache.bind(profile);const pending=cache.load(type);await Promise.resolve();cache.clear();resolve(data);await assert.rejects(pending,/SESSION_CHANGED/);assert.equal(urls,0);
 const bad=createBarrierReferenceCache({manifest,request:async()=>({...data,base64:'AAAAAA'})});bad.bind(profile);await assert.rejects(bad.load(type),/ATTACHMENT_INVALID/);
});
