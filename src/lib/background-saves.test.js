import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSaveActivity,installSaveExitWarning,SAVE_EXIT_MESSAGE,isSaveRequest,saveRequestInfo,backgroundSaves} from './background-saves.js';
import {createAssessmentQueue,clearAssessmentSaves} from '../production-assessment-ui.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};},tick=()=>new Promise(done=>setImmediate(done));
test('Afsluitwaarschuwing volgt parallelle saves, wachtrijen en fouten; alleen bewust erkennen of bevestiging wist de waarschuwing',async()=>{
 const saves=createSaveActivity(),events={},win={addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]},off=installSaveExitWarning(win,saves);const warning=()=>{let stopped=false;const event={preventDefault(){stopped=true;}};events.beforeunload(event);return{stopped,text:event.returnValue};};
 assert.equal(warning().stopped,false);const a=deferred(),b=deferred(),first=saves.track(()=>a.promise,{label:'Maatregel'}),second=saves.track(()=>b.promise,{label:'Account'});assert.equal(warning().text,SAVE_EXIT_MESSAGE);a.resolve();await first;assert.equal(warning().stopped,true);b.reject(Error('private contents must not enter notices'));await assert.rejects(second);assert.equal(saves.pending,false);assert.equal(saves.failures.length,1);assert.equal(JSON.stringify(saves.failures).includes('private contents'),false);assert.equal(warning().stopped,true);saves.dismiss(saves.failures[0].id);assert.equal(warning().stopped,false);
 let queued=true;const unwatch=saves.watch(()=>queued);assert.equal(warning().stopped,true);queued=false;assert.equal(warning().stopped,false);unwatch();off();assert.equal(events.beforeunload,undefined);
});
test('Afmelden wist vertrouwelijke formulieren en een late fout herstelt geen oude melding of invoer',async()=>{
 const saves=createSaveActivity(),wait=deferred();saves.form('fixture').content='alleen privégeheugen';const work=saves.track(()=>wait.promise);saves.clear();wait.reject(Error('late failure'));await assert.rejects(work);assert.deepEqual(saves.form('fixture'),{});assert.equal(saves.failures.length,0);assert.equal(saves.unconfirmed,false);
});
test('Websitebrede mutatieherkenning omvat toekomstige modules en laat reads, leases en beveiligde logincontroles buiten de saveteller',()=>{
 for(const action of ['measure','operational-risk','accounts','ontrack','photo','future-module'])assert.equal(isSaveRequest(action,{method:'PATCH',body:{operation:'save'}}),true);
 for(const operation of ['read','download','status','reserve','renew','release'])assert.equal(isSaveRequest('measure',{method:'POST',body:{operation}}),false);
 for(const action of ['report-web','show-open','complete','session','remember'])assert.equal(isSaveRequest(action,{method:'POST'}),false);
 assert.equal(saveRequestInfo('measure',{concertId:'Test_Gashouder_06112026'}).route,'/shows/Test_Gashouder_06112026?tab=maatregelen');
});
test('Getypte tekst en concepten worden vóór afronding serieel opgeslagen; navigatie/dispose stopt de lopende afronding niet',async()=>{
 backgroundSaves.clear();const waits=[],calls=[];let value={riskLevel:'low'},revision=0,fire;
 const queue=createAssessmentQueue({snapshot:()=>value,send:(operation,payload)=>{calls.push({operation,payload,revision});const wait=deferred();waits.push(wait);return wait.promise;},stored:()=>revision++,changed(){},error(){},setTimer:f=>{fire=f;return 1;},clearTimer(){}});
 queue.laterAction('edit-text',()=>({text:'Nieuwe maatregel'}));assert.equal(backgroundSaves.pending,true);const completed=queue.action('complete',{data:value});const disposed=queue.dispose();assert.equal(calls.length,1);assert.equal(calls[0].operation,'edit-text');waits.shift().resolve({});await tick();assert.equal(calls[1].operation,'complete');assert.equal(calls[1].revision,1);waits.shift().resolve({ok:true});assert.deepEqual(await completed,{ok:true});await disposed;assert.equal(backgroundSaves.pending,false);
});
test('Afmelden start geen nog wachtende vervolgwrite; een fout laat vervolgafrondingen niet doorlopen',async()=>{
 backgroundSaves.clear();let resolve,calls=0;const queue=createAssessmentQueue({snapshot:()=>({}),send:()=>{calls++;return new Promise(done=>resolve=done);},stored(){},changed(){},error(){}});queue.save(true);const next=queue.action('complete');clearAssessmentSaves();resolve({});assert.equal(await next,null);await tick();assert.equal(calls,1);backgroundSaves.clear();
});

test('Een antwoord op een eerdere conceptwrite mag nieuw typen tijdens de debounce niet als opgeslagen beschouwen',async()=>{
 backgroundSaves.clear();let input={note:'eerste'},fire;const calls=[],waits=[];const queue=createAssessmentQueue({snapshot:()=>input,send:(_op,payload)=>{calls.push(payload.data.note);const wait=deferred();waits.push(wait);return wait.promise;},stored(){},changed(){},error(){},setTimer:fn=>{fire=fn;return 1;},clearTimer(){}});
 queue.save(true);input={note:'verder getypt'};queue.later();waits.shift().resolve({});await tick();assert.deepEqual(calls,['eerste']);fire();assert.deepEqual(calls,['eerste','verder getypt']);waits.shift().resolve({});await queue.whenSettled();queue.dispose();backgroundSaves.clear();
});
test('Een verwerkingshold blijft na navigatie in de afsluitwaarschuwing en afmelden voorkomt de latere upload',async()=>{
 backgroundSaves.clear();let sends=0;const queue=createAssessmentQueue({snapshot:()=>({}),send:async()=>{sends++;return{};},stored(){},changed(){},error(){}});const release=queue.hold();const disposed=queue.dispose();assert.equal(backgroundSaves.pending,true);clearAssessmentSaves();assert.equal(await queue.action('upload'),null);release();await disposed;assert.equal(sends,0);backgroundSaves.clear();
});
test('Bevestigde herpoging wist uitsluitend de fout van dezelfde opslagactie',async()=>{
 const saves=createSaveActivity();for(const key of ['A','B'])await assert.rejects(saves.track(()=>Promise.reject(Error('synthetic')),{key,label:'Bewaren'}));assert.equal(saves.failures.length,2);await saves.track(async()=>({ok:true}),{key:'A'});assert.equal(saves.failures.length,1);assert.equal(saves.failures[0].key,'B');
});

test('Foutlinks voor rapport-/mailbeheer blijven in beheer, ook wanneer de actie een concert-ID bevat',()=>{
 assert.equal(saveRequestInfo('ontrack-report',{concertId:'Historical_AFAS-Live_01112026'}).route,'/beheerder/ontrack');assert.equal(saveRequestInfo('email',{concertId:'Historical_AFAS-Live_01112026'}).route,'/beheerder/email');
});
