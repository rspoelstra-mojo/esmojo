import {createOperationalReviewMemory} from './operational-review-memory.js';
import {createProductionChoiceQueue} from './production-choice-saves.js';
import {accessResultPayload} from './access-result.js';
// Eén showcontext. Vertrouwelijke waarden uitsluitend in tijdelijk sessiegeheugen.
export function createShowData(bundle,request,concertId){
  if(!bundle?.profile||!bundle.profile.analyses||!Number.isSafeInteger(bundle.profile.revision)||!bundle.profile.researchByNumber
    ||!bundle.tickets?.workflow?.visitors?.fields||!Array.isArray(bundle.tickets.shows)||!bundle.barrier?.record||!bundle.floor?.basis
    ||!['ready','pending','not-ready'].includes(bundle.risks?.state)||!Array.isArray(bundle.risks.risks))throw Error('Onvolledige showgegevens.');
  const values=new Map([['show-profile',bundle.profile],['ticket-data',bundle.tickets],['barrier-layout',bundle.barrier],['floor-pressure',bundle.floor],['show-risks',bundle.risks],['analysis-finalization',bundle.profile]]);
  if(bundle.pdf)values.set('show-profile-pdf',bundle.pdf);
  let disposed=false,riskVersion=0,writeTail=Promise.resolve(),localProductionRevision=bundle.risks.production?.revision;const previousValues=new Map(values),pendingWrites=new Set(),listeners=new Set(),operationalReviews=createOperationalReviewMemory(),measureDrafts=new Map();
  let notifyPending=false;const notify=()=>{if(notifyPending||disposed)return;notifyPending=true;queueMicrotask(()=>{notifyPending=false;if(!disposed)for(const listener of listeners){try{listener();}catch{/* Een weergavefout onderbreekt geen opslag. */}}});};
  const forget=key=>{if(values.has(key))previousValues.set(key,values.get(key));values.delete(key);};
  const settled=async()=>{while(pendingWrites.size)await Promise.allSettled([...pendingWrites]);};
  const isRead=(action,body)=>action==='measure'&&body.operation==='download'||action==='show-risks'||body.operation==='read'||(action==='show-profile-pdf'&&body.operation==='status');
  function remember(action,data){
    if(disposed)return;
    if(action==='show-profile-pdf'&&['pending','generating'].includes(data.state)){forget(action);return;}
    if(action==='show-profile'||action==='analysis-finalization'){
      const previous=values.get('show-profile'),profile={...previous,...data};
      if(previous?.researchByNumber||data.researchByNumber)values.set('show-profile',profile);
      values.set('analysis-finalization',profile);
    }else values.set(action,data);
  }
  function overview(data){if(data.overview&&(values.has('show-risks')||Array.isArray(data.overview.risks)&&['ready','pending','not-ready'].includes(data.overview.state))){values.set('show-risks',{...values.get('show-risks'),...data.overview});if(data.overview.production)productionChoices.sync(data.overview.production);riskVersion++;}}
  const context={
    async request(action,options){
      const body=options.body||{},read=isRead(action,body);
      if(read&&disposed)throw Error('Show gesloten.');
      if(read&&!['measure','show-profile-pdf'].includes(action)&&!options.refresh&&!values.has(action)&&context.busy&&previousValues.has(action))return structuredClone(previousValues.get(action));
      if(read&&action!=='measure'&&!options.refresh&&values.has(action)){
        const data=values.get(action);
        if(action==='show-profile-pdf'&&['pending','generating'].includes(data.state))forget(action);
        return structuredClone(data);
      }
      const before=values.get(action);let data;
      try{data=accessResultPayload(await request(action,options));}catch(error){
        if(!disposed){forget(action);if(!read&&action==='measure'){const risks=values.get('show-risks');if(risks?.measureImplementations?.[body.measureId]){const copy=structuredClone(risks);copy.measureImplementations[body.measureId].completedAt=null;copy.measureImplementations[body.measureId].implemented=false;values.set('show-risks',copy);}}else if(!read)for(const key of ['show-profile','analysis-finalization','show-risks','floor-pressure','show-profile-pdf'])forget(key);riskVersion++;}
        notify();throw error;
      }
      if(!disposed){
        if(read){if(action!=='measure')remember(action,data);overview(data);}
        else if(action==='show-profile-pdf'&&body.operation!=='download')remember(action,data);
        else if(['operational-risk','measure'].includes(action)){if(action==='measure'&&body.operation==='download')return data;overview(data);if(action==='measure'&&body.operation==='edit-text'){if(body.measureId?.startsWith('operational:')){operationalReviews.drafts.delete(body.measureId.split(':').at(-1));}if(body.measureId==='production:barrier_layout')forget('barrier-layout');if(body.measureId==='production:floor_pressure')forget('floor-pressure');}}
        else if(action==='production-risks')overview({overview:{production:data}});
        else if(['show-profile','analysis-finalization','ticket-data','barrier-layout','floor-pressure'].includes(action)){
          if(body.operation==='download')return data;
          if(action==='ticket-data'&&['reserve','renew','release'].includes(body.operation))return data;
          remember(action,data);overview(data);
          if(action==='barrier-layout'){
            const signature=r=>JSON.stringify([r?.barrierType,r?.barrierType==='custom'?r.attachment?.sha256:null]);
            if(signature(before?.record)!==signature(data.record))forget('floor-pressure');
          }
          if(action==='ticket-data'){forget('analysis-finalization');forget('floor-pressure');}
          if(['show-profile','analysis-finalization','ticket-data'].includes(action)){forget('show-profile-pdf');forget('show-risks');riskVersion++;}
        }
      }
      notify();return data;
    },
    get busy(){return [...measureDrafts.values()].some(draft=>draft.finishing||draft.work?.size)||pendingWrites.size>0||productionChoices.busy||operationalReviews.busy;},
    async whenSettled(){await Promise.all([...measureDrafts.values()].flatMap(draft=>[...(draft.work||[])].map(work=>work.whenSettled())));await operationalReviews.whenSettled();await productionChoices.whenSettled();await settled();},
    async prepare(){
      // Bij terugkeer de laatst bevestigde snapshots + lopende concepten tonen.
      // Geen volledige opslagachterstand afwachten voordat de show weer opent.
      if(context.busy&&['show-profile','ticket-data','barrier-layout','floor-pressure','show-risks'].every(action=>values.has(action)||previousValues.has(action)))return context;
      await context.whenSettled();if(disposed)throw Error('Show gesloten.');
      const read=action=>context.request(action,{method:'POST',body:{operation:'read',concertId}});
      // Een bevestigde mutatie kan enkele afhankelijke snapshots ongeldig maken.
      for(const action of ['show-profile','ticket-data','barrier-layout','analysis-finalization','floor-pressure'])if(!values.has(action))await read(action);
      if(!values.has('show-risks'))await context.request('show-risks',{method:'POST',body:{concertId}});
      const final=values.get('show-profile').finalization;
      if(final?.categories.visitors.completedAt&&final?.categories.artist.completedAt&&!values.has('show-profile-pdf'))await context.request('show-profile-pdf',{method:'POST',body:{operation:'status',concertId}});
      if(disposed)throw Error('Show gesloten.');return context;
    },
    planningSnapshot(){
      const risks=values.get('show-risks')||(context.busy?previousValues.get('show-risks'):null);
      return structuredClone({profile:{finalization:values.get('show-profile')?.finalization},pdf:values.get('show-profile-pdf'),risks:{
        state:risks?.state,risks:risks?.risks,operational:risks?.operational,measureImplementations:risks?.measureImplementations,
        production:risks?.production||productionChoices.server,
        assessments:risks?.assessments||{barrier:values.get('barrier-layout')?.record,floor:values.get('floor-pressure')?.record},
      }});
    },
    notify,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    version:()=>riskVersion,
    operationalReviews,measureDrafts,
    dispose(){disposed=true;measureDrafts.clear();operationalReviews.clear();productionChoices.cancel();values.clear();previousValues.clear();listeners.clear();},
  };
  const productionChoices=createProductionChoiceQueue({
    save:body=>context.request('production-risks',{method:'POST',body:{concertId,...body}}),
    read:async()=>{const data=await context.request('show-risks',{method:'POST',body:{concertId},refresh:true});return data.production;},
  });
  if(bundle.risks.production)productionChoices.sync(bundle.risks.production);
  context.productionChoices=productionChoices;
  const perform=context.request;
  context.request=(action,options={})=>{
    const body=options.body||{},write=!isRead(action,body)&&body.operation!=='download'&&!(action==='ticket-data'&&['reserve','renew','release'].includes(body.operation));
    if(!write)return perform(action,options);
    const queued=structuredClone(options),basis=productionChoices.server?.revision;
    const task=writeTail.then(async()=>{
      if(disposed)throw Error('Show gesloten.');
      // Alleen een revisie die door onze eigen eerdere write is opgeschoven
      // doorgeven. Een externe revisie wordt nooit stil opnieuw gebaseerd.
      if(action==='production-risks'&&queued.body.revision===basis&&productionChoices.server?.revision===localProductionRevision)queued.body.revision=localProductionRevision;
      const result=await perform(action,queued),production=result.overview?.production||(action==='production-risks'?result:null);
      if(production)localProductionRevision=production.revision;
      return result;
    });
    writeTail=task.catch(()=>{});pendingWrites.add(task);const finished=()=>{pendingWrites.delete(task);notify();};task.then(finished,finished);return task;
  };
  return context;
}
