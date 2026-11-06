import {readFileSync} from 'node:fs';import vm from 'node:vm';import {harness} from './production-drive.js';
const actor='synthetic-esm',stamp='2026-11-05T12:00:00Z';
export async function measureHarness(){
 const h=harness(),register=JSON.parse(h.registerFile.content),revision=Object.keys(register.reports)[0],source={revision,sha256:register.reports[revision].sha256};
 const risk={id:'R01',title:'Synthetisch gedrang',description:'Alleen een gedefinieerd risico in de lokale test.',consequence:'Synthetisch gevolg.',basis:'inferred',evidence:[{page:1,quote:'fixture'}]};
 await h.shows('risk-save',{concertId:h.concertId,source,result:{promptVersion:1,analysedAt:stamp,risks:[risk],limitations:[]}});
 await h.shows('risk-operational-save',{concertId:h.concertId,actor,source,riskId:'R01',revision:0,riskLevel:'medium',riskNote:'Synthetische voorgestelde maatregel.'});
 h.index.active=[h.concertId,h.laterId];h.index.checkedAt=new Date().toISOString();h.indexFile.content=JSON.stringify(h.index);h.ctx.Utilities.formatDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);h.ctx.esmojoPdfSnapshot_=(id,target)=>({target,revision});
 for(const name of ['AccountModules.gs','ShowAssignments.gs','HomeCatalogue.gs','HomeCompletion.gs','HomeProjection.gs','HomePhotos.gs','HomeDashboard.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
 const root=h.ctx.DriveApp.getFolderById('1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk'),accounts=h.add(root,'_esmojo_accounts_v1.json',{profiles:[{id:actor,activated:true,role:'gebruiker',modules:['shows']},{id:'reports-only',activated:true,modules:['reports']}]});
 const measureId='operational:'+revision+':R01',call=(operation,fields={},id=measureId,as=actor)=>h.shows('measure-'+operation,{concertId:h.laterId,measureId:id,actor:as,...fields}),read=()=>call('read'),document=()=>JSON.parse(h.folder.files.find(file=>file.name==='productionele-risicos.json').content);
 return{...h,source,risk,accounts,measureId,call,read,document};
}
