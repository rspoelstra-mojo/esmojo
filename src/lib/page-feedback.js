import {backgroundSaves} from './background-saves.js';
// Alleen vaste, voor de gebruiker bestemde meldingen; geen ruwe serverfouten.
// Herstel is een bewuste bestaande actie, nooit een generieke herhaling van POST.
export function createPageFeedback(info,{activity=backgroundSaves}={}){
 const session=activity.session;let disposed=false,bound=false,signature='',retryCurrent=null,extrasCurrent=[],off=()=>{};
 return{
  show(message,retry=null,label='Opnieuw proberen',extras=[]){
   if(disposed||activity.session!==session)return;
   retryCurrent=retry;extrasCurrent=extras;const nextSignature=JSON.stringify([label,...extras.map(item=>item.label)]);if(typeof retry==='function'&&(!bound||signature!==nextSignature)){bound=true;signature=nextSignature;off=activity.recovery(info.key,()=>retryCurrent?.()??false,label,extras.map((item,i)=>({label:item.label,run:()=>extrasCurrent[i]?.run()??false})));}else if(typeof retry!=='function'&&bound){bound=false;off();}
   if(message)activity.notice({...info,message});else activity.hideNotice(info.key);
  },
  clear(){if(!disposed&&activity.session===session)activity.hideNotice(info.key);},
  resolved(){if(!disposed&&activity.session===session)activity.resolve(info.key);},
  dispose(){disposed=true;off();},
 };
}
