import {createNativeRuntimeVerification} from './native-runtime-verification.js';
import {createNativeReportsService} from './dataverse-reports/service.js';
import {createNativeShowState} from './dataverse-shows/state.js';
import {createNativeManagementRepository} from './dataverse-shows/management.js';
import {assertNativeAuthority} from './dataverse-shows/authority.js';
import {hasModule} from '../shared/account-modules.js';
// Same fixed main/OIDC route and current worker rights; no test events or writes.
export function createManagementRuntimeAudit({env=process.env,reports=createNativeReportsService({env}),state=createNativeShowState({env}),base=createNativeRuntimeVerification({env})}={}){return async stage=>{
 if(stage!=='sharing')return base(stage);
 const profile=await reports.authorize(null,{worker:true,admin:true});if(!['shows','artists','reports'].every(module=>hasModule(profile,module)))throw Error('FORBIDDEN');
   await assertNativeAuthority({env,repository:state.repo});const sharing=createNativeManagementRepository({env,state}),totals=await sharing.statistics(),rows=await state.repo.query('esmojo_showbeheer',{filter:'esmojo_ingeschakeld eq true'});let checkedProfiles=0,readyProfiles=0,verifiedPdfFiles=0;
   for(const row of rows.slice(0,2)){const scope={concert_id:row.esmojo_oudconcertid},profile=await sharing.profile(scope);checkedProfiles++;if(profile.ready&&profile.active){readyProfiles++;const file=await sharing.profile(scope,true);if(!file.ready||file.revision!==profile.revision)throw Error('SOURCE_CHANGED');verifiedPdfFiles++;}}
   return{ok:true,stage,storage:'dataverse',managements:totals.length,checkedProfiles,readyProfiles,verifiedPdfFiles,testEventsWritten:0,recordsPersonalData:false};
};}
