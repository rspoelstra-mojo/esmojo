// Eén stille herpoging voor versiegebonden showwrites en de idempotente mailontvangst. De tweede
// write behoudt exact dezelfde revisie, bron, upload-ID en inhoud. Geen retries
// van accountcreatie, uitnodigingen, mailacties of onbekende mutaties.
const operations={
 'barrier-layout':['draft','complete','reopen','upload','remove-upload'],
 'floor-pressure':['draft','complete','reopen'],
 measure:['draft','complete','reopen','upload','remove','edit-text'],
 'show-profile':['save'],'analysis-finalization':['complete'],'ticket-data':['review','reopen'],
};
export function canRetrySave(action,body={}){return ['report-email-open','production-risks','operational-risk'].includes(action)||operations[action]?.includes(body.operation)||false;}
export async function retrySave(action,options,run,{active=()=>true}={}){
 const snapshot=structuredClone(options),body=snapshot.body||{};
 try{return await run(action,snapshot);}catch(first){
  if(!active()||!first.retryable||!canRetrySave(action,body))throw first;
  // Lees uitsluitend ter bevestiging; nooit een verouderd verzoek op een nieuwe
  // revisie baseren. Bij een afwijkende waarde bewaken de bestaande routes het conflict.
  if(['show-profile','production-risks','ticket-data'].includes(action)){
   try{
    const readAction=action==='production-risks'?'show-risks':action;
    const latest=await run(readAction,{method:'POST',body:{concertId:body.concertId,...(readAction==='show-risks'?{}:{operation:'read'})}});
    if(!active())throw first;
    if(action==='show-profile'&&latest.revision>body.revision&&latest.analyses?.[body.questionNumber]?.status===body.status&&latest.analyses[body.questionNumber].summary===body.summary)return latest;
    if(action==='production-risks'&&latest.production?.revision>body.revision&&latest.production.choices?.[body.field]===body.value)return latest.production;
    const field=latest.workflow?.visitors?.fields?.[body.field];
    if(action==='ticket-data'&&field?.version===body.expectedVersion+1&&((body.operation==='review'&&field.completed_at&&field.content===body.content)||(body.operation==='reopen'&&!field.completed_at)))return latest;
   }catch{/* Een mislukte read start geen extra write met een gewijzigde revisie. */}
  }
  if(!active())throw first;return run(action,snapshot);
 }
}
