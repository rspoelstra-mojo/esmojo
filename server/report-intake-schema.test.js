import test from 'node:test';
import assert from 'node:assert/strict';
import {reportIntakeTable,reportIntakeSchemaContract} from './report-intake-schema.js';

test('CSV intake setup is isolated and provides private file storage and a unique source key',()=>{
 assert.equal(reportIntakeSchemaContract.setupTables.length,1);
 assert.equal(reportIntakeTable.logical_name,'esmojo_rapportontvangst');
 assert.equal(reportIntakeTable.columns.find(c=>c.logical_name==='esmojo_bestand').type,'Bestand (File)');
 const lookup=reportIntakeTable.columns.find(c=>c.logical_name==='esmojo_concert');assert.equal(lookup.target,'esmojo_concert');assert.equal(reportIntakeSchemaContract.tableByName.get(lookup.target).logical_name,'esmojo_concert');assert.ok(reportIntakeSchemaContract.tableSetupSteps.some(s=>s.kind==='relationship'&&s.column==='esmojo_concert'));
 assert.deepEqual(reportIntakeTable.keys[0].columns,['esmojo_sleutel']);
 assert.ok(reportIntakeSchemaContract.tableSetupSteps.length>reportIntakeTable.columns.length);
});
