import {createProfiles} from '../account-profiles.js';
import {hasModule,isAdministrator} from '../../shared/account-modules.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportsMutations} from './mutations.js';
import {createReportsOperationalStore} from './operational.js';
import {createReportsWriter} from '../reports-migration/writer.js';
import {reportRecord} from '../reports-migration/contract.js';
import {originalReportSettings} from './settings.js';
import {validateOnTrackRecipients} from '../ontrack-store.js';
import {digest,recordKey} from '../show-migration-writer.js';
export function createNativeReportRecipients({env=process.env,repository=createNativeReportsRepository({env}),mutations=createNativeReportsMutations({env,repository}),operational=createReportsOperationalStore({env}),writer=createReportsWriter({env}),profiles=createProfiles({env})}={}){
 const repo=repository;
 async function authorize(actor){const profile=await profiles('self',actor);if(profile?.id!==actor||!profile.activated||profile.disabled||!hasModule(profile,'reports')||!isAdministrator(profile))throw Error('FORBIDDEN');}
 async function rows(){const result=await repo.query('esmojo_rapportontvanger',{filter:"esmojo_scope eq 'ontrack-reports-v1'"}),seen=new Set();for(const row of result){const id=row.esmojo_authgebruikersid;if(typeof id!=='string'||seen.has(id)||row.esmojo_ontvangerhash!==digest(id)||row.esmojo_sleutel!==recordKey('esmojo_rapportontvanger','ontrack-recipient/'+id))throw Error('REPORT_CONFLICT');seen.add(id);}return result;}
 async function selection(state){
  const current=state??await operational.read(),revision=current?.revision??(await originalReportSettings(repo)).revision,all=await rows();
  if(!Number.isSafeInteger(revision)||revision<0||all.some(row=>!Number.isSafeInteger(row.esmojo_selectierevisie)||row.esmojo_selectierevisie>revision))throw Error('REPORT_CONFLICT');
  return{revision,recipientIds:all.filter(row=>row.esmojo_geselecteerd===true).map(row=>row.esmojo_authgebruikersid),rows:all};
 }
 async function read(actor){await authorize(actor);const [selected,all]=await Promise.all([selection(),profiles('list',actor)]);if(!Array.isArray(all))throw Error('REPORT_UNAVAILABLE');return{revision:selected.revision,recipientIds:selected.recipientIds,accounts:all.filter(p=>p.activated&&!p.disabled&&hasModule(p,'reports')).map(p=>({id:p.id,firstName:p.firstName,lastName:p.lastName,email:p.email}))};}
 async function save(actor,input){
  const request=validateOnTrackRecipients(input);await authorize(actor);
  return operational.exclusive(()=>authorize(actor),async(state,{markWrite})=>{
   const selected=await selection(state),all=await profiles('list',actor);if(!Array.isArray(all))throw Error('REPORT_UNAVAILABLE');
   if(request.revision!==selected.revision)throw Error('CONFLICT');if(request.recipientIds.some(id=>!all.some(p=>p.id===id&&p.activated&&!p.disabled&&hasModule(p,'reports'))))throw Error('VALIDATION');
   const byId=new Map(selected.rows.map(row=>[row.esmojo_authgebruikersid,row]));
   for(const id of request.recipientIds)if(!byId.has(id)){
    await authorize(actor);await markWrite();await writer.ensure(reportRecord('rapportontvanger','ontrack-recipient/'+id,'Rapportageontvanger',{scope:'ontrack-reports-v1',authgebruikersid:id,ontvangerhash:digest(id),geselecteerd:false,selectierevisie:selected.revision}));
    byId.set(id,await repo.byKey('esmojo_rapportontvanger',recordKey('esmojo_rapportontvanger','ontrack-recipient/'+id)));
   }
   await authorize(actor);const revision=selected.revision+1;if(!Number.isSafeInteger(revision))throw Error('REPORT_CONFLICT');
   const operations=[...byId].map(([id,row])=>({table:'esmojo_rapportontvanger',key:row.esmojo_sleutel,etag:row['@odata.etag'],fields:{esmojo_geselecteerd:request.recipientIds.includes(id),esmojo_selectierevisie:revision}}));
   if(operations.length){await markWrite();await mutations.atomic(operations);}state.revision=revision;return{revision,recipientIds:request.recipientIds};
  });
 }
 return{read,save,selection};
}
