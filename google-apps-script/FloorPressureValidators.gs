// Gegenereerd uit shared/floor-pressure.js; imports en export-keywords verwijderd.
const floorSectionDefinitions={
  end_stage_no_gc:[['standing','Staanplaatsen']],end_stage_catwalk_no_gc:[['standing','Staanplaatsen']],
  end_stage_gc:[['standing','Staanplaatsen'],['gc','Golden Circle']],
  end_stage_catwalk_gc:[['standing','Staanplaatsen'],['gc_left','Golden Circle Left'],['gc_right','Golden Circle Right']],
  custom:[['standing','Staanplaatsen']],seated:[],
};
function emptyFloorSections(type){return (floorSectionDefinitions[type]||[]).map(([id,name])=>({id,name,visitors:null,area:null}));}
function floorDensity(visitors,area){
  if(!Number.isSafeInteger(visitors)||visitors<0||typeof area!=='number'||!Number.isFinite(area)||area<=0)return null;
  const result=Math.round((visitors/area+Number.EPSILON)*100)/100;return Number.isFinite(result)?result:null;
}
function validateFloorData(value,type,complete=false){
  assessmentKeys(value,['rows','riskLevel','note']);
  if(!barrierTypes.some(row=>row.value===type)||type==='seated'||!Array.isArray(value.rows)||!value.rows.length||JSON.stringify(value).length>80000
    ||(value.riskLevel!==null&&!productionRiskLevels.some(row=>row.value===value.riskLevel))||typeof value.note!=='string'||value.note.length>4000||/\x00/.test(value.note))throw Error('VALIDATION');
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
  if(complete&&(!value.riskLevel||(['none','medium','high'].includes(value.riskLevel)&&!value.note.trim())))throw Error('VALIDATION');
  return value;
}
function parseVisitorCount(text){if(typeof text!=='string'||!text.trim()||! /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text.trim()))return null;const n=Number(text.replace(/\./g,''));return Number.isSafeInteger(n)&&n>=0?n:null;}
function parseFloorArea(text){
  if(typeof text!=='string')return null;const value=text.trim();
  if(!/^(?:\d+(?:[.,]\d+)?|\d{1,3}(?:\.\d{3})+,\d+)$/.test(value))return null;
  const clean=value.includes(',')?value.replace(/\./g,'').replace(',','.'):value,n=Number(clean);return Number.isFinite(n)&&n>=0?n:null;
}
