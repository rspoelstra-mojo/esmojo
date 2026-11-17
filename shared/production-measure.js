// Beoordeling van Barrieropstelling en Vloerdruk (v2): risicoklasse en de keuze "Beheersmaatregel noodzakelijk".
// Geen risico: geen toelichting en geen maatregel. Laag/Midden/Hoog: verplichte Ja/Nee-keuze (bij afronden). De maatregeltekst
// wordt niet bij de beoordeling ingevuld maar bij Maatregelen uitgewerkt (riskNote bij barrier, note bij vloerdruk, door de server beheerd).
import {assessmentKeys,productionRiskLevels,barrierTypes,isStandardBarrierType,validUploadId} from './barrier-layout.js';
import {floorSectionDefinitions,floorDensity} from './floor-pressure.js';
const levels=['none','low','medium','high'];
// Records van vóór de keuze hebben geen measureRequired: Midden/Hoog met maatregeltekst gold als maatregel.
export function productionMeasureRequired(record,text){
 if(!record||!levels.includes(record.riskLevel)||record.riskLevel==='none')return false;
 if(typeof record.measureRequired==='boolean')return record.measureRequired;
 return ['medium','high'].includes(record.riskLevel)&&typeof text==='string'&&text.trim()!=='';
}
const measureValue=value=>{if(value!==null&&typeof value!=='boolean')throw Error('VALIDATION');return value;};
export function validateBarrierData(value,complete=false){
 assessmentKeys(value,['barrierType','riskLevel','notes','uploadId','measureRequired']);
 measureValue(value.measureRequired);
 if(value.barrierType!==null&&!barrierTypes.some(row=>row.value===value.barrierType))throw Error('VALIDATION');
 if(value.riskLevel!==null&&!productionRiskLevels.some(row=>row.value===value.riskLevel))throw Error('VALIDATION');
 if(value.barrierType==='custom'){
  if(typeof value.notes!=='string'||value.notes.length>4000||/\x00/.test(value.notes)||(value.uploadId!==null&&!validUploadId(value.uploadId)))throw Error('VALIDATION');
 }else if(value.notes!==null||value.uploadId!==null)throw Error('VALIDATION');
 if(complete&&(!value.barrierType||!value.riskLevel||(value.barrierType==='custom'&&(!value.notes.trim()||!value.uploadId))))throw Error('VALIDATION');
 if(value.riskLevel==='none'&&value.measureRequired===true)throw Error('VALIDATION');
 if(complete&&['low','medium','high'].includes(value.riskLevel)&&typeof value.measureRequired!=='boolean')throw Error('VALIDATION');
 return {barrierType:value.barrierType,riskLevel:value.riskLevel,notes:complete&&value.barrierType==='custom'?value.notes.trim():value.notes,uploadId:value.uploadId,measureRequired:value.riskLevel==='none'?false:value.measureRequired};
}
export function validateFloorData(value,type,complete=false){
 assessmentKeys(value,['rows','riskLevel','measureRequired']);
 measureValue(value.measureRequired);
 if(!barrierTypes.some(row=>row.value===type)||type==='seated'||!Array.isArray(value.rows)||!value.rows.length||JSON.stringify(value).length>80000
  ||(value.riskLevel!==null&&!productionRiskLevels.some(row=>row.value===value.riskLevel)))throw Error('VALIDATION');
 const fixed=floorSectionDefinitions[type],names=new Set(),ids=new Set();
 value.rows.forEach((row,i)=>{
  assessmentKeys(row,['id','name','visitors','area']);
  if(typeof row.id!=='string'||!/^[a-z0-9_-]{1,80}$/.test(row.id)||ids.has(row.id)||typeof row.name!=='string'||row.name.length>120||/[\x00-\x1f]/.test(row.name))throw Error('VALIDATION');
  ids.add(row.id);
  if(type!=='custom'||i===0){if(!fixed[i]||row.id!==fixed[i][0]||row.name!==fixed[i][1])throw Error('VALIDATION');}
  const key=row.name.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  if(complete&&(!key||names.has(key)))throw Error('VALIDATION');names.add(key);
  if(row.visitors!==null&&(!Number.isSafeInteger(row.visitors)||row.visitors<0))throw Error('VALIDATION');
  if(row.area!==null&&(typeof row.area!=='number'||!Number.isFinite(row.area)||row.area<0))throw Error('VALIDATION');
  if(complete&&floorDensity(row.visitors,row.area)===null)throw Error('VALIDATION');
 });
 if(type!=='custom'&&value.rows.length!==fixed.length)throw Error('VALIDATION');
 if(value.riskLevel==='none'&&value.measureRequired===true)throw Error('VALIDATION');
 if(complete&&(!value.riskLevel||(['low','medium','high'].includes(value.riskLevel)&&typeof value.measureRequired!=='boolean')))throw Error('VALIDATION');
 return {rows:value.rows,riskLevel:value.riskLevel,measureRequired:value.riskLevel==='none'?false:value.measureRequired};
}
