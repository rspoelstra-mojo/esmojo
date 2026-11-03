import {createProductionChoiceQueue} from './production-choice-saves.js';
// Eén showcontext. Vertrouwelijke waarden uitsluitend in tijdelijk sessiegeheugen.
export function createShowData(bundle,request,concertId){
  if(!bundle?.profile||!bundle.profile.analyses||!Number.isSafeInteger(bundle.profile.revision)||!bundle.profile.researchByNumber
    ||!bundle.tickets?.workflow?.visitors?.fields||!Array.isArray(bundle.tickets.shows)||!bundle.barrier?.record||!bundle.floor?.basis
    ||!['ready','pending','not-ready'].includes(bundle.risks?.state)||!Array.isArray(bundle.risks.risks))throw Error('Onvolledige showgegevens.');
  const values=new Map([['show-profile',bundle.profile],['ticket-data',bundle.tickets],['barrier-layout',bundle.barrier],['floor-pressure',bundle.floor],['show-risks',bundle.risks],['analysis-finalization',bundle.profile]]);
  if(bundle.pdf)values.set('show-profile-pdf',bundle.pdf);
  let disposed=false,riskVersion=0;const pendingWrites=new Set();
  const settled=async()=>{while(pendingWrites.size)await Promise.allSettled([...pendingWrites]);};
  const isRead=(action,body)=>action==='show-risks'||body.operation==='read'||(action==='show-profile-pdf'&&body.operation==='status');
  function remember(action,data){
    if(disposed)return;
    if(action==='show-profile-pdf'&&['pending','generating'].includes(data.state)){values.delete(action);return;}
    if(action==='show-profile'||action==='analysis-finalization'){
      const previous=values.get('show-profile'),profile={...previous,...data};
      if(previous?.researchByNumber||data.researchByNumber)values.set('show-profile',profile);
      values.set('analysis-finalization',profile);
    }else values.set(action,data);
  }
  function overview(data){if(data.overview&&values.has('show-risks')){values.set('show-risks',{...values.get('show-risks'),...data.overview});if(data.overview.production)productionChoices.sync(data.overview.production);riskVersion++;}}
  const context={
    async request(action,options){
      const body=options.body||{},read=isRead(action,body);
      if(read&&disposed)throw Error('Show gesloten.');
      if(read&&!options.refresh&&values.has(action)){
        const data=values.get(action);
        if(action==='show-profile-pdf'&&['pending','generating'].includes(data.state))values.delete(action);
        return structuredClone(data);
      }
      const before=values.get(action);let data;
      try{data=await request(action,options);}catch(error){
        if(!disposed){values.delete(action);if(!read)for(const key of ['show-profile','analysis-finalization','show-risks','floor-pressure','show-profile-pdf'])values.delete(key);riskVersion++;}
        throw error;
      }
      if(!disposed){
        if(read){remember(action,data);overview(data);}
        else if(action==='show-profile-pdf'&&body.operation!=='download')remember(action,data);
        else if(action==='production-risks')overview({overview:{production:data}});
        else if(['show-profile','analysis-finalization','ticket-data','barrier-layout','floor-pressure'].includes(action)){
          if(body.operation==='download')return data;
          if(action==='ticket-data'&&['reserve','renew','release'].includes(body.operation))return data;
          remember(action,data);overview(data);
          if(action==='barrier-layout'){
            const signature=r=>JSON.stringify([r?.barrierType,r?.barrierType==='custom'?r.attachment?.sha256:null]);
            if(signature(before?.record)!==signature(data.record))values.delete('floor-pressure');
          }
          if(action==='ticket-data'){values.delete('analysis-finalization');values.delete('floor-pressure');}
          if(['show-profile','analysis-finalization','ticket-data'].includes(action)){values.delete('show-profile-pdf');values.delete('show-risks');riskVersion++;}
        }
      }
      return data;
    },
    get busy(){return pendingWrites.size>0||productionChoices.busy;},
    async whenSettled(){await productionChoices.whenSettled();await settled();},
    async prepare(){
      await context.whenSettled();if(disposed)throw Error('Show gesloten.');
      const read=action=>context.request(action,{method:'POST',body:{operation:'read',concertId}});
      // Een bevestigde mutatie kan enkele afhankelijke snapshots ongeldig maken.
      for(const action of ['show-profile','ticket-data','barrier-layout','analysis-finalization','floor-pressure'])if(!values.has(action))await read(action);
      if(!values.has('show-risks'))await context.request('show-risks',{method:'POST',body:{concertId}});
      const final=values.get('show-profile').finalization;
      if(final?.categories.visitors.completedAt&&final?.categories.artist.completedAt&&!values.has('show-profile-pdf'))await context.request('show-profile-pdf',{method:'POST',body:{operation:'status',concertId}});
      if(disposed)throw Error('Show gesloten.');return context;
    },
    version:()=>riskVersion,
    dispose(){disposed=true;productionChoices.cancel();values.clear();},
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
    const task=perform(action,options);
    if(write){pendingWrites.add(task);task.then(()=>pendingWrites.delete(task),()=>pendingWrites.delete(task));}
    return task;
  };
  return context;
}
