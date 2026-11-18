// Begrensde productiecontrole zonder credentials, echte accounts of bedrijfsdata.
// Geen retries, parallelle scan, codepogingen voor echte accounts of responsinhoud in logs.
const origin='https://esmojo.nl';
const checks=[];
const add=(label,path,method,body,statuses,headers={})=>checks.push({label,path,method,body,statuses,headers});
const privateActions=[
 'session','restore','login','remember','complete','accounts','photo','email',
 'shows','show-open','show-photo','show-timetable','show-team','show-profile',
 'show-risks','show-profile-pdf','analysis-finalization','ticket-data',
 'barrier-reference','barrier-layout','floor-pressure','production-risks',
 'operational-risk','operational-risk-own','operational-risk-edit','measure','measure-pdf',
 'home-dashboard','home-metadata','show-storage-alerts',
 'artist-menu','artist-open','artist-detail','artist-show','artist-risk','artist-ranking','artist-view',
 'report-menu','report-web','report-alerts','report-email-history','report-email-open',
 'ontrack','ontrack-report','background-tasks','dataverse-test','dataverse-tables',
 'dataverse-choices','data-transition','show-migration','website-settings',
 'report-intake-schema','report-intake-check','show-management','show-management-stats',
 'staff-planning','incidents','fluid-preview','website-settings-schema',
];
for(const action of privateActions)add(action,'/api/access?action='+action,['session','accounts','shows','artist-menu','report-menu'].includes(action)?'GET':'POST',{},[401]);
for(const action of ['session','accounts','show-open','report-web','measure-pdf'])add('invalid-bearer:'+action,'/api/access?action='+action,'POST',{},[401],{Authorization:'Bearer invalid.invalid.invalid'});
for(const name of ['shows-sync','shows-runtime-sync','shows-performance-sync','background-tasks-sync','web-reports-sync','ontrack-reports-sync','report-intake-sync','email-deliverability'])add(name,'/api/'+name,'POST',{},[403]);
for(const name of ['artist-biographies-sync','home-planning-sync','ontrack-concerts-sync','timetables-sync','reports-validation-sync','reports-cutover-sync'])add(name,'/api/'+name,'POST',{},[410]);
add('research','/api/research','POST',{},[403]);
add('mfa-health','/api/mfa','POST',{operation:'health'},[403]);
add('mfa-native-health','/api/mfa','POST',{operation:'native-health'},[403]);
add('mfa-without-session','/api/mfa','POST',{factorId:'11111111-1111-4111-8111-111111111111',code:'000000'},[401]);
// Onbekende link en geen sessie: geen bestaande Showbeheer-toegang aanspreken.
for(const operation of ['read','visit','download'])add('showbeheer:'+operation,'/api/show-management','POST',{operation,link:'0'.repeat(64),...(operation==='download'?{requestId:'11111111-1111-4111-8111-111111111111'}:{})},[403]);
for(const path of ['/.env','/.git/config','/server/accounts-api.js','/src/auth.js','/docs/dataverse/shows-schema.json'])add('private-file:'+path,path,'GET',null,[404]);
let failed=0;
for(const check of checks){
 try{
  const response=await fetch(origin+check.path,{method:check.method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000),headers:{Origin:origin,...(check.method==='POST'?{'Content-Type':'application/json'}:{}),...check.headers},...(check.method==='POST'?{body:JSON.stringify(check.body)}:{})});
  const passed=check.statuses.includes(response.status);
  // Verwerp responsebytes; geen gegevens, tokens, cookies of providertekst printen.
  await response.body?.cancel();
  if(!passed)failed++;
  console.log(JSON.stringify({check:check.label,status:response.status,passed}));
 }catch{failed++;console.log(JSON.stringify({check:check.label,passed:false,code:'REQUEST_UNCONFIRMED'}));}
}
console.log(JSON.stringify({checks:checks.length,passed:checks.length-failed,failed}));
if(failed)process.exitCode=1;
