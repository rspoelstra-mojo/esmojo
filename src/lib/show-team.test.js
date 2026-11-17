import {test} from 'node:test';
import assert from 'node:assert/strict';
import {placeholderTeam,showTeamRoles} from './show-team.js';
test('Projectteam toont de vier functies in vaste volgorde met een placeholdernaam',()=>{
 const team=placeholderTeam();
 assert.deepEqual(team.map(member=>member.role),['Productiemanager','Event Safety manager','Projectleider TSC','CMT leider']);
 assert.equal(team.length,showTeamRoles.length);
 for(const member of team)assert.match(member.name,/^\S+ \S+/);
 assert.equal(new Set(team.map(member=>member.name)).size,4);
});
