import assert from 'node:assert/strict';
import {createReportsMigrationTask} from '../reports-migration/task.js';
import {createReportsMigrationSource} from '../reports-migration/source.js';
import {createReportsWriter} from '../reports-migration/writer.js';
import {createReportsManifest} from '../reports-migration/manifest.js';
import {createTaskStore} from '../background-tasks/store.js';
import {reportDestination} from '../reports-migration/test-fixture.js';
import {webDriveFixture} from '../test-support/web-reports-drive.js';
import {createWebCatalogueService} from '../web-report-catalogue.js';

// Entirely synthetic signed Drive → actual mapper → native wire fixture.
// No real credentials, users, report bytes or production writes are involved.
export async function nativeReaderFixture({prepare=async()=>{}}={}){
 const actor='synthetic-admin',epoch='11111111-1111-4111-8111-111111111111',now=()=>1000000,expires=now()+48*3600000,env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-reader-secret-1234567890'};
 const drive=webDriveFixture();drive.profiles.push({id:actor,role:'beheerder',modules:['reports'],activated:true,disabled:false});drive.updateProfiles();const show=drive.addShow(),csv=drive.addCsv(show);await prepare({drive,show,csv});await createWebCatalogueService({store:drive.store}).synchronize();
 const destination=reportDestination(),store=createTaskStore({env,connection:destination.connection}),source=createReportsMigrationSource({env:{},store:drive.store}),manifest=createReportsManifest({env,now,store}),writer=createReportsWriter({env,connection:destination.connection}),verifyWriter=createReportsWriter({env,connection:destination.connection,readOnly:true});
 const copy=createReportsMigrationTask({env,now,source,manifest,writer,verifyWriter,checks:[]});
 let result,cursor=null;for(let n=0;n<500;n++){result=await copy.step({cursor,actor,runId:epoch,authorizationExpiresAt:expires});cursor=result.cursor;if(result.status==='complete')break;}assert.equal(result.status,'complete');
 return{drive,show,csv,destination,env,writer};
}
