import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accountModules,validateAccountModules,hasModule,moduleForPage} from '../shared/account-modules.js';
test('Alle acht combinaties van modules blijven onafhankelijk, inclusief geen modules en beheerders',()=>{
 for(let mask=0;mask<8;mask++)for(const role of ['gebruiker','beheerder']){
  const modules=accountModules.filter((_,i)=>mask&(1<<i)).map(module=>module.id),profile={modules,role};
  for(const module of accountModules)assert.equal(hasModule(profile,module.id),modules.includes(module.id));
 }
 for(const module of accountModules)assert.equal(hasModule({},module.id),true);
 assert.equal(moduleForPage('shows'),'shows');assert.equal(moduleForPage('artiest'),'artists');assert.equal(moduleForPage('statistieken'),'reports');assert.equal(moduleForPage('rapportages'),'reports');assert.equal(moduleForPage('account'),null);
});
test('Ongeldige modules falen gesloten; de Drive-validator is exact dezelfde implementatie',()=>{
 for(const modules of [null,'reports',{},['reports','reports'],['admin'],['reports','onbekend']]){
  assert.throws(()=>validateAccountModules(modules),/VALIDATION/);for(const module of accountModules)assert.equal(hasModule({modules},module.id),false);
 }
 assert.deepEqual(validateAccountModules(['reports','shows']),['shows','reports']);assert.equal(hasModule({disabled:true},'reports'),false);
 assert.equal(readFileSync('google-apps-script/AccountModules.gs','utf8').split('\n').slice(1).join('\n'),readFileSync('shared/account-modules.js','utf8').replaceAll('export ',''));
});
test('Super beheerder heeft alle huidige en toekomstige modules; gewone beheerders blijven beperkt',()=>{
 const superProfile={role:'superbeheerder',modules:[]};
 for(const module of [...accountModules.map(row=>row.id),'toekomstige-module'])assert.equal(hasModule(superProfile,module),true);
 assert.equal(hasModule({...superProfile,role:'beheerder'},'reports'),false);assert.equal(hasModule({...superProfile,disabled:true},'reports'),false);
});
