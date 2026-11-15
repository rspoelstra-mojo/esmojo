import {timingSafeEqual} from 'node:crypto';
import {createProfiles} from '../account-profiles.js';
import {hasModule,isAdministrator} from '../../shared/account-modules.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportsMutations} from './mutations.js';
import {reportChoice} from '../reports-migration/contract.js';
import {reportIdentity} from '../reports-migration/map.js';
import {digest,recordKey} from '../show-migration-writer.js';
import {validateWebReportRequest} from '../report-web.js';
const object=text=>{try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw Error('REPORT_CONFLICT');}};
const validTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const equalHash=(a,b)=>hash(a)&&hash(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
export function createNativeReportArchive({env=process.env,repository=createNativeReportsRepository({env}),mutations=createNativeReportsMutations({env,repository}),profiles=createProfiles({env}),now=()=>new Date()}={}){
 const repo=repository;
 async function authorize(actor,{admin=false}={}){
  if(typeof actor!=='string'||!actor)throw Error('FORBIDDEN');
  const profile=await profiles('self',actor);
  if(profile?.id!==actor||profile.activated!==true||profile.disabled||!hasModule(profile,'reports')||admin&&!isAdministrator(profile))throw Error('FORBIDDEN');return profile;
 }
 function groupMetadata(group){
  const metadata=object(group.esmojo_mailparameters_json),channel=metadata.channel;
  if(!['online','pdf'].includes(channel)||metadata.id!==group.esmojo_oudrapportid||!hash(metadata.id)||group.esmojo_mailkanaal!==reportChoice('rapportmailkanaal',channel)||group.esmojo_verzendfingerprint!==digest({channel,id:metadata.id})||typeof metadata.show?.key!=='string')throw Error('REPORT_CONFLICT');return metadata;
 }
 async function ownedGroup(group){
  const metadata=groupMetadata(group),version=await repo.byId('esmojo_rapportversie',group._esmojo_rapportversie_value),header=await repo.byId('esmojo_rapportage',version._esmojo_rapportage_value);
  if(header.esmojo_bronidentiteit!==reportIdentity(metadata.show))throw Error('REPORT_CONFLICT');return{metadata,version,header};
 }
 async function deliveries(group){
  const rows=await repo.children('esmojo_rapportaflevering','esmojo_rapportverzending',await repo.idOf('esmojo_rapportverzending',group)),seen=new Set();
  for(const row of rows){if(typeof row.esmojo_authgebruikersid!=='string'||seen.has(row.esmojo_authgebruikersid)||row.esmojo_ontvangerhash!==digest(row.esmojo_authgebruikersid))throw Error('REPORT_CONFLICT');seen.add(row.esmojo_authgebruikersid);}return rows;
 }
 async function history(actor){
  await authorize(actor,{admin:true});const [groups,accounts]=await Promise.all([repo.query('esmojo_rapportverzending'),profiles('list',actor)]),results=[];
  if(!Array.isArray(accounts))throw Error('REPORT_UNAVAILABLE');
  for(const group of groups){
   const metadata=groupMetadata(group);if(metadata.channel==='pdf'&&metadata.mailChannel==='online')continue;
   const sent=(await deliveries(group)).filter(row=>row.esmojo_afleverstatus===reportChoice('rapportafleverstatus','sent'));if(!sent.length)continue;await ownedGroup(group);
   const recipients=sent.map(row=>{
    const profile=accounts.find(p=>p.id===row.esmojo_authgebruikersid),email=row.esmojo_email_snapshot||profile?.email||null,name=[profile?.firstName,profile?.lastName].filter(v=>typeof v==='string'&&v.trim()).join(' ')||row.esmojo_voornaam_snapshot||email||'Onbekende ontvanger',mail=object(row.esmojo_mailparameters_json).mail,tracked=mail?.version==='online-report-v4'&&row.esmojo_trackingversie==='mail-open-v1'&&hash(row.esmojo_ontvangstbewijshash);
    return{id:row.esmojo_authgebruikersid,name,email,tracked,openedAt:tracked&&validTime(row.esmojo_eerstgeopendop)?row.esmojo_eerstgeopendop:null};
   }),times=sent.map(row=>row.esmojo_verzondenop).filter(validTime).sort();
   results.push({id:metadata.id,artist:metadata.show.name||'Showrapportage',venue:metadata.show.venue||null,dates:(metadata.show.dates||[]).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)),sentAt:times.at(-1)||null,recipients});
  }
  results.sort((a,b)=>(b.sentAt||'').localeCompare(a.sentAt||'')||a.id.localeCompare(b.id));return{reports:results.slice(0,10),profiles:[],profilesReady:false};
 }
 async function download(actor,reportId){
  await authorize(actor,{admin:true});if(!hash(reportId))throw Error('VALIDATION');
  const artifacts=await repo.query('esmojo_rapportpdf',{filter:"esmojo_oudrapportid eq '"+reportId+"'"});if(artifacts.length!==1)throw Error('REPORT_UNAVAILABLE');
  const pdf=artifacts[0],version=await repo.byId('esmojo_rapportversie',pdf._esmojo_rapportversie_value),header=await repo.byId('esmojo_rapportage',version._esmojo_rapportage_value),file=await repo.file({reportKey:header.esmojo_sleutel,versionKey:version.esmojo_sleutel,pdfKey:pdf.esmojo_sleutel});
  if(!/^SR_[^\x00-\x1f/\\]+\.pdf$/.test(file.fileName))throw Error('REPORT_UNAVAILABLE');return{fileName:file.fileName,pdfBase64:file.bytes.toString('base64'),sha256:file.sha256};
 }
 async function open(actor,{concertId,token}={}){
  await authorize(actor);concertId=validateWebReportRequest({concertId});if(!hash(token))throw Error('VALIDATION');
  const header=await repo.byKey('esmojo_rapportage',recordKey('esmojo_rapportage',reportIdentity({key:concertId})));if(!header)return{ok:true,recorded:false};
  const versions=await repo.children('esmojo_rapportversie','esmojo_rapportage',await repo.idOf('esmojo_rapportage',header));
  for(const version of versions){
   const groups=await repo.children('esmojo_rapportverzending','esmojo_rapportversie',await repo.idOf('esmojo_rapportversie',version));
   for(const group of groups){const metadata=groupMetadata(group);if(metadata.show.key!==concertId||metadata.channel==='pdf'&&metadata.mailChannel==='online')continue;
    const delivery=(await deliveries(group)).find(row=>row.esmojo_authgebruikersid===actor);
    if(!delivery||!validTime(delivery.esmojo_eerstgeprobeerdop)||object(delivery.esmojo_mailparameters_json).mail?.version!=='online-report-v4'||delivery.esmojo_trackingversie!=='mail-open-v1'||!equalHash(delivery.esmojo_ontvangstbewijshash,digest(token)))continue;
    const requestedAt=now().toISOString();let current=delivery;
    for(let attempt=0;attempt<3;attempt++){
     if(validTime(current.esmojo_eerstgeopendop))return{ok:true,recorded:true};
     await authorize(actor); // Revocation during a slow native read wins.
     try{await mutations.atomic([{table:'esmojo_rapportaflevering',key:current.esmojo_sleutel,etag:current['@odata.etag'],fields:{esmojo_eerstgeopendop:requestedAt}}]);return{ok:true,recorded:true};}
     catch(error){
      if(!['REPORT_CONFLICT','REPORT_WRITE_UNCONFIRMED'].includes(error.message))throw error;
      const fresh=await repo.byKey('esmojo_rapportaflevering',current.esmojo_sleutel);
      if(!fresh||fresh.esmojo_authgebruikersid!==actor||!equalHash(fresh.esmojo_ontvangstbewijshash,digest(token)))throw Error('REPORT_CONFLICT');
      if(validTime(fresh.esmojo_eerstgeopendop))return{ok:true,recorded:true};
      if(error.message==='REPORT_WRITE_UNCONFIRMED')throw error;current=fresh;
     }
    }throw Error('REPORT_CONFLICT');
   }
  }return{ok:true,recorded:false};
 }
 return{authorize,history,download,open};
}
