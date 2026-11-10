import {artistRiskModel,specificSecurityIndicators} from './artist-risk-model.js';
import {readableArtistName} from './artist-names.js';
import {normalizeArtistName} from './artist-catalogue.js';
// Eén rekenbron voor artiestscore en historische incidentreferenties.
export const incidentIndicators={
 security:[['total','Totaal beveiligingsmeldingen',3.75],['verbal','Verbale agressie',2.5],['physical','Fysieke agressie',6.25],['mischief','Baldadigheid',3.75],['evictions','Uitzettingen',3.75],['arrests','Aanhoudingen',5]],
 medical:[['total','Totaal medische meldingen',3*(10/15)],['treatments','Behandelingen',2*(10/15)],['selfcare','Zelfzorg',1*(10/15)],['unwell','Onwelwordingen',2*(10/15)],['contusion','Contusie / Distorsie',2*(10/15)],['ambulance','Ambulancetransporten',5*(10/15)]],
};
export function validIncidentCounts(kpis){return Boolean(kpis&&Object.entries(incidentIndicators).every(([group,rows])=>rows.every(([key])=>Number.isSafeInteger(kpis[group]?.[key])&&kpis[group][key]>=0)));}
export function operationalPoints(levels){
 if(!Array.isArray(levels)||levels.some(level=>!['none','low','medium','high'].includes(level)))return null;
 let high=0,total=0;for(const level of levels)total+=level==='high'?(high++?5:7.5):level==='medium'?2:level==='low'?.5:0;
 return Math.min(15,total);
}
export function incidentVisitorUnits(row){
 if(row?.visitorUnits!==undefined){const units=row.visitorUnits;return Number.isSafeInteger(units)&&units>=0&&row.visitors===units/40?units:null;}
 return Number.isSafeInteger(row?.visitors)&&row.visitors>=0&&Number.isSafeInteger(row.visitors*40)?row.visitors*40:null;
}
export function incidentRateFraction(artist,reference){
 if(![artist,reference].every(row=>Number.isSafeInteger(row?.incidents)&&row.incidents>=0&&incidentVisitorUnits(row)>0))throw Error('INVALID_REFERENCE');
 const left=BigInt(artist.incidents)*BigInt(incidentVisitorUnits(reference)),right=BigInt(reference.incidents)*BigInt(incidentVisitorUnits(artist));
 if(left<=right)return 0;if(right===0n)return null;
 if(left*4n<=right*5n)return .25;if(left*2n<=right*3n)return .5;if(left*4n<right*7n)return .75;return 1;
}
export const riskClass=score=>score>=90?'Zeer hoog risico':score>=75?'Hoog risico':score>=55?'Midden risico':'Laag risico';
export function suitableIncidents(row){return Boolean(row?.securityComplete===true&&row.medicalComplete===true&&incidentVisitorUnits(row)>0&&validIncidentCounts(row.kpis));}
export function deduplicateIncidentRows(rows){
 const ids=new Map(),identities=new Map(),result=[];
 const signature=row=>JSON.stringify([row.name?normalizeArtistName(readableArtistName(row.name)):null,row.date??null,row.venue?.toLocaleLowerCase('nl-NL')??null,row.performance??null,row.visitors,incidentVisitorUnits(row),row.securityComplete,row.medicalComplete,...Object.entries(incidentIndicators).flatMap(([group,definitions])=>definitions.map(([key])=>row.kpis?.[group]?.[key]??null)),row.visitorsFinal??null,row.artistFinal??null,row.visitorsRating??null,row.artistRating??null,row.operationalLevels??null]);
 for(const row of rows){
  if(typeof row?.concertId!=='string'||!row.concertId)throw Error('INVALID_CONCERT');
  const identity=suitableIncidents(row)&&row.date&&row.venue?JSON.stringify([normalizeArtistName(readableArtistName(row.name)),row.date,row.venue.toLocaleLowerCase('nl-NL'),row.performance||null]):null;
  const previous=ids.get(row.concertId)||(identity?identities.get(identity):null);
  if(previous){if(signature(previous)!==signature(row))throw Error('DUPLICATE_CONCERT');ids.set(row.concertId,previous);continue;}
  ids.set(row.concertId,row);if(identity)identities.set(identity,row);result.push(row);
 }
 return result;
}
export function incidentReferences(rows){
 const included=deduplicateIncidentRows(rows).filter(suitableIncidents);
 const visitorUnits=included.reduce((n,row)=>n+incidentVisitorUnits(row),0),visitors=visitorUnits/40,indicators={};
 if(!Number.isSafeInteger(visitorUnits))throw Error('INVALID_TOTAL');
 for(const [group,definitions]of Object.entries(incidentIndicators)){
  indicators[group]={};for(const [key]of definitions){const incidents=included.reduce((n,row)=>n+row.kpis[group][key],0);if(!Number.isSafeInteger(incidents))throw Error('INVALID_TOTAL');indicators[group][key]={incidents,visitors,visitorUnits,rate:visitors?incidents/visitors*1000:null};}
 }
 return{concerts:included.length,visitors,visitorUnits,indicators};
}
// Vergelijk exacte bezoekersbreuken; rond uitsluitend voor presentatie af.
export function securityOutlierContribution(artist,reference){
 const fraction=incidentRateFraction(artist,reference);if(fraction===null)return null;
 const left=BigInt(artist.incidents)*BigInt(incidentVisitorUnits(reference)),right=BigInt(reference.incidents)*BigInt(incidentVisitorUnits(artist));
 if(left<=right)return 0;
 const excess=left-right,threshold=right*BigInt(artistRiskModel.outlierExcessPercent);
 const deviation=excess*100n>=threshold?1:Number(excess*100n)/Number(threshold);
 return artistRiskModel.outlierMaximum*deviation*Math.min(1,artist.incidents/artistRiskModel.outlierIncidentCount);
}
export function calculateIncidentRisk(own,references){
 const regular={security:{},medical:{}},outliers={},issues=[];
 for(const [group,definitions]of Object.entries(incidentIndicators))for(const [key,,maximum]of definitions){
  const artist=own?.indicators?.[group]?.[key],reference=references?.indicators?.[group]?.[key];let fraction;
  try{fraction=incidentRateFraction(artist,reference);}catch{issues.push({group,key,reason:'INVALID_REFERENCE'});continue;}
  if(fraction===null){issues.push({group,key,reason:'ZERO_REFERENCE'});continue;}
  regular[group][key]=maximum*fraction;
  if(group==='security'&&specificSecurityIndicators.includes(key))outliers[key]=securityOutlierContribution(artist,reference);
 }
 if(issues.length)return{reliable:false,issues,security:null,medical:null};
 const base=Math.min(artistRiskModel.securityMaximum,Object.values(regular.security).reduce((sum,n)=>sum+n,0));
 // Bij gelijke hoogste bijdragen blijft de eerste in de vaste categorievolgorde leidend.
 let dominant=specificSecurityIndicators[0];for(const key of specificSecurityIndicators)if(outliers[key]>outliers[dominant])dominant=key;
 const bonus=specificSecurityIndicators.filter(key=>key!==dominant).reduce((sum,key)=>sum+regular.security[key],0);
 const outlierScore=Math.min(artistRiskModel.securityMaximum,outliers[dominant]+bonus);
 return{reliable:true,issues:[],security:Math.min(artistRiskModel.securityMaximum,Math.max(base,outlierScore)),medical:Math.min(artistRiskModel.medicalMaximum,Object.values(regular.medical).reduce((sum,n)=>sum+n,0)),details:{base,outlierScore,dominantCategory:dominant,dominantContribution:outliers[dominant],regular,outliers}};
}
export function assessArtistRisk(rows,references){
 const unavailable=(reason,issues=[])=>({score:null,reliability:issues.length?'unreliable':'unavailable',reason,issues});
 const eligible=deduplicateIncidentRows(rows).filter(row=>suitableIncidents(row)&&row.visitorsFinal===true&&row.artistFinal===true&&[row.visitorsRating,row.artistRating].every(n=>Number.isFinite(n)&&n>=1&&n<=10)&&operationalPoints(row.operationalLevels)!==null);
 if(!eligible.length)return unavailable('INCOMPLETE_DATA');
 if(!references?.concerts||!references.visitors)return unavailable('MISSING_REFERENCE');
 const own=incidentReferences(eligible),n=eligible.length,calculation=calculateIncidentRisk(own,references);
 if(!calculation.reliable)return unavailable('UNRELIABLE_REFERENCE',calculation.issues);
 const parts={visitors:eligible.reduce((sum,row)=>sum+row.visitorsRating*2.5,0)/n,artist:eligible.reduce((sum,row)=>sum+row.artistRating*2.5,0)/n,operational:eligible.reduce((sum,row)=>sum+operationalPoints(row.operationalLevels),0)/n,incidents:calculation.security+calculation.medical};
 const total=Object.values(parts).reduce((sum,value)=>sum+value,0);
 if(!Number.isFinite(total)||total<1||total>100)throw Error('INVALID_SCORE');
 return{score:{status:'complete',availableMaximum:100,modelVersion:artistRiskModel.version,total,level:riskClass(total),parts,incidents:{security:calculation.security,medical:calculation.medical},incidentCalculation:calculation.details,concerts:n},reliability:'reliable',reason:null,issues:[]};
}
export function calculateArtistRisk(rows,references){return assessArtistRisk(rows,references).score;}
// Afgeronde segmentlabels tellen exact op tot de afgeronde totaalscore.
export function displayedRiskParts(score){
 const entries=Object.entries(score.parts).filter(([,value])=>Number.isFinite(value)).map(([key,value])=>({key,value:value*100,units:Math.floor(value*100)})),target=Math.round(score.total*100);
 let remaining=target-entries.reduce((n,row)=>n+row.units,0);
 for(const row of [...entries].sort((a,b)=>(b.value-b.units)-(a.value-a.units)))if(remaining-->0)row.units++;
 return Object.fromEntries(entries.map(row=>[row.key,row.units/100]));
}
