import {createReportsMigrationTask,migrationType as reportsMigrationType} from '../reports-migration/task.js';
import {createReportsSchemaTask,reportsSchemaTaskType} from '../reports-schema-task.js';
import {createAccessTask,accessTaskType} from '../account-access/task.js';
import {ensureShowsValidation} from '../shows-validation-task.js';
import {createShowMigration} from '../show-migration.js';
import {showMigrationFailure} from '../show-migration-errors.js';
import {createProfiles} from '../account-profiles.js';
import {isAdministrator,hasModule} from '../../shared/account-modules.js';
import {createTaskStore} from './store.js';
import {createBackgroundTasks} from './engine.js';
export const taskDefinitions=Object.freeze({[reportsMigrationType]:Object.freeze({title:'Rapportages-migratie',module:'reports',version:1,idempotent:true}),[reportsSchemaTaskType]:Object.freeze({title:'Dataverse klaarzetten voor Rapportages',module:'reports',version:1,idempotent:true}),[accessTaskType]:Object.freeze({title:'Snelle toegangscontrole',module:'shows',version:1,idempotent:true}),'shows-migration-v1':Object.freeze({title:'Shows-migratie',module:'shows',version:1,idempotent:true}),'shows-validation-v1':Object.freeze({title:'Shows-eindvalidatie',module:'shows',version:1,idempotent:true})});
export const backgroundTaskModule=type=>typeof type==='string'&&Object.hasOwn(taskDefinitions,type)?taskDefinitions[type].module:null;
export function createTaskRegistry({env=process.env,migrate=createShowMigration({env}),validate=createShowMigration({env,readOnly:true}),access=createAccessTask({env}),reportsSchema=createReportsSchemaTask({env}),reportsMigration=createReportsMigrationTask({env})}={}){
 const adapter=(type,service)=>({...taskDefinitions[type],
  async step({cursor,actor,authorizationExpiresAt}){
   const result=await service(cursor?{operation:'advance',token:cursor}:{operation:'start'},actor,{authorizationExpiresAt});
   if(typeof result?.token!=='string'||!['running','blocked','complete'].includes(result.status))throw Error('TASK_CONTRACT');
   const waiting=result.status==='blocked'&&result.reason==='KEY_INDEX_PENDING';
   return{cursor:result.token,status:waiting?'waiting':result.status==='running'?'ready':result.status,delayMs:waiting?300000:0,public:{label:result.label,total:result.total,progress:result.progress,...(result.status==='blocked'&&!waiting?{error:'De schemacontrole blokkeert de taak. Controleer de gemelde tabel of sleutel.',code:'MIGRATION_SCHEMA'}:{})}};
  },
  failure(error){const failure=showMigrationFailure(error);return{...failure,uncertain:['MIGRATION_UNCONFIRMED','SETUP_TEMPORARY'].includes(failure.code)};}
 });return{[reportsMigrationType]:reportsMigration,[reportsSchemaTaskType]:reportsSchema,[accessTaskType]:access,'shows-migration-v1':adapter('shows-migration-v1',migrate),'shows-validation-v1':adapter('shows-validation-v1',validate)};
}
export function createApplicationTasks({env=process.env,profiles=createProfiles({env}),store=createTaskStore({env}),registry=createTaskRegistry({env}),now=Date.now}={}){
 const authorize=async(actor,definition)=>{let profile;try{profile=await profiles('self',actor);}catch(error){if(error.message==='FORBIDDEN')return false;throw error;}return profile.id===actor&&profile.activated===true&&!profile.disabled&&isAdministrator(profile)&&hasModule(profile,definition.module);};
 const tasks=createBackgroundTasks({store,registry,authorize,now});return{...tasks,async diagnoseReports(){
  const row=await store.get(reportsMigrationType);if(!row)throw Error('TASK_NOT_FOUND');if(row.state.expiresAt<=now())throw Error('TASK_EXPIRED');
  if(row.state.handlerVersion!==registry[reportsMigrationType].version||!await authorize(row.state.actor,registry[reportsMigrationType]))throw Error('FORBIDDEN');
  return registry[reportsMigrationType].diagnose({actor:row.state.actor});
 },ensureValidation:()=>ensureShowsValidation({store,tasks,now})};
}
