import {createShowMigration} from '../show-migration.js';
import {showMigrationFailure} from '../show-migration-errors.js';
import {createProfiles} from '../account-profiles.js';
import {isAdministrator,hasModule} from '../../shared/account-modules.js';
import {createTaskStore} from './store.js';
import {createBackgroundTasks} from './engine.js';
export const taskDefinitions=Object.freeze({'shows-migration-v1':Object.freeze({title:'Shows-migratie',module:'shows',version:1,idempotent:true})});
export const backgroundTaskModule=type=>typeof type==='string'&&Object.hasOwn(taskDefinitions,type)?taskDefinitions[type].module:null;
export function createTaskRegistry({env=process.env,migrate=createShowMigration({env})}={}){
 return{'shows-migration-v1':{...taskDefinitions['shows-migration-v1'],
  async step({cursor,actor}){
   const result=await migrate(cursor?{operation:'advance',token:cursor}:{operation:'start'},actor);
   if(typeof result?.token!=='string'||!['running','blocked','complete'].includes(result.status))throw Error('TASK_CONTRACT');
   const waiting=result.status==='blocked'&&result.reason==='KEY_INDEX_PENDING';
   return{cursor:result.token,status:waiting?'waiting':result.status==='running'?'ready':result.status,delayMs:waiting?300000:0,public:{label:result.label,total:result.total,progress:result.progress,...(result.status==='blocked'&&!waiting?{error:'De schemacontrole blokkeert de taak. Controleer de gemelde tabel of sleutel.',code:'MIGRATION_SCHEMA'}:{})}};
  },
  failure(error){const failure=showMigrationFailure(error);return{...failure,uncertain:['MIGRATION_UNCONFIRMED','SETUP_TEMPORARY'].includes(failure.code)};}
 }};
}
export function createApplicationTasks({env=process.env,profiles=createProfiles({env}),store=createTaskStore({env}),registry=createTaskRegistry({env}),now=Date.now}={}){
 const authorize=async(actor,definition)=>{let profile;try{profile=await profiles('self',actor);}catch(error){if(error.message==='FORBIDDEN')return false;throw error;}return profile.id===actor&&profile.activated===true&&!profile.disabled&&isAdministrator(profile)&&hasModule(profile,definition.module);};
 return createBackgroundTasks({store,registry,authorize,now});
}
