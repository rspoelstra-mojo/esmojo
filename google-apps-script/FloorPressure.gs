// Bestaande gestructureerde ticketdata, nooit onderzoek of PDF-extractie.
function esmojoFloorTickets_(target){
  try{
    const data=esmojoReadTicketData_(esmojoShowFile_(target.folder,'bezoekersdata.json'),target.primary.concertId),row=JSON.parse(data.workflow_json).visitors.fields.ticket_sales,shows=saleShows({shows:target.seriesShows});
    if(!row?.completed_at||!validTicketContent('ticket_sales',row.content,shows))return {soldTickets:null,shows:[],ticketVersion:row?.version||0};
    const values=validSaleCount(row.content)?[{...shows[0],count:Number(row.content)}]:parseTicketSales(row.content).map(r=>({date:r.date,time:r.time,count:Number(r.count)}));
    values.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
    return {soldTickets:Math.max(...values.map(r=>r.count)),selection:values.length===1?'single_show':'highest_show_date',shows:values,ticketVersion:row.version,updatedAt:row.completed_at};
  }catch{return {soldTickets:null,shows:[],ticketVersion:0,unavailable:true};}
}
function esmojoSyncFloor_(document,barrier,actor){
  const signature=barrierSignature(barrier),old=document.floorPressure;
  if(!barrier.barrierType){if(!old)return false;document.history.push({at:new Date().toISOString(),actor,field:'floor_pressure',action:'barrier_cleared',before:old});document.floorPressure=null;return true;}
  if(old?.barrierSignature===signature&&(barrier.barrierType!=='seated'||(old.completed&&old.riskLevel==='none')))return false;
  if(old)document.history.push({at:new Date().toISOString(),actor,field:'floor_pressure',action:'barrier_changed',before:old});
  let rows=emptyFloorSections(barrier.barrierType);
  if(barrier.barrierType==='custom'&&old?.barrierType==='custom')rows=old.rows.map(({id,name,visitors,area})=>({id,name,visitors,area}));
  else rows=rows.map(row=>{const previous=old?.rows.find(r=>r.id===row.id);return previous?{...row,visitors:previous.visitors,area:previous.area}:row;});
  const seated=barrier.barrierType==='seated';
  document.floorPressure={revision:(old?.revision||0)+1,barrierType:barrier.barrierType,barrierSignature:signature,rows,riskLevel:seated?'none':null,note:'',completed:seated,automated:seated,completedBy:seated?actor:null,completedAt:seated?new Date().toISOString():null,ticketReference:null,invalidatedAt:old?new Date().toISOString():null};
  return true;
}
function esmojoFloorData_(record){return {rows:record.rows.map(({id,name,visitors,area})=>({id,name,visitors,area})),riskLevel:record.riskLevel,note:record.note};}
function esmojoFloorSummary_(document){const r=document.floorPressure;return r?{revision:r.revision,completed:r.completed,riskLevel:r.riskLevel,active:r.completed&&r.riskLevel!=='none'}:null;}
function esmojoFloorPressure_(request){
  const op=request.operation.slice(6),fields={read:[],draft:['revision','basis','data'],complete:['revision','basis','data'],reopen:['revision','basis']}[op];
  if(!fields)throw Error('VALIDATION');riskKeys(request,['operation','concertId','actor',...fields]);assessmentConcert(request.concertId);
  if(typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
  const target=esmojoResearchTarget_(request.concertId),storage=esmojoReadProductionRisks_(target),document=storage.document,barrier=esmojoBarrierRecord_(document),tickets=esmojoFloorTickets_(target);
  if(esmojoSyncFloor_(document,barrier,request.actor)){document.revision++;esmojoWriteAssessmentDocument_(target,storage);}
  const record=document.floorPressure||null,basis={barrierSignature:barrierSignature(barrier),ticketVersion:tickets.ticketVersion};
  const response=()=>({record:document.floorPressure||null,barrierType:barrier.barrierType,basis,tickets});
  if(op==='read')return response();
  assessmentRevision(request.revision);assessmentKeys(request.basis,['barrierSignature','ticketVersion']);
  if(!record||request.basis.barrierSignature!==basis.barrierSignature||record.barrierSignature!==basis.barrierSignature)throw Error('ASSESSMENT_CONFLICT');
  if(record.barrierType==='seated')throw Error('ASSESSMENT_COMPLETED');
  if(['draft','complete'].includes(op))validateFloorData(request.data,barrier.barrierType,op==='complete');
  if(record.completed){
    if(op==='complete'&&record.ticketReference?.ticketVersion===request.basis.ticketVersion&&JSON.stringify(esmojoFloorData_(record))===JSON.stringify(request.data))return response();
    if(op!=='reopen')throw Error('ASSESSMENT_COMPLETED');
  }
  if(request.revision!==record.revision){if(op==='draft'&&record.revision===request.revision+1&&JSON.stringify(esmojoFloorData_(record))===JSON.stringify(request.data))return response();throw Error('ASSESSMENT_CONFLICT');}
  if(op==='complete'&&request.basis.ticketVersion!==tickets.ticketVersion)throw Error('ASSESSMENT_CONFLICT');
  const next=Object.assign({},record,{revision:record.revision+1});
  if(op==='reopen'){if(!record.completed)throw Error('VALIDATION');next.completed=false;next.completedAt=null;next.completedBy=null;}
  else{
    next.rows=request.data.rows.map(row=>Object.assign({},row,{density:floorDensity(row.visitors,row.area)}));next.riskLevel=request.data.riskLevel;next.note=request.data.note;
    if(op==='draft'&&JSON.stringify(esmojoFloorData_(record))===JSON.stringify(request.data))return response();
    if(op==='complete'){next.completed=true;next.completedBy=request.actor;next.completedAt=new Date().toISOString();next.ticketReference=tickets;next.invalidatedAt=null;}
  }
  document.history.push({at:new Date().toISOString(),actor:request.actor,field:'floor_pressure',action:op,before:record,after:next});document.floorPressure=next;document.revision++;esmojoWriteAssessmentDocument_(target,storage);return response();
}
