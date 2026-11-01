import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateFinalRequest, categoryReady } from '../shared/analysis-finalization.js';
test('Vijf bezoekersstappen zijn vier afgeronde AI-stappen plus bevestigde ticketdata; artiest heeft er zeven',()=>{
 const analyses=Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,{status:'completed',summary:'Onderbouwd'}]));
 assert.equal(categoryReady('visitors',analyses,false),false);assert.equal(categoryReady('visitors',analyses,true),true);assert.equal(categoryReady('artist',analyses,false),true);
 for(const number of [1,2,3,4])assert.equal(categoryReady('visitors',{...analyses,[number]:{status:'draft',summary:'Concept'}},true),false);
 for(const number of [5,6,7,8,9,10,11])assert.equal(categoryReady('artist',{...analyses,[number]:{status:'pending',summary:''}},true),false);
});
test('Validatie accepteert alleen expliciete score, toelichting en revisiebasis; Apps Script blijft identiek',()=>{
 const input={operation:'complete',concertId:'Test_Gashouder_01112026',category:'artist',score:10,note:'Toelichting',basis:{profileRevision:0,finalRevision:0,ticketVersions:{ticket_sales:0,visitor_origins:0,domestic_origins:0}}};
 assert.equal(validateFinalRequest(input),input);
 for(const change of [{actor:'fake'},{concertId:'../accounts'},{score:0},{note:' '},{basis:{...input.basis,extra:1}}])assert.throws(()=>validateFinalRequest({...input,...change}),/VALIDATION/);
 assert.equal(readFileSync(new URL('../google-apps-script/FinalValidators.gs',import.meta.url),'utf8'),'// Gegenereerd uit shared/analysis-finalization.js; alleen export-keywords verwijderd.\n'+readFileSync(new URL('../shared/analysis-finalization.js',import.meta.url),'utf8').replaceAll('export ',''));
});
