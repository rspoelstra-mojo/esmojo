import {test} from 'node:test';
import assert from 'node:assert/strict';
import {convertTscHistorical} from './tsc-historical.js';
import {calculateReport} from './ontrack-report/data.js';
import {webReportKpis} from './report-web.js';
import {reportSourceKpis} from '../shared/report-source.js';
const header='Date and Time,Discipline,Type,Priority,Description,Resolution Note';
const body='2020-02-01 - 8:00 PM,EHBO,Zelfzorg,Laag,"Test, tekst",Notitie\n2020-02-01 - 9:00 PM,Beveiliging,Uitzetting,Laag,Voorbeeld,\n2020-02-01 - 9:05 PM,Beveiliging / Schoonmaak,Test,Laag,Voorbeeld,';
const convert=first=>convertTscHistorical(first+'\n'+header+'\n'+body,{concertId:'Fixture_AFAS-Live_01022020',date:'2020-02-01'});
test('TSC metadata is expliciet; EHBO→Medisch, schoonmaak weg, stabiele IDs en native parser',()=>{
 const data=convert('1000,0,2,Deuren open 18:00,Aanvang show 20:00,Einde show 23:00');assert.equal(data.incidentCount,2);assert.equal(data.excludedCleaning,1);
 assert.deepEqual(data.showData,{visitors:1000,evictions:0,arrests:2,doors:'18:00',start:'20:00',end:'23:00'});
 const report=calculateReport(Buffer.from(data.csvBase64,'base64'));assert.equal(report.incidents[0].division,'Medisch');assert.ok(data.originalCsvBase64);assert.equal(convert('1000,0,2,Deuren open 18:00,Aanvang show 20:00,Einde show 23:00').sha256,data.sha256);
 const kpis=webReportKpis(report),projected=reportSourceKpis(kpis,data);assert.equal(projected.security.evictions,0);assert.equal(projected.security.arrests,2);assert.equal(projected.medical.total,1);
 assert.deepEqual(reportSourceKpis(kpis,{sourceType:'ontrack-historical'}),kpis);assert.deepEqual(reportSourceKpis(kpis,{sourceType:'ontrack-automated'}),kpis);
});
test('Ontbrekende velden blijven null; nul is geldig; geen terugval op berekende TSC-tellingen',()=>{
 const empty=convert(',,,Deuren open,Aanvang show,Einde show');assert.ok(Object.values(empty.showData).every(value=>value===null));assert.ok(Object.values(convert(',,,,,').showData).every(value=>value===null));
 const projected=reportSourceKpis(webReportKpis(calculateReport(Buffer.from(empty.csvBase64,'base64'))),empty);assert.equal(projected.security.evictions,null);assert.equal(projected.security.arrests,null);
 assert.throws(()=>convert('100,-1,0,Deuren open 18:00,Aanvang show 20:00,Einde show 23:00'));
 assert.throws(()=>convert('100,0,0,Deuren open 25:00,Aanvang show 20:00,Einde show 23:00'));
 assert.throws(()=>reportSourceKpis({}, {sourceType:'tsc-historical'}));
});

import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {validTscShowData,reportSourceType} from '../shared/report-source.js';
test('Drie bronpaden; TSC aanwezigen blijven exact en zijn geen kaartverkoop of 97,5%-schatting',()=>{
 assert.equal(reportSourceType({}),'ontrack-automated');assert.equal(reportSourceType({origin:'historical'}),'ontrack-historical');assert.equal(reportSourceType({sourceType:'tsc-historical'}),'tsc-historical');
 const ctx=vm.createContext({esmojoTscShowDataValid_:validTscShowData});vm.runInContext(readFileSync('google-apps-script/IncidentMetrics.gs','utf8'),ctx);
 for(const visitors of [0,1001,null]){const entry={sourceType:'tsc-historical',ticket_sales:'9000',showData:{visitors,evictions:0,arrests:0,doors:null,start:null,end:null}},result=ctx.esmojoIncidentAttendance_({concertId:'fixture'},new Map([['fixture',entry]]),new Map());assert.equal(result.visitors,visitors);assert.equal(result.soldTickets,null);assert.equal(result.visitorUnits,visitors===null?null:visitors*40);}
});
