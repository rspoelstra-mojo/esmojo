import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffTabs,staffFieldIds,staffGroups} from './staff-planning.js';
test('Concertagenda: vier tabs in vaste volgorde en elke functie staat in precies één tab',()=>{
 assert.deepEqual(staffTabs.map(tab=>tab.label),['Algemeen','MOJO personeel','Beveiliging','Zaal']);
 const fields=staffTabs.flatMap(tab=>tab.fields.map(field=>field.id));
 assert.equal(new Set(fields).size,fields.length);assert.deepEqual([...fields].sort(),[...staffFieldIds].sort());
 assert.deepEqual(staffTabs.find(tab=>tab.id==='mojo').fields.map(field=>field.label),['Productie manager','Event Safety manager','CMT leider MOJO']);
 assert.deepEqual(staffTabs.find(tab=>tab.id==='security').fields.map(field=>field.label),['Projectleider beveiliging']);
 assert.deepEqual(staffTabs.find(tab=>tab.id==='venue').fields.map(field=>field.label),['Productie manager zaal','Event manager zaal','CMT leider zaal']);
 assert.equal(staffTabs.find(tab=>tab.id==='general').fields.length,0);
 // De oorspronkelijke groepen blijven bestaan voor de opslag; de labels zijn gelijk aan die in de tabs.
 for(const group of staffGroups)for(const field of group.fields)assert.ok(staffTabs.some(tab=>tab.fields.some(item=>item.id===field.id&&item.label===field.label)),field.id);
});
