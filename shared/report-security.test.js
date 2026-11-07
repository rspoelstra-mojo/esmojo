import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesSecurityReportFilter,securityReportTags} from './report-security.js';
test('Selecties gebruiken bron-Type en Resolved Status, niet vrije omschrijving of Division',()=>{
 const both={type:'VERBALE en Fysieke agressie',resolvedStatus:'Eviction; ARREST',division:'Andere afdeling'};
 assert.deepEqual(securityReportTags(both),['verbal','physical','evictions','arrests']);
 assert.deepEqual(securityReportTags({type:'Zorg',description:'Verbale agressie, eviction, arrest'}),[]);
 assert.equal(matchesSecurityReportFilter(both,'onbekend'),false);
 assert.deepEqual(securityReportTags({type:'Zelfzorg',resolvedStatus:'Eviction',affectedPerson:0}),['evictions']);
});

test('Baldadigheid gebruikt de gelijknamige Type-waarde, niet vrije beschrijving of afhandeling',()=>{
 for(const type of ['Baldadigheid',' BALDADIGHEID '])assert.equal(matchesSecurityReportFilter({type},'mischief'),true);
 assert.equal(matchesSecurityReportFilter({type:'Controle',description:'Baldadigheid',resolvedStatus:'Baldadigheid'},'mischief'),false);
 assert.equal(matchesSecurityReportFilter({type:'Geen baldadigheid'},'mischief'),false);
 assert.deepEqual(securityReportTags({type:'Baldadigheid',resolvedStatus:'Eviction'}),['mischief','evictions']);
});
