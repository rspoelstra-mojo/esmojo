import test from 'node:test';import assert from 'node:assert/strict';
import {createShowsCutover} from './cutover.js';import {createNativeShowState} from './state.js';import {createSourceValidation} from './source-validation.js';import {createTaskStore} from '../background-tasks/store.js';import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';import {createManagedShowsRouting} from './routing.js';import {recordKey} from '../show-migration-writer.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};
async function fixture(){
 let at=Date.parse('2026-11-13T12:00:00Z');const now=()=>at,source=structuredClone(sampleSource),people=structuredClone(samplePeople),db=nativeFixture(source,people),state=createNativeShowState({env,repository:db.repo,connection:db.connection}),store=createTaskStore({env,connection:db.connection}),exports={catalogue:async()=>source.shows.map(row=>({...row,source:'drive'})),people:async()=>people,referenceFiles:()=>[],show:async()=>({bundle:source,management:null})},validate=createSourceValidation({env,source:exports,connection:db.connection});
 await store.create('shows-migration-v1','Afgeronde kopie',{version:1,type:'shows-migration-v1',actor:'synthetic-esm',epoch:'old-epoch',handlerVersion:1,status:'complete',sequence:1,expiresAt:at+48*3600000,startedAt:at,updatedAt:at,nextAt:at,lease:null,public:{}});
 const cutover=createShowsCutover({env,store,state,profiles:async()=>people.profiles[0],validate,legacy:async()=>({checkedAt:'2026-11-13T11:00:00Z',concerts:source.shows}),now});return{...db,cutover,state,store,source,advance:()=>at+=12*60000};
}
test('controlled cutover freezes, drains, fully verifies, initializes and activates one native authority',async()=>{
 const f=await fixture(),route=createManagedShowsRouting({env,repository:f.repo});assert.equal(await route({legacy:()=> 'old',native:()=> 'new'}),'old');
 let result=await f.cutover({operation:'start'});for(let round=0;result.status!=='complete'&&round<30;round++){
  assert.notEqual(result.status,'blocked',JSON.stringify(result));
  if(result.phase==='drain'){await assert.rejects(route({legacy:()=> 'old',native:()=> 'new'}),/STORAGE_BUSY/);f.advance();}
  result=await f.cutover({operation:'advance'});
 }
 assert.equal(result.status,'complete');assert.equal(result.mode,'dataverse');assert.equal(await route({legacy:()=> 'old',native:()=> 'new'}),'new');
 const validation=await f.store.get('shows-validation-v1');assert.equal(validation.state.status,'complete');assert.ok(validation.state.public.progress.verifiedRecords>0);assert.equal((await f.cutover({operation:'advance'})).status,'complete');
});
test('failed source comparison never activates and preserves the legacy route',async()=>{
 const f=await fixture(),row=[...f.tables.get('esmojo_artiest').values()][0];row.esmojo_naam='Afwijkende inhoud';
 const result=await f.cutover({operation:'start'});let next=result;
 for(let n=0;n<4&&next.status!=='blocked';n++)next=await f.cutover({operation:'advance'});
 assert.equal(next.status,'blocked');assert.equal(next.mode,'legacy');assert.equal(next.code,'MIGRATION_CONFLICT');assert.equal(row.esmojo_naam,'Afwijkende inhoud');
});
test('a final comparison failure releases the freeze before any native business writer is opened',async()=>{
 const f=await fixture();let result=await f.cutover({operation:'start'});for(let n=0;result.phase!=='drain'&&n<6;n++)result=await f.cutover({operation:'advance'});assert.equal(result.mode,'freeze');
 f.advance();f.source.shows[0].artist='Bron gewijzigd';for(let n=0;n<6&&result.status!=='blocked';n++)result=await f.cutover({operation:'advance'});assert.equal(result.status,'blocked');assert.equal(result.mode,'legacy');
 const route=createManagedShowsRouting({env,repository:f.repo});assert.equal(await route({legacy:()=>true,native:()=>false}),true);
});
test('cutover endpoint verifies fixed identity before any task or source access',async()=>{
 const {makeShowsCutoverSync}=await import('../../api/shows-cutover-sync.js');let called=0;const handler=makeShowsCutoverSync({identify:async()=>{throw Error('denied');},cutover:async()=>{called++;}}),res={setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;return this;}};await handler({method:'POST',headers:{},body:{operation:'start'}},res);assert.equal(res.code,403);assert.equal(called,0);
});
test('workflow client sends only explicit operations and waits through the drain',async()=>{
 const {cutoverShows}=await import('../../tools/background/cutover-shows.mjs');let clock=0,calls=0;const operations=[];
 const fetcher=async(url,options)=>{if(String(url).startsWith('https://identity.example.invalid'))return Response.json({value:'synthetic'});operations.push(JSON.parse(options.body));calls++;return Response.json({ok:true,status:calls===3?'complete':'ready',phase:calls===1?'drain':'verify',...(calls===1?{drainUntil:new Date(1000).toISOString()}:{}),mode:calls===3?'dataverse':'freeze'});};
 const result=await cutoverShows({operation:'start',env:{ACTIONS_ID_TOKEN_REQUEST_URL:'https://identity.example.invalid/token',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic'},fetcher,log:()=>{},now:()=>clock,pause:async ms=>clock+=ms});assert.equal(result.status,'complete');assert.deepEqual(operations,[{operation:'start'},{operation:'advance'},{operation:'advance'}]);assert.ok(clock>=1000);
});
