import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artistRiskModel,specificSecurityIndicators} from '../shared/artist-risk-model.js';
import {incidentIndicators,incidentReferences,calculateIncidentRisk,calculateArtistRisk,assessArtistRisk,securityOutlierContribution,incidentRateFraction,displayedRiskParts} from '../shared/artist-risk-score.js';
import {createIncidentMetricsService} from './incident-metrics.js';
import {createHash} from 'node:crypto';
const counts=(n=0)=>Object.fromEntries(Object.entries(incidentIndicators).map(([g,rows])=>[g,Object.fromEntries(rows.map(([key])=>[key,n]))]));
const show=(id,kpis=counts(),extra={})=>({concertId:id,name:'Fixture',visitors:2000,securityComplete:true,medicalComplete:true,kpis,visitorsFinal:true,artistFinal:true,visitorsRating:10,artistRating:10,operationalLevels:['high','high','high'],...extra});
const references=()=>incidentReferences([show('baseline',counts(1))]);
const securityCase=(specific,extra={})=>{const kpis=counts();Object.assign(kpis.security,specific);kpis.security.total=Object.values(specific).reduce((sum,n)=>sum+n,0);return show('artist',kpis,extra);};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} ≠ ${expected}`);
test('A–D en aanhoudingen: dezelfde zelfstandige uitschieter van 19, nooit automatisch 25',()=>{
 assert.deepEqual(specificSecurityIndicators,['verbal','physical','mischief','evictions','arrests']);
 for(const key of specificSecurityIndicators){const count=key==='evictions'?9:11,score=calculateArtistRisk([securityCase({[key]:count})],references());
  assert.equal(score.incidentCalculation.outliers[key],19,key);assert.equal(score.incidentCalculation.dominantCategory,key);assert.equal(score.incidents.security,19,key);assert.equal(score.incidents.medical,0);assert.equal(score.total,84);
 }
});
test('E: precies één dominante uitschieter, overige reguliere punten, geen total-bonus of dubbel tellen',()=>{
 const score=calculateArtistRisk([securityCase({physical:11,evictions:9})],references());
 assert.equal(score.incidentCalculation.dominantCategory,'physical');assert.equal(score.incidentCalculation.dominantContribution,19);assert.equal(score.incidentCalculation.outlierScore,22.75);assert.equal(score.incidents.security,22.75);
 assert.equal(calculateArtistRisk([securityCase({physical:11,evictions:9,arrests:9})],references()).incidents.security,25);
 const totalOnly=counts();totalOnly.security.total=99;const totalScore=calculateArtistRisk([show('total',totalOnly)],references());assert.equal(totalScore.incidentCalculation.outlierScore,0);assert.equal(totalScore.incidents.security,3.75);
});
test('F: één incident heeft aantalfactor 1/7, ook bij uitzonderlijk hoge frequentie',()=>{
 const score=calculateArtistRisk([securityCase({physical:1},{visitors:200})],references());
 close(score.incidentCalculation.dominantContribution,19/7);assert.ok(score.incidents.security<19);assert.equal(score.incidents.security,10);
 for(const n of [1,3,6,7,11])close(securityOutlierContribution({incidents:n,visitors:100},{incidents:1,visitors:100000}),19*Math.min(1,n/7));
});
test('Afwijkingsfactor is lineair tot +300%, aantalfactor en modelinstellingen zijn centraal',()=>{
 assert.deepEqual([artistRiskModel.outlierMaximum,artistRiskModel.outlierExcessPercent,artistRiskModel.outlierIncidentCount],[19,300,7]);
 for(const [incidents,factor]of [[4,0],[7,.25],[10,.5],[13,.75],[16,1],[40,1]])close(securityOutlierContribution({incidents,visitors:2000},{incidents:4,visitors:2000}),19*factor);
 // Exacte bezoekersbreuken blijven leidend, niet afgeronde schermreferenties.
 const source=securityCase({physical:11}),refs=references(),score=calculateArtistRisk([source],refs);refs.indicators.security.physical.rate=999;assert.equal(calculateArtistRisk([source],refs).incidents.security,score.incidents.security);
});
test('G: medisch gebruikt uitsluitend de bestaande staffel met exacte verhouding 10/15',()=>{
 const ratios=[3,2,1,2,2,5],maxima=incidentIndicators.medical.map(row=>row[2]);maxima.forEach((n,i)=>assert.equal(n,ratios[i]*(10/15)));
 assert.equal(Math.max(...maxima),maxima.at(-1));
 for(const [index,[key]]of incidentIndicators.medical.entries()){
  for(const [n,fraction]of [[4,0],[5,.25],[6,.5],[7,1],[8,1]]){const kpis=counts();kpis.medical[key]=n;const refs=incidentReferences([show('base',counts(4))]),result=calculateIncidentRisk(incidentReferences([show('own',kpis)]),refs);close(result.medical,maxima[index]*fraction);}
 }
 const own=show('own',counts(10)),score=calculateArtistRisk([own],references());assert.equal(score.incidents.medical,10);assert.equal(score.incidents.security,25);assert.equal(score.parts.incidents,35);assert.equal(score.total,100);
 assert.equal(Math.round(Object.values(displayedRiskParts(score)).reduce((s,n)=>s+n,0)*100),Math.round(score.total*100));
});
test('Gedeeltelijke score behoudt nieuw model; ontbrekende incidentdata en nulreferenties blijven beschermd',()=>{
 for(const extra of [{visitorsFinal:false},{artistFinal:false},{visitorsRating:null},{artistRating:0},{operationalLevels:null}]){const partial=calculateArtistRisk([securityCase({physical:11},extra)],references());assert.equal(partial.status,'incomplete');assert.equal(partial.availableMaximum,35);assert.equal(partial.total,19);assert.equal(partial.level,null);assert.deepEqual(partial.parts,{visitors:null,artist:null,operational:null,incidents:19});assert.equal(partial.incidents.security,19);assert.equal(partial.incidents.medical,0);}
 for(const extra of [{medicalComplete:false},{securityComplete:false},{visitors:0}])assert.equal(calculateArtistRisk([securityCase({physical:11},extra)],references()),null);
 const zeroRefs=incidentReferences([show('base')]);assert.equal(calculateArtistRisk([show('own')],zeroRefs).total,65);
 const assessment=assessArtistRisk([securityCase({physical:11})],zeroRefs);assert.equal(assessment.score,null);assert.equal(assessment.reliability,'unreliable');assert.ok(assessment.issues.some(row=>row.key==='physical'&&row.reason==='ZERO_REFERENCE'));
 assert.equal(incidentRateFraction({incidents:1,visitors:2000},{incidents:0,visitors:2000}),null);assert.equal(securityOutlierContribution({incidents:1,visitors:2000},{incidents:0,visitors:2000}),null);
});
test('Meerdere concerten worden eerst gepoold, onvolledige data uitgesloten; referenties blijven bezoekersgewogen',()=>{
 const a=securityCase({physical:1},{visitors:200}),b={...securityCase({physical:6},{visitors:1800}),concertId:'second'},pooled=securityCase({physical:7});
 const refs=references();assert.equal(calculateArtistRisk([a,b],refs).incidents.security,calculateArtistRisk([pooled],refs).incidents.security);
 const incomplete={...securityCase({physical:999}),concertId:'incomplete',artistFinal:false};assert.equal(calculateArtistRisk([show('full'),incomplete],refs).total,65);
 assert.equal(incidentReferences([a,b]).indicators.security.physical.rate,3.5);assert.equal(incidentReferences([a,a]).concerts,1);assert.equal(calculateArtistRisk([a,a],refs).concerts,1);assert.equal(calculateArtistRisk([a,a],refs).total,calculateArtistRisk([a],refs).total);assert.throws(()=>incidentReferences([a,{...a,visitors:2001}]),/DUPLICATE/);
});
test('De beveiligde artiest-API projecteert dezelfde centrale uitschieter en betrouwbaarheid; geen beheerdata',async()=>{
 const refs=references(),rows=[securityCase({evictions:9})],id='a_'+createHash('sha256').update('fixture').digest('hex');
 const service=createIncidentMetricsService({shows:async op=>op==='incident-daily-read'?{references:refs,updatedAt:'2026-11-10T00:00:00Z'}:{policyVersion:2,rows}});
 const data=await service.snapshot('actor',[id]);assert.equal(data.score.incidents.security,19);assert.equal(data.assessment.reliability,'reliable');assert.equal(data.score.modelVersion,artistRiskModel.version);assert.equal('shows' in data,false);
 rows[0].artistFinal=false;const partial=await service.snapshot('actor',[id]);assert.equal(partial.score.status,'incomplete');assert.equal(partial.score.incidents.security,19);assert.equal(partial.score.level,null);
 refs.indicators.security.evictions={incidents:0,visitors:2000,visitorUnits:80000,rate:0};const missing=await service.snapshot('actor',[id]);assert.equal(missing.score,null);assert.equal(missing.assessment.reliability,'unreliable');
});
