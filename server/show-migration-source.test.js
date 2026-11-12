import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createMigrationSource} from './show-migration-source.js';
const iterator=values=>{let index=0;return{hasNext:()=>index<values.length,next:()=>values[index++]};};
test('Apps Script exporter is read-only, namespace-bound, and rejects arbitrary operations and parameters',()=>{
 const index={managedBy:'ESMOJO/MOJO-v1',version:1,concerts:[{concertId:'one',generalConcertId:'one',artist:'Test',venue:'Gashouder',date:'2026-11-23'}]},production={getFoldersByName:()=>iterator([])},root={getFoldersByName:name=>{assert.equal(name,'Productie');return iterator([production]);}};
 const context=vm.createContext({DriveApp:{getFolderById:id=>{assert.equal(id,'fixed-root');return root;}},ESMOJO_FOLDER_ID:'fixed-root',esmojoShowFile_:(folder,name)=>{assert.equal(folder,production);assert.equal(name,'_esmojo_shows_v1.json');return{getBlob:()=>({getDataAsString:()=>JSON.stringify(index)})};}});
 vm.runInContext(readFileSync(new URL('../google-apps-script/ShowMigration.gs',import.meta.url),'utf8'),context);
 const result=context.esmojoShowMigration_({operation:'migration-v1-catalogue'});assert.equal(result.version,1);assert.equal(result.shows.length,1);
 assert.throws(()=>context.esmojoShowMigration_({operation:'migration-v1-catalogue',fileId:'arbitrary'}),/VALIDATION/);assert.throws(()=>context.esmojoShowMigration_({operation:'migration-v1-delete'}),/VALIDATION/);
});
test('catalogue includes native-only shows but does not duplicate a secondary date of a Drive series',async()=>{
 const drive=async operation=>operation==='migration-v1-catalogue'?{version:1,shows:[{concertId:'first',artist:'Test',venue:'Gashouder',date:'2026-11-23',memberShows:[{artist:'Test',venue:'Gashouder',date:'2026-11-23'},{artist:'Test',venue:'Gashouder',date:'2026-11-24'}]}]}:{concerts:[{artist:'Other',venue:'Ziggo Dome',city:'Amsterdam',date:'2026-11-25'}]};
 const source=createMigrationSource({drive,active:{all:async()=>[]},research:{sourceKeys:async()=>['test_gashouder_20261124','other_ziggodome_20261125']}});
 const catalogue=await source.catalogue();assert.equal(catalogue.length,2);assert.equal(catalogue.filter(s=>s.source==='dataverse').length,1);
 const native=await source.show(catalogue.find(s=>s.source==='dataverse'));assert.equal(native.bundle.shows[0].artist,'Other');assert.equal(native.bundle.files.length,0);
});
test('unmapped active shows and moving source revisions block migration instead of using a stale Drive copy',async()=>{
 const orphan=createMigrationSource({drive:async()=>({version:1,shows:[]}),active:{all:async()=>[{aliases:['missing']}]},research:{sourceKeys:async()=>[]}});await assert.rejects(orphan.catalogue(),/MIGRATION_ORPHAN/);
 let reads=0;const changed=createMigrationSource({drive:async()=>({version:1,concertId:'show'}),active:{get:async()=>({revision:++reads})},management:{get:async()=>null}});await assert.rejects(changed.show({concertId:'show',source:'drive'}),/MIGRATION_SOURCE_CHANGED/);
});

test('people export includes only the pinned policy ID and minimal account fields, excluding register secrets',()=>{
 const production={},root={getFoldersByName:()=>iterator([production])},accounts={superAdminId:'pinned-user',nonces:{secret:'do-not-export'},profiles:[{id:'pinned-user',role:'superbeheerder',email:'synthetic@example.invalid',firstName:'Test',lastName:'Account',modules:['shows'],activated:true,disabled:false,privateGrant:'do-not-export'}]},index={managedBy:'ESMOJO/MOJO-v1',version:1,concerts:[]};
 const context=vm.createContext({ESMOJO_FOLDER_ID:'root',DriveApp:{getFolderById:()=>root},esmojoShowFile_:(folder,name)=>({getBlob:()=>({getDataAsString:()=>JSON.stringify(name==='_esmojo_accounts_v1.json'?accounts:index)})}),esmojoHomeAssignments_:()=>({document:{assignments:[]}})});
 vm.runInContext(readFileSync(new URL('../google-apps-script/ShowMigration.gs',import.meta.url),'utf8'),context);
 const result=context.esmojoShowMigration_({operation:'migration-v1-people'});
 assert.equal(result.superAdminId,'pinned-user');assert.equal(result.profiles[0].role,'superbeheerder');assert.doesNotMatch(JSON.stringify(result),/nonces|privateGrant|do-not-export/);
});
