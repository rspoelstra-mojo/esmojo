import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeResearchStore} from './research.js';import {createNativeShowState} from './state.js';import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};
test('native public research creates once, verifies native Markdown and preserves the original MCP result',async()=>{
 const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection}),values={};let imports=0;
 const research={read:async()=>({researchByNumber:structuredClone(values)}),importDrive:async({number,markdown})=>{imports++;if(values[number]&&values[number].answer!==markdown)throw Error('CONFLICT');const created=!values[number];values[number]={questionNumber:number,answer:markdown,importedAt:new Date().toISOString()};return{verified:true,created};}},store=createNativeResearchStore({state,research,authority:async()=>{}}),concertId=sampleSource.concertId;
 assert.deepEqual((await store({operation:'context',concertId})).completedQuestions,[]);
 const request={operation:'write',concertId,questionNumber:1,result:{question:'De vaste vraag',answer:'Een openbaar onderzoeksantwoord',sources:[{title:'Bron',url:'https://example.invalid/source'}],researchedAt:'2026-11-13T09:00:00Z'}};
 assert.equal((await store(request)).created,true);assert.equal((await store(request)).created,true);assert.equal(imports,1);
 const read=await store({operation:'read',concertId,questionNumber:1});assert.equal(read.document.researchedAt,request.result.researchedAt);assert.equal(read.document.sources[0].url,request.result.sources[0].url);assert.match(values[1].answer,/## Bronnen/);
 await assert.rejects(store({...request,result:{...request.result,answer:'Andere tekst'}}),/CONFLICT/);assert.deepEqual((await store({operation:'context',concertId})).completedQuestions,[1]);
});
