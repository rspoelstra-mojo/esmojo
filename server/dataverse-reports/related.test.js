import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportReader} from './read.js';
import {createNativeReportsRelated} from './related.js';
import {createArtistService} from '../artist-service.js';
import {createWebReportService} from '../report-web.js';
import {digest} from '../show-migration-writer.js';
import {normalizeArtistName} from '../../shared/artist-catalogue.js';
test('artist-only scoped access opens old native report KPIs without any CSV, incidents, tokens or private File DTO',async()=>{
 const f=await nativeReaderFixture(),reader=createNativeReportReader({repository:createNativeReportsRepository({connection:f.destination.connection})}),related=createNativeReportsRelated({reader,authorize:async(actor,scope)=>{assert.equal(actor,'artist-only');assert.equal(scope.module,'artists');},now:()=>new Date('2026-11-07T12:00:00Z')}),shows=(op,payload)=>related(op,payload,async()=>{if(op==='artist-catalogue')return{artists:[],profileSupported:true};throw Error('Native Reports must not call the legacy show lookup');}),service=createArtistService({shows,now:()=>Date.parse('2026-11-07T12:00:00Z')}),id='a_'+digest(normalizeArtistName(f.show.artist)),actual=await service.show('artist-only',{artistId:id,venue:f.show.venue,date:f.show.date}),legacy=await createWebReportService({store:f.drive.store,photo:async()=>null})('reader',{concertId:f.show.concertId});
 assert.deepEqual(actual.kpis,legacy.report.kpis);assert.equal(actual.reportId,f.show.concertId);assert.equal(JSON.stringify(actual).includes('csvBase64'),false);assert.equal(JSON.stringify(actual).includes('incidents'),false);
});
test('incident aggregates use typed native counts and preserve other modules daily state authority',async()=>{
 const f=await nativeReaderFixture(),reader=createNativeReportReader({repository:createNativeReportsRepository({connection:f.destination.connection})}),related=createNativeReportsRelated({reader,authorize:async()=>{},now:()=>new Date('2026-11-07T12:00:00Z')}),before=f.destination.calls.filter(c=>c.path==='DownloadBlock').length;
 const result=await related('incident-read',{worker:true},async()=>({rows:[],policyVersion:2,workerVersion:2,updatedAt:'existing-daily-lineage'}));assert.equal(result.rows.length,1);assert.equal(result.rows[0].medicalComplete,true);assert.deepEqual(result.jobs,[]);assert.equal(result.updatedAt,'existing-daily-lineage');assert.equal(f.destination.calls.filter(c=>c.path==='DownloadBlock').length,before);
 let retained=false;assert.equal(await related('incident-daily-read',{actor:'reader'},async()=>{retained=true;return'existing-daily-authority';}),'existing-daily-authority');assert.equal(retained,true);
});
test('missing module access is refused before any native report or File read',async()=>{const f=await nativeReaderFixture(),related=createNativeReportsRelated({reader:createNativeReportReader({repository:createNativeReportsRepository({connection:f.destination.connection})}),authorize:async()=>{throw Error('FORBIDDEN');}}),before=f.destination.calls.length;await assert.rejects(related('artist-catalogue',{actor:'no-module'},async()=>({artists:[]})),/FORBIDDEN/);assert.equal(f.destination.calls.length,before);});
