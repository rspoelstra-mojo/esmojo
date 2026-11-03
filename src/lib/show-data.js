// Eén show, één pagina-levensduur. Vertrouwelijke waarden uitsluitend in geheugen.
export function createShowData(bundle,request){
  if(!bundle?.profile||!bundle.profile.analyses||!Number.isSafeInteger(bundle.profile.revision)||!bundle.profile.researchByNumber
    ||!bundle.tickets?.workflow?.visitors?.fields||!Array.isArray(bundle.tickets.shows)||!bundle.barrier?.record||!bundle.floor?.basis
    ||!['ready','pending','not-ready'].includes(bundle.risks?.state)||!Array.isArray(bundle.risks.risks))throw Error('Onvolledige showgegevens.');
  const values=new Map([['show-profile',bundle.profile],['ticket-data',bundle.tickets],['barrier-layout',bundle.barrier],['floor-pressure',bundle.floor],['show-risks',bundle.risks],['analysis-finalization',bundle.profile]]);
  if(bundle.pdf)values.set('show-profile-pdf',bundle.pdf);
  let disposed=false,riskVersion=0;
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
  function overview(data){if(data.overview&&values.has('show-risks')){values.set('show-risks',{...values.get('show-risks'),...data.overview});riskVersion++;}}
  return{
    async request(action,options){
      const body=options.body||{},read=isRead(action,body);
      if(read&&disposed)throw Error('Show gesloten.');
      if(read&&values.has(action)){
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
    version:()=>riskVersion,
    dispose(){disposed=true;values.clear();},
  };
}
