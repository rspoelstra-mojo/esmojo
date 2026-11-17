import {test} from 'node:test';
import assert from 'node:assert/strict';
import {teamRows} from './show-team.js';
import {showTeamRoles,staffFieldIds} from '../../shared/staff-planning.js';
test('Projectteam toont de vier functies in vaste volgorde met de namen uit de personeelsplanning',()=>{
 const rows=teamRows({productionManager:'Sanne Jansen',eventSafetyManager:' Daan ',securityProjectLead:'',cmtLeadMojo:'Noor Bakker',venueCmtLead:'Niet getoond'});
 assert.deepEqual(rows,[{label:'Productiemanager',name:'Sanne Jansen'},{label:'Event Safety manager',name:'Daan'},{label:'Projectleider TSC',name:null},{label:'CMT leider',name:'Noor Bakker'}]);
 assert.deepEqual(teamRows(null).map(row=>row.name),[null,null,null,null]);assert.deepEqual(teamRows({productionManager:5}).map(row=>row.name),[null,null,null,null]);
});
test('Projectleider TSC is de Projectleider beveiliging en CMT leider is de CMT leider MOJO uit de planning',()=>{
 const byLabel=Object.fromEntries(showTeamRoles.map(role=>[role.label,role.field]));
 assert.equal(byLabel['Projectleider TSC'],'securityProjectLead');assert.equal(byLabel['CMT leider'],'cmtLeadMojo');
 assert.ok(showTeamRoles.every(role=>staffFieldIds.includes(role.field)),'alleen functies die in de planning bestaan');
});
