import {readableArtistName} from './artist-names.js';
import {normalizeArtistName} from './artist-catalogue.js';
// Eén rekenbron voor artiestscore en historische incidentreferenties.
export const incidentIndicators={
 security:[['total','Totaal beveiligingsmeldingen',3],['verbal','Verbale agressie',2],['physical','Fysieke agressie',5],['mischief','Baldadigheid',3],['evictions','Uitzettingen',3],['arrests','Aanhoudingen',4]],
 medical:[['total','Totaal medische meldingen',3],['treatments','Behandelingen',2],['selfcare','Zelfzorg',1],['unwell','Onwelwordingen',2],['contusion','Contusie / Distorsie',2],['ambulance','Ambulancetransporten',5]],
};
export function validIncidentCounts(kpis){return Boolean(kpis&&Object.entries(incidentIndicators).every(([group,rows])=>rows.every(([key])=>Number.isSafeInteger(kpis[group]?.[key])&&kpis[group][key]>=0)));}
export function operationalPoints(levels){
 if(!Array.isArray(levels)||levels.some(level=>!['none','low','medium','high'].includes(level)))return null;
 let high=0,total=0;for(const level of levels)total+=level==='high'?(high++?5:7.5):level==='medium'?2:level==='low'?.5:0;
 return Math.min(15,total);
}
export function incidentRateFraction(artist,reference){
 if(![artist,reference].every(row=>Number.isSafeInteger(row?.incidents)&&row.incidents>=0&&Number.isSafeInteger(row.visitors)&&row.visitors>0))throw Error('INVALID_REFERENCE');
 const left=BigInt(artist.incidents)*BigInt(reference.visitors),right=BigInt(reference.incidents)*BigInt(artist.visitors);
 if(left<=right)return 0;if(right===0n)return 1;
 if(left*4n<=right*5n)return .25;if(left*2n<=right*3n)return .5;if(left*4n<right*7n)return .75;return 1;
}
export const riskClass=score=>score>=90?'Zeer hoog risico':score>=75?'Hoog risico':score>=55?'Midden risico':'Laag risico';
export function suitableIncidents(row){return Boolean(row?.securityComplete===true&&row.medicalComplete===true&&Number.isSafeInteger(row.visitors)&&row.visitors>0&&validIncidentCounts(row.kpis));}
export function incidentReferences(rows){
 const unique=new Map();for(const row of rows){if(typeof row?.concertId!=='string'||!row.concertId)throw Error('INVALID_CONCERT');if(unique.has(row.concertId))throw Error('DUPLICATE_CONCERT');unique.set(row.concertId,row);}
 const included=[...unique.values()].filter(suitableIncidents),identities=new Set();
 for(const row of included){const identity=row.date&&row.venue?JSON.stringify([normalizeArtistName(readableArtistName(row.name)),row.date,row.venue.toLocaleLowerCase('nl-NL'),row.performance||null]):row.concertId;if(identities.has(identity))throw Error('DUPLICATE_CONCERT');identities.add(identity);}
 const visitors=included.reduce((n,row)=>n+row.visitors,0),indicators={};
 if(!Number.isSafeInteger(visitors))throw Error('INVALID_TOTAL');
 for(const [group,definitions]of Object.entries(incidentIndicators)){
  indicators[group]={};for(const [key]of definitions){const incidents=included.reduce((n,row)=>n+row.kpis[group][key],0);if(!Number.isSafeInteger(incidents))throw Error('INVALID_TOTAL');indicators[group][key]={incidents,visitors,rate:visitors?incidents/visitors*1000:null};}
 }
 return{concerts:included.length,visitors,indicators};
}
export function calculateArtistRisk(rows,references){
 const eligible=rows.filter(row=>suitableIncidents(row)&&row.visitorsFinal===true&&row.artistFinal===true&&[row.visitorsRating,row.artistRating].every(n=>Number.isFinite(n)&&n>=1&&n<=10)&&operationalPoints(row.operationalLevels)!==null);
 if(!eligible.length||!references?.concerts||!references.visitors)return null;
 // Ook hier één concert slechts eenmaal. Referenties gebruiken ruimere dataset.
 const own=incidentReferences(eligible),n=eligible.length;
 const parts={visitors:eligible.reduce((sum,row)=>sum+row.visitorsRating*2.5,0)/n,artist:eligible.reduce((sum,row)=>sum+row.artistRating*2.5,0)/n,operational:eligible.reduce((sum,row)=>sum+operationalPoints(row.operationalLevels),0)/n,incidents:0};
 const incidents={security:0,medical:0};
 for(const [group,definitions]of Object.entries(incidentIndicators))for(const [key,,maximum]of definitions){const ref=references.indicators[group][key].rate;if(ref===null)return null;incidents[group]+=maximum*incidentRateFraction(own.indicators[group][key],references.indicators[group][key]);}
 parts.incidents=incidents.security+incidents.medical;
 const total=Object.values(parts).reduce((sum,value)=>sum+value,0);
 if(!Number.isFinite(total)||total<1||total>100)throw Error('INVALID_SCORE');
 return{total,level:riskClass(total),parts,incidents,concerts:n};
}
// Afgeronde segmentlabels tellen exact op tot de afgeronde totaalscore.
export function displayedRiskParts(score){
 const entries=Object.entries(score.parts).map(([key,value])=>({key,value:value*100,units:Math.floor(value*100)})),target=Math.round(score.total*100);
 let remaining=target-entries.reduce((n,row)=>n+row.units,0);
 for(const row of [...entries].sort((a,b)=>(b.value-b.units)-(a.value-a.units)))if(remaining-->0)row.units++;
 return Object.fromEntries(entries.map(row=>[row.key,row.units/100]));
}
