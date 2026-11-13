import {reportsSchemaHash,reportsSetupPlan,reportsChoiceDefinitions,reportsTablesContract,reportsDependenciesContract} from './reports-schema.js';
import {createDataverseChoices} from './dataverse-choices.js';
import {createDataverseTables} from './dataverse-tables.js';
import {metadataProcessing} from './dataverse-setup-retry.js';
export const reportsSchemaTaskType='reports-schema-v1';
export function createReportsSchemaTask({env=process.env,request=fetch,now=Date.now,plan=reportsSetupPlan,dependencies=createDataverseTables({env,request,now,readOnly:true,contract:reportsDependenciesContract}),choices=createDataverseChoices({env,request,now,definitions:reportsChoiceDefinitions}),tables=createDataverseTables({env,request,now,contract:reportsTablesContract}),verify=createDataverseTables({env,request,now,readOnly:true,contract:reportsTablesContract})}={}){
 const view=(state,status='ready',extra={})=>({cursor:JSON.stringify(state),status,...extra,public:{label:state.index===plan.length?'Dataverse is ingericht en gecontroleerd voor Rapportages. Er zijn nog geen rapportages overgezet.':plan[state.index].phase+' · '+plan[state.index].title,total:plan.length,progress:{phase:state.index===plan.length?'complete':'metadata',current:state.index,verifiedRecords:0,verifiedFiles:0},...(extra.public||{})}});
 return{title:'Dataverse klaarzetten voor Rapportages',module:'reports',version:1,idempotent:true,
  async step({cursor}){
   const state=cursor?JSON.parse(cursor):{schema:reportsSchemaHash,index:0};
   if(state.schema!==reportsSchemaHash||!Number.isInteger(state.index)||state.index<0||state.index>plan.length||Object.keys(state).sort().join(',')!=='index,schema')throw Error('REPORTS_SCHEMA_CHANGED');
   const start=now();
   // Bound batches reduce repeated authorization/connection overhead. Each fixed
   // metadata action is idempotent and re-reads before create. No data endpoints.
   for(let count=0;state.index<plan.length&&count<4&&now()-start<60000;count++){
    const next=plan[state.index];if(count&&(next.kind==='choice'||['publish','table'].includes(next.subkind)))break;
    const action=next.kind==='dependency'?dependencies:next.kind==='choice'?choices:next.kind==='verify'?verify:tables;
    let result;try{result=await action(next.kind==='choice'?{operation:'create',name:next.name}:{operation:'apply',stepId:next.stepId});}catch(error){const waiting=metadataProcessing(error);if(!waiting)throw error;if(waiting.retryAfterSeconds>300)return view(state,'blocked',{public:{code:'REPORTS_SCHEMA_WAIT',error:'Dataverse vraagt meer dan vijf minuten wachttijd. Hervat later; bevestigde onderdelen blijven behouden.'}});return view(state,'waiting',{delayMs:Math.min(300000,waiting.retryAfterSeconds*1000),public:{label:next.phase+' · '+next.title+' · Dataverse verwerkt deze stap nog.'}});}
    if(result?.status==='pending')return view(state,'waiting',{delayMs:30000,public:{label:next.phase+' · '+next.title+' · Wachten op bevestiging door Dataverse.'}});
    if(result?.status!=='verified'||result.verified!==true)return view(state,'blocked',{public:{code:'REPORTS_SCHEMA_CONFLICT',error:'De bestaande definitie wijkt af. Er is niets overschreven. '+next.title+(result?.difference?' · '+result.difference:''),label:next.phase+' · '+next.title}});
    state.index++;if(next.kind==='choice'||['publish','table'].includes(next.subkind))break;
   }
   return view(state,state.index===plan.length?'complete':'ready');
  },
  failure(error){const temporary=['SETUP_THROTTLED','SETUP_TEMPORARY','DRIVE_UNAVAILABLE'].includes(error.message);return{code:['CHOICE_CONFIG','CHOICE_AUTH','CHOICE_FORBIDDEN','CHOICE_SOLUTION','CHOICE_LANGUAGE','TABLE_PROTECTED','REPORTS_SCHEMA_CHANGED'].includes(error.message)?error.message:temporary?error.message:'REPORTS_SCHEMA_UNCONFIRMED',error:'De inrichting wacht op controle. Bestaande instellingen en alle rapportages zijn behouden.',retryable:temporary,uncertain:['TABLE_CREATE_UNCONFIRMED','TABLE_PRIMARY_UNCONFIRMED','TABLE_PUBLISH_UNCONFIRMED','CHOICE_CREATE_UNCONFIRMED','CHOICE_PUBLISH_UNCONFIRMED'].includes(error.message)};}
 };
}
