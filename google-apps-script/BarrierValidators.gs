// Gegenereerd uit shared/barrier-layout.js; imports en export-keywords verwijderd.
const barrierTypes = [
  {value:'seated',label:'Seated',imageFile:'Minimalistische zitplaatsindeling met podium.png'},
  {value:'end_stage_no_gc',label:'End-stage zonder GC',imageFile:'Staankaart met podiumindeling.png'},
  {value:'end_stage_gc',label:'End-stage met GC',imageFile:'Minimalistische concertzaalindeling.png'},
  {value:'end_stage_catwalk_no_gc',label:'End-stage met catwalk zonder GC',imageFile:'Strakke Plattegrond met Podium en Catwalk.png'},
  {value:'end_stage_catwalk_gc',label:'End-stage met catwalk en GC',imageFile:'Concertindeling met Gouden Cirkels.png'},
  {value:'custom',label:'Afwijkend ontwerp',imageFile:null},
];
const productionRiskLevels = [
  {value:'none',label:'Geen risico',hue:140},{value:'low',label:'Laag',hue:75},
  {value:'medium',label:'Midden',hue:35},{value:'high',label:'Hoog',hue:0},
];
const barrierUploadLimit = 2*1024*1024;
function assessmentKeys(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))throw Error('VALIDATION');}
function assessmentConcert(value){if(typeof value!=='string'||!value.trim()||value.length>240||/[\x00-\x1f/\\]/.test(value))throw Error('VALIDATION');}
function assessmentRevision(value){if(!Number.isSafeInteger(value)||value<0)throw Error('VALIDATION');}
function validUploadId(value){return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);}
function validateBarrierData(value,complete=false){
  assessmentKeys(value,['barrierType','riskLevel','notes','uploadId']);
  if(value.barrierType!==null&&!barrierTypes.some(row=>row.value===value.barrierType))throw Error('VALIDATION');
  if(value.riskLevel!==null&&!productionRiskLevels.some(row=>row.value===value.riskLevel))throw Error('VALIDATION');
  if(value.barrierType==='custom'){
    if(typeof value.notes!=='string'||value.notes.length>4000||/\x00/.test(value.notes)||(value.uploadId!==null&&!validUploadId(value.uploadId)))throw Error('VALIDATION');
  }else if(value.notes!==null||value.uploadId!==null)throw Error('VALIDATION');
  if(complete&&(!value.barrierType||!value.riskLevel||(value.barrierType==='custom'&&(!value.notes.trim()||!value.uploadId))))throw Error('VALIDATION');
  return {barrierType:value.barrierType,riskLevel:value.riskLevel,notes:value.notes,uploadId:value.uploadId};
}
function emptyBarrier(){return {revision:0,barrierType:null,riskLevel:null,notes:null,attachment:null,completed:false,completedBy:null,completedAt:null};}
function barrierData(record){return {barrierType:record.barrierType,riskLevel:record.riskLevel,notes:record.barrierType==='custom'?record.notes||'':null,uploadId:record.barrierType==='custom'?record.attachment?.uploadId||null:null};}
function barrierSignature(record){return JSON.stringify([record.barrierType,record.barrierType==='custom'?record.attachment?.sha256||null:null]);}
function attachmentSignatureValid(bytes,mime){
  const b=Array.from(bytes,x=>(x+256)%256);
  return mime==='image/png'?b.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)&&String.fromCharCode(...b.slice(12,16))==='IHDR':mime==='application/pdf'?b.length>=8&&[37,80,68,70,45].every((v,i)=>b[i]===v):false;
}
