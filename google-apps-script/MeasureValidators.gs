// Gegenereerd uit shared/measure-workflow.js: imports/exports verwijderd.
const measureLevels=['none','low','medium','high'];
const measureUploadLimit=2*1024*1024;
const measureUploadTypes={'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'};
function measureDefinitions(show,risks={}){
 const rows=[];let known=true;
 for(const group of productionRiskGroups)for(const item of group.items){
  if(item.id==='entrance_process'&&show.venue?.trim().toLocaleLowerCase('nl-NL')==='gashouder'||item.conditional&&risks.production?.choices[item.id]===false)continue;
  const key={barrier_layout:'barrier',floor_pressure:'floor'}[item.id]||item.id,record=risks.assessments?.[key];
  if(!record||!measureLevels.includes(record.riskLevel)){known=false;continue;}
  if(!['medium','high'].includes(record.riskLevel))continue;
  const text=key==='floor'?record.note:record.riskNote;
  if(typeof text!=='string'||!text.trim()){known=false;continue;}
  rows.push({id:'production:'+item.id,sourceType:'production',sourceId:item.id,title:item.title,text:text.trim(),description:typeof record.description==='string'?record.description:null,origin:group.title+' · '+item.title,originalRiskLevel:record.riskLevel});
 }
 if(risks.state==='ready'&&risks.operational?.source)for(const risk of risks.risks||[]){
  const record=risks.operational.assessments?.[risk.id];
  if(['medium','high'].includes(record?.riskLevel)&&typeof record.riskNote==='string'&&record.riskNote.trim())rows.push({id:'operational:'+risks.operational.source.revision+':'+risk.id,sourceType:'operational',sourceId:risk.id,sourceRevision:risks.operational.source.revision,title:risk.title,text:record.riskNote.trim(),description:risk.description||null,origin:'Operationele risico’s · '+risk.title,originalRiskLevel:record.riskLevel});
 }
 return{known,rows:rows.map(row=>({...row,basis:JSON.stringify([row.id,row.originalRiskLevel,row.text])}))};
}
function measureState(row,record){
 const matched=Number.isSafeInteger(record?.revision)&&record.revision>0&&record.basis===row.basis&&record.originalRiskLevel===row.originalRiskLevel;
 return{revision:record?.revision||0,basis:row.basis,originalRiskLevel:row.originalRiskLevel,riskLevelAfter:matched?record.riskLevelAfter:null,briefing:record?.briefing===true,completedAt:matched?record.completedAt||null:null,implemented:Boolean(matched&&measureLevels.includes(record.riskLevelAfter)&&typeof record.completedAt==='string'&&Number.isFinite(Date.parse(record.completedAt))),attachments:record?.attachments||[]};
}
function measureKeys(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))throw Error('VALIDATION');}
function validMeasureId(value){return typeof value==='string'&&(/^(?:production:(?:entrance_process|barrier_layout|floor_pressure|escape_routes|fireworks|open_fire|lasers|drones)|operational:[a-f0-9]{64}:R[0-9]{2})$/.test(value));}
function measureText(value){if(typeof value!=='string'||!value.trim()||value.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))throw Error('VALIDATION');return value.trim();}
function validMeasureUploadId(value){return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);}
function measureFileSignature(bytes,mime){const b=Array.from(bytes,x=>(x+256)%256);return mime==='application/pdf'?b.length>=8&&[37,80,68,70,45].every((v,i)=>b[i]===v):mime==='image/png'?b.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)&&String.fromCharCode(...b.slice(12,16))==='IHDR':mime==='image/jpeg'?b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255:false;}
function validateMeasureRequest(input){
 const op=input?.operation,operations={read:[],draft:['revision','basis','data'],complete:['revision','basis','data'],reopen:['revision','basis'],'edit-text':['revision','basis','text'],upload:['revision','basis','uploadId','fileName','mime','base64','sha256'],remove:['revision','basis','uploadId'],download:['uploadId']},fields=Object.hasOwn(operations,op)?operations[op]:null;
 if(!fields)throw Error('VALIDATION');measureKeys(input,['operation','concertId','measureId',...fields]);
 if(typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)||!validMeasureId(input.measureId))throw Error('VALIDATION');
 if(fields.includes('revision')&&(!Number.isSafeInteger(input.revision)||input.revision<0))throw Error('VALIDATION');
 if(fields.includes('basis')&&(typeof input.basis!=='string'||input.basis.length>25000||!input.basis))throw Error('VALIDATION');
 if(fields.includes('data')){measureKeys(input.data,['riskLevelAfter','briefing']);if(input.data.riskLevelAfter!==null&&!measureLevels.includes(input.data.riskLevelAfter)||typeof input.data.briefing!=='boolean'||op==='complete'&&input.data.riskLevelAfter===null)throw Error('VALIDATION');}
 if(fields.includes('text'))measureText(input.text);
 if(fields.includes('uploadId')&&!validMeasureUploadId(input.uploadId))throw Error('VALIDATION');
 if(op==='upload'){
  if(!Object.hasOwn(measureUploadTypes,input.mime)||typeof input.fileName!=='string'||!input.fileName.trim()||input.fileName.length>180||/[\x00-\x1f/\\]/.test(input.fileName)||!(input.mime==='application/pdf'?/\.pdf$/i:input.mime==='image/png'?/\.png$/i:/\.jpe?g$/i).test(input.fileName)||typeof input.base64!=='string'||!input.base64||input.base64.length>Math.ceil(measureUploadLimit/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)||!/^[a-f0-9]{64}$/.test(input.sha256||''))throw Error('VALIDATION');
 }
 return{...input,...(op==='edit-text'?{text:measureText(input.text)}:{})};
}
