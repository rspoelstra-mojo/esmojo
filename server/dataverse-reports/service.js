import {createNativeIncidentDaily} from './incident-daily.js';
import {createConcertCatalogue} from '../concert-catalogue.js';
import {createProfiles} from '../account-profiles.js';
import {createTaskStore} from '../background-tasks/store.js';
import {hasModule,isAdministrator} from '../../shared/account-modules.js';
import {createNativeReportsRepository} from './repository.js';
import {createReportsWriter} from '../reports-migration/writer.js';
import {createNativeReportsMutations} from './mutations.js';
import {createReportsOperationalStore,createReportsStateStore} from './operational.js';
import {createReportsProcessing} from './processing.js';
import {createNativeReportReader} from './read.js';
import {createNativeReportArchive} from './archive.js';
import {createNativeReportRecipients} from './recipients.js';
import {createStoredReportCsv} from './stored-csv.js';
import {createNativeReportPdf} from './pdf.js';
import {createNativeReportMail} from './mail.js';
import {createNativeReportManagement} from './management.js';
import {createNativeReportDependencies} from './dependencies.js';
import {createNativeReportsRelated} from './related.js';
import {createReportsIntake} from './bridge.js';
import {reportsCoverage} from './authority.js';
export function createNativeReportsService({env=process.env,repository:repo=createNativeReportsRepository({env}),writer=createReportsWriter({env}),profiles=createProfiles({env}),stateStore=createReportsStateStore({env}),backgroundStore=createTaskStore({env}),intake=createReportsIntake({env}),dependencies:injectedDependencies,authorize:injectedAuthorize}={}){
 const mutations=createNativeReportsMutations({env,repository:repo,writer}),operational=createReportsOperationalStore({env,store:stateStore}),processing=createReportsProcessing({env,repository:repo,store:stateStore}),reader=createNativeReportReader({repository:repo});
 async function workerActor(){const task=await backgroundStore.get('reports-cutover-v1');if(typeof task?.state.actor!=='string')throw Error('FORBIDDEN');return task.state.actor;}
 async function authorize(actor,{worker=false,admin=false,module='reports',incident=false}={}){
  if(injectedAuthorize)return injectedAuthorize(actor,{worker,admin,module,incident});if(worker){actor=await workerActor();admin=true;module='reports';}if(typeof actor!=='string'||!actor)throw Error('FORBIDDEN');
  const profile=await profiles('self',actor);if(profile?.id!==actor||profile.activated!==true||profile.disabled||!(hasModule(profile,module)||incident&&isAdministrator(profile))||admin&&!isAdministrator(profile))throw Error('FORBIDDEN');return profile;
 }
 async function accounts(){const actor=await workerActor();await authorize(actor,{admin:true});const rows=await profiles('list',actor);if(!Array.isArray(rows))throw Error('REPORT_UNAVAILABLE');return rows.map(profile=>({...profile,reports:hasModule(profile,'reports')}));}
 const dependencies=injectedDependencies||createNativeReportDependencies({env,reader,intake}),archive=createNativeReportArchive({env,repository:repo,mutations,profiles}),recipients=createNativeReportRecipients({env,repository:repo,mutations,operational,writer,profiles}),storedCsv=createStoredReportCsv({reader,repository:repo}),pdf=createNativeReportPdf({intake:storedCsv,processing,dependencies,reader,repository:repo,writer,mutations,operational,authorize,selection:recipients.selection,accounts}),management=createNativeReportManagement({repository:repo,mutations,reader,pdf,processing,recipients,dependencies,operational,authorize}),mail=createNativeReportMail({env,repository:repo,writer,mutations,operational,authorize,accounts,visible:reader.current,selection:recipients.selection,processing,intake:storedCsv,download:async reportId=>archive.download(await workerActor(),reportId),manager:async show=>(await dependencies.context((await dependencies.choices()).find(row=>row.key===show.key)||{...show,date:show.dates[0]})).contextGeneral.eventSafetyManager}),related=createNativeReportsRelated({reader,authorize,concertCatalogue:createConcertCatalogue({env})});
 const incidentDaily=createNativeIncidentDaily({env,authorize});
 const relatedWithDaily=(operation,payload,legacy)=>operation.startsWith('incident-daily-')?incidentDaily(operation,payload):related(operation,payload,legacy);
 const operations={
  'web-menu':async actor=>{await authorize(actor);return{reports:await reader.catalogue(),pending:0};},
  'web-read':async(actor,input)=>{await authorize(actor);return reader.source(input.concertId);},
  'web-scan':async actor=>{await authorize(actor,{worker:actor===null});return{jobs:[],unlinked:0,intakeDisabled:true};},'web-source':async actor=>{await authorize(actor,{worker:actor===null});throw Error('CSV_INTAKE_DISABLED');},'web-commit':async actor=>{await authorize(actor,{worker:actor===null});throw Error('CSV_INTAKE_DISABLED');},'web-historical-status':async()=>{await authorize(null,{worker:true});return{valid:0,invalid:0,pending:0,intakeDisabled:true};},
  scan:()=>pdf.scan(),pipeline:(actor,input)=>management.pipeline(input),reserve:(actor,input)=>pdf.reserve(input),commit:(actor,input)=>pdf.commit(input),fail:(actor,input)=>pdf.fail(input),
  link:(actor,input)=>management.change(actor,'link',input),retry:(actor,input)=>management.change(actor,'retry',input),download:(actor,input)=>archive.download(actor,input.reportId),send:(actor,input)=>mail.send(actor,input.reportId),
  'online-sync':()=>mail.sync(),'online-reserve':(actor,input)=>mail.reserve('online',input),'online-commit':(actor,input)=>mail.confirm('online',input),'online-fail':(actor,input)=>mail.confirm('online',input,{failed:true}),
  'delivery-reserve':(actor,input)=>mail.reserve('pdf',input),'delivery-commit':(actor,input)=>mail.confirm('pdf',input),'delivery-fail':(actor,input)=>mail.confirm('pdf',input,{failed:true}),
  'pdf-alerts':actor=>management.alerts(actor),'email-history':actor=>archive.history(actor),'email-open':(actor,input)=>archive.open(actor,input),
  'timetable-candidates':async()=>{await authorize(null,{worker:true});return intake.timetableCandidates();},'timetable-save':async(actor,input)=>{await authorize(null,{worker:true});return intake.saveTimetable(input.concertId,input.snapshot);},
  'timetable-read':async(actor,input)=>{await authorize(actor);try{return{timetable:(await reader.summary(input.concertId)).context.timetable||null};}catch(error){if(error.message!=='NOT_FOUND')throw error;return intake.timetable(input.concertId);}},
  'email-context':async(actor,input)=>{await authorize(actor,{admin:true});const current=(await reader.current()).find(row=>row.show.key===input.concertId);if(!current)throw Error('REPORT_CATALOG');return{managerName:(await dependencies.context((await dependencies.choices()).find(row=>row.key===current.show.key)||current.show)).contextGeneral.eventSafetyManager};},
  'ontrack-status':actor=>management.status(actor),'ontrack-recipients':async(actor,input)=>{await recipients.save(actor,input);return management.status(actor);},
 };
 if(reportsCoverage.some(name=>!Object.hasOwn(operations,name)&&!['artist-catalogue','artist-profile','artist-show','incident-read','incident-source','incident-counts'].includes(name)))throw Error('REPORT_CONFIG');
 return{reader,related:relatedWithDaily,authorize,operations,async request(operation,actor,input={}){if(!Object.hasOwn(operations,operation))throw Error('VALIDATION');return operations[operation](actor,input);}};
}
