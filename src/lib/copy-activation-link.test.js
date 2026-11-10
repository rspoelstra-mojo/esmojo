import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyActivationLink} from './copy-activation-link.js';
const url='https://esmojo.nl/#/activeren?token=synthetic-one-time-token&type=invite';
test('Expliciete kopieeractie vraagt eenmaal een link en schrijft alleen die URL naar klembord',async()=>{
 let generated=0,copied=null;const result=await copyActivationLink(async()=>{generated++;return{activationUrl:url};},{clipboard:{writeText:async value=>{copied=value;}},prompt:()=>assert.fail('Geen dialoog bij geslaagd kopiëren')});
 assert.equal(generated,1);assert.equal(copied,url);assert.equal(result,true);
});
test('Geblokkeerd klembord biedt dezelfde tijdelijke link voor handmatig kopiëren, zonder opnieuw genereren',async()=>{
 let generated=0,manual=null;const result=await copyActivationLink(async()=>{generated++;return{activationUrl:url};},{clipboard:{writeText:async()=>{throw Error('NotAllowedError');}},prompt:(_label,value)=>{manual=value;return null;}});
 assert.equal(result,false);assert.equal(generated,1);assert.equal(manual,url);
});
test('Navigatie en mislukte of ongeldige API-uitkomst kopiëren geen verouderde of willekeurige URL',async()=>{
 const clipboard={writeText:()=>assert.fail('Niet kopiëren')};assert.equal(await copyActivationLink(async()=>({activationUrl:url}),{active:()=>false,clipboard}),false);
 for(const activationUrl of [undefined,'https://elsewhere.invalid/#/activeren?token=x&type=invite','https://esmojo.nl/activeren?token=x&type=invite'])await assert.rejects(copyActivationLink(async()=>({activationUrl}),{clipboard}),/kon niet/);
 await assert.rejects(copyActivationLink(async()=>{throw Error('API_ERROR');},{clipboard}),/API_ERROR/);
});
