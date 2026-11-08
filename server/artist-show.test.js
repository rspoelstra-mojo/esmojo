import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildArtistCatalogue} from '../shared/artist-catalogue.js';
import {createArtistService} from './artist-service.js';
import {ONTRACK_HEADERS} from './ontrack-report/data.js';
import {createWebReportService} from './report-web.js';
const hash=value=>createHash('sha256').update(value).digest('hex'),artists=buildArtistCatalogue(['Fixture act'],hash),artistId=artists[0].id;
const show={key:'fixture-concert',name:'Fixture act',date:'2026-11-03',venue:'Gashouder'},input={artistId,date:show.date,venue:show.venue};
const csv=ONTRACK_HEADERS.join(',')+'\n'+['Zelfzorg','Onwelwording','Contusie / Distorsie','Baldadigheid','Verbale agressie'].map((type,i)=>ONTRACK_HEADERS.map(key=>({ID:'fixture-'+i,'Date and Time':'2026-11-03 - 08:00 PM',Division:i<3?'Medisch':'Beveiliging',Type:type,'Affected Person':i===4?'2':'1','Resolved Status':i===4?'Eviction':'','Description':'Private fixture text'}[key]||'')).join(',')).join('\n');
const report={show,series:{dates:[show.date],shows:[{concertId:show.key,date:show.date}]},csvBase64:Buffer.from(csv).toString('base64'),sourceHash:hash(csv),modifiedAt:'2026-11-04T00:00:00Z'};
function service(source){return createArtistService({now:()=>Date.parse('2026-11-08T12:00:00Z'),shows:async(operation,payload)=>{if(operation==='artist-catalogue')return{artists};assert.equal(operation,'artist-show');assert.deepEqual(payload,{actor:'actor',artistIds:[artistId],date:show.date,venue:show.venue});return source;}});}
test('Artiestshow gebruikt exact dezelfde rapportagetellingen, zonder bronbytes, incidenten, hashes of filters naar browser',async()=>{
 const result=await service({show,report}).show('actor',input),original=await createWebReportService({store:async()=>report,photo:async()=>null})('actor',{concertId:show.key});
 assert.deepEqual(result.kpis,original.report.kpis);assert.equal(result.kpis.medical.total,3);assert.equal(result.kpis.medical.selfcare,1);assert.equal(result.kpis.security.mischief,1);assert.equal(result.kpis.security.evictions,2);assert.equal(result.reportId,show.key);
 assert.deepEqual(Object.keys(result).sort(),['kpis','preparation','reportId','show','timetable']);assert.equal(JSON.stringify(result).includes('Private fixture'),false);assert.equal(JSON.stringify(result).includes(report.sourceHash),false);
});
test('Geen rapportage geeft ontbrekende informatie, nooit nullen; andere artiest/datum/bron faalt gesloten',async()=>{
 const result=await service({show,report:null}).show('actor',input);assert.equal(result.kpis,null);assert.equal(result.reportId,null);
 for(const source of [{show:{...show,date:'2026-11-02'},report},{show,report:{...report,show:{...show,name:'Different act'}}},{show,report:{...report,sourceHash:'f'.repeat(64)}}])await assert.rejects(service(source).show('actor',input));
});
test('Vandaag/toekomst en vrije bron- of actorvelden worden vóór Drive geweigerd, op Nederlandse kalenderdag',async()=>{
 const read=service({show,report});
 for(const body of [{...input,date:'2026-11-08'},{...input,date:'2026-11-09'},{...input,date:'2026-02-30'},{...input,actor:'other'},{...input,concertId:show.key},{...input,fileId:'private'}])await assert.rejects(read.show('actor',body),/VALIDATION/);
 let calls=0;const midnight=createArtistService({now:()=>Date.parse('2026-11-07T23:30:00Z'),shows:async()=>{calls++;}});await assert.rejects(midnight.show('actor',{...input,date:'2026-11-08'}),/VALIDATION/);assert.equal(calls,0);
});
function drive({allowed=true,available=true,duplicate=false}={}){
 let reads=0;
 const context=vm.createContext({Set,Map,Date,validArtistId:value=>value===artistId,normalizeArtistName:value=>value.toLowerCase(),esmojoOnTrackHash_:hash,validTimetableDate:value=>/^2026-11-\d\d$/.test(value),esmojoOnTrackProfiles_:()=>[{id:'actor',activated:true,modules:allowed?['artists']:[]}],hasModule:(profile,module)=>profile.modules.includes(module),Utilities:{formatDate:()=> '2026-11-08'},DriveApp:{getFolderById:()=>({})},ESMOJO_ONTRACK_FOLDER_ID:'private',esmojoTimetableCatalogue_:()=>new Map([['fixture',{artist:show.name,venue:show.venue,date:show.date,concertId:show.key}]]),esmojoWebInventory_:()=>({available:available?Array.from({length:duplicate?2:1},()=>({show})):[]}),esmojoWebReports_:(request)=>{reads++;assert.equal(request.concertId,show.key);return report;},esmojoWebTimetable_:()=>null});
 vm.runInContext(readFileSync('google-apps-script/Artists.gs','utf8'),context);
 return{read:body=>context.esmojoArtistShow_({operation:'artist-show',actor:'actor',artistIds:[artistId],date:show.date,venue:show.venue,...body}),reads:()=>reads};
}
test('Drive controleert actuele Artiestenrechten en exacte artiest/datum/zaal vóór CSV-read; ambiguïteit nooit kiezen',()=>{
 const good=drive();assert.equal(good.read().report,report);assert.equal(good.reads(),1);
 const denied=drive({allowed:false});assert.throws(()=>denied.read(),/FORBIDDEN/);assert.equal(denied.reads(),0);
 const absent=drive({available:false});assert.equal(absent.read().report,null);
 const duplicate=drive({duplicate:true});assert.throws(()=>duplicate.read(),/REPORT_CONFLICT/);assert.equal(duplicate.reads(),0);
 for(const body of [{date:'2026-11-08'},{date:'2026-11-09'},{date:'2026-11-02'},{venue:'Other venue'},{artistIds:['a_'+'f'.repeat(64)]},{fileId:'arbitrary'}]){const h=drive();assert.throws(()=>h.read(body));assert.equal(h.reads(),0);}
});
