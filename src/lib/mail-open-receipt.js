import {backgroundSaves,saveRequestInfo} from './background-saves.js';
// Alleen tijdelijk geheugen. Het fragment wordt nooit naar de webserver gestuurd.
export function createMailOpenReceipt({concertId,request,win=window,doc=document,activity=backgroundSaves}={}){
 const token=/^#mail-open=([a-f0-9]{64})$/.exec(win.location.hash)?.[1];
 if(!token)return{shown(){},dispose(){}};
 const session=activity.session;let ready=false,sent=false,disposed=false;
 function record(){
  if(disposed||!ready||sent||doc.visibilityState!=='visible'||doc.prerendering)return;
  sent=true;
  // De beveiligde API controleert ontvanger, module, verzending en token opnieuw.
  // De bestaande achtergrondwachtrij bewaakt fouten en één veilige herpoging.
  const body={concertId,token},info=saveRequestInfo('report-email-open',body);
  const send=async()=>{if(session!==activity.session)return false;return(await request('report-email-open',{method:'POST',body})).ok===true;};
  const off=activity.recovery(info.key,send);
  void Promise.resolve().then(send).then(ok=>{if(ok){activity.resolve(info.key);off();}}).catch(()=>{});
 }
 doc.addEventListener('visibilitychange',record);doc.addEventListener('prerenderingchange',record);
 return{shown(){if(win.location.hash==='#mail-open='+token)win.history.replaceState(null,'',win.location.pathname+win.location.search);ready=true;record();},dispose(){disposed=true;doc.removeEventListener('visibilitychange',record);doc.removeEventListener('prerenderingchange',record);}};
}
