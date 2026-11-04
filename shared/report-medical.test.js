import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesMedicalReportFilter as matches,medicalReportTags} from './report-medical.js';
test('Zelfzorg en behandelingen verdelen uitsluitend de medische meldingen met de bestaande Type/Description-regels',()=>{
 for(const fields of [{type:'ZELFZORG contact'},{description:'PCM gegeven'},{description:'PARACETEMOL'},{description:'paracetamol'},{description:'pleister'},{description:'kolven'}]){
  const incident={division:'MEDISCH',...fields};assert.equal(matches(incident,'selfcare'),true);assert.equal(matches(incident,'treatments'),false);
  assert.equal(matches({...incident,division:'Beveiliging'},'selfcare'),false);assert.equal(matches({...incident,division:'Beveiliging'},'treatments'),false);
 }
 // Kolven alleen in Type is in de bestaande KPI geen zelfzorgcriterium; tellingen niet wijzigen.
 assert.deepEqual(medicalReportTags({division:'Medisch',type:'Kolven'}),['treatments']);assert.deepEqual(medicalReportTags({division:'Medisch',type:'Controle'}),['treatments']);
});
test('Onwelwordingen overlappen behandelingen/zelfzorg, vereisen Medisch en bron-Type',()=>{
 assert.deepEqual(medicalReportTags({division:'Medisch',type:'ONWELWORDING'}),['treatments','unwell']);
 assert.deepEqual(medicalReportTags({division:'Medisch',type:'Flauwval',description:'PCM'}),['selfcare','unwell']);
 assert.equal(matches({division:'Beveiliging',type:'Onwelwording'},'unwell'),false);assert.equal(matches({division:'Medisch',description:'Onwelwording'},'unwell'),false);
});
test('Ambulance volgt Resolved Status ongeacht afdeling/aantal personen; geen zoekactie in vrije notities',()=>{
 assert.deepEqual(medicalReportTags({division:'Anders',resolvedStatus:'AMBULANCE transport',affectedPerson:0}),['ambulance']);
 assert.equal(matches({description:'Ambulance',note:'Ambulance'},'ambulance'),false);assert.equal(matches({division:'Medisch'},'onbekend'),false);
});
