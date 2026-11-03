// Alleen lokale acceptatietest met expliciet aangeleverde vertrouwelijke fixture.
// Geen CSV/incidenttekst in Git, CI, logs of artifacts kopiëren.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {calculateReport} from '../../server/ontrack-report/data.js';
import {createShowReportPdf,showReportAssets} from '../../server/ontrack-report/pdf.js';
import {extractText} from 'unpdf';
const [path,output='/tmp/ESMOJO-SCOOTER-layoutproef.pdf']=process.argv.slice(2);if(!path)throw Error('Geef het lokale pad van de aangeleverde SCOOTER-testfixture.');
const report=calculateReport(await readFile(path));
assert.deepEqual(report.kpis.medical,{total:12,treatments:7,selfcare:5,unwell:3,ambulance:0});assert.deepEqual(report.kpis.security,{total:21,verbal:0,physical:1,evictions:0,arrests:1});
assert.equal(report.types.medical.length,5);assert.equal(report.types.medical.reduce((sum,group)=>sum+group.count,0),12);assert.equal(report.types.security.length,3);assert.equal(report.types.security.reduce((sum,group)=>sum+group.count,0),11);assert.equal(report.incidents.length,34);assert.equal(report.incidents.filter(row=>row.highlight).length,1);assert.equal(report.incidents[0].time,'07:08');assert.equal(report.incidents.at(-1).localDate,'2026-10-26');assert.equal(report.incidents.at(-1).time,'02:00');assert.equal(report.locations.length,7);
const assets=await showReportAssets(),result=await createShowReportPdf(report,{show:{key:'local-scooter-reference-only',name:'SCOOTER',venue:'Ziggo Dome',dates:['2026-10-25']}},{assets,allowMissingIcon:!assets.icon});assert.equal(result.pageCount,5);assert.equal(result.geometry.incidents.length,34);assert.equal(result.geometry.dashboard.length,6);
const text=await extractText(new Uint8Array(result.bytes),{mergePages:true}),compact=value=>value.replace(/\s/g,'');
for(const row of report.incidents)for(const value of [row.zone,row.type,row.description,row.priority,row.note])if(value)assert.ok(compact(text.text).includes(compact(value)),'Volledige incidenttekst ontbreekt in PDF.');
await writeFile(output,result.bytes);console.log('SCOOTER-fixture: KPI’s, grafiekfilters, 34 complete incidenten, prioriteitskleuren en 5 A4-pagina’s gecontroleerd. '+(!assets.icon?'Dit is een onvolledige layoutproef zonder origineel ON-icoon.':'Origineel ON-icoon aanwezig.'));
