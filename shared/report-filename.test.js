import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {MOJO_VENUES} from '../server/mojo-venues.js';import {reportFilenameShow,reportConcertMatch} from './report-filename.js';
const parse=name=>reportFilenameShow(name,MOJO_VENUES,'2026-11-05');
test('Venue suffixes zijn bekende mooie namen, niet blind streepjes vervangen in vrije tekst',()=>{
 for(const [token,name]of [['Ziggo-Dome','Ziggo Dome'],['ZIGGO_DOME','Ziggo Dome'],['AFAS-Live','AFAS Live'],['Johan-Cruijff-Arena','Johan Cruijff Arena'],['Gashouder','Gashouder'],['Gelre-Dome','GelreDome'],['Ahoy-Rotterdam','Rotterdam Ahoy']]){const result=parse('incidents_ARCHIEF_ARTIEST_'+token+'_01102002.csv');assert.equal(result.name,'ARCHIEF ARTIEST');assert.equal(result.venue,name);assert.equal(result.date,'2002-10-01');}
 assert.equal(parse('incidents_ARCHIEF_ROTTERDAM_AHOY_01102002.csv').name,'ARCHIEF');assert.equal(parse('incidents_ARCHIEF_ZIGGO_DOME_01102002.csv').key,parse('incidents_archief_Ziggo-Dome_01102002.csv').key);
});
test('Datum/zaal/artist worden niet geraden; bekende artiestnaam mag unieke schrijfwijze herstellen',()=>{
 for(const file of ['incidents_ARTIEST_OnbekendeZaal_01102002.csv','incidents_ARTIEST_ZIGGO_DOME_31112026.csv','incidents_ARTIEST_ZIGGO_DOME_06112026.csv','incidents__ZIGGO_DOME_01102002.csv','incidents_../ARTIEST_ZIGGO_DOME_01102002.csv','other.csv'])assert.equal(parse(file),null,file);
 assert.equal(reportFilenameShow('incidents_Myles-Smith_AFAS-Live_01102002.csv',MOJO_VENUES,'2026-11-05',['Myles Smith']).name,'Myles Smith');
});
test('Apps Script gebruikt exact dezelfde parser en centrale venueconfiguratie',()=>{const rows=MOJO_VENUES.map(({id,name,city,query,aliases})=>({id,name,city,query,aliases}));assert.equal(readFileSync('google-apps-script/ReportFilename.gs','utf8'),'// Gegenereerd uit shared/report-filename.js en server/mojo-venues.js.\nconst ESMOJO_WEB_REPORT_VENUES='+JSON.stringify(rows)+';\n'+readFileSync('shared/report-filename.js','utf8').replaceAll('export ',''));});

test('Concertidentiteit accepteert underscores, koppeltekens, spaties en hoofdletters',()=>{
 const show={key:'Myles-Smith_Ziggo-Dome_03112026'},choices=[show];
 for(const file of ['incidents_MYLES_SMITH_ZIGGO_DOME_03112026.csv','incidents_myles-smith_Ziggo-Dome_03112026.csv','incidents_Myles Smith_Ziggo Dome_03112026.csv','incidents-MYLES-SMITH-ZIGGO-DOME-03112026.csv']){
  assert.equal(reportConcertMatch(file,choices,MOJO_VENUES,'2026-11-05').show,show,file);
  assert.equal(parse(file).date,'2026-11-03');
 }
 for(const file of ['incidents_MYLES_SMITH_ZIGGO_DOME_02112026.csv','incidents_MYLES_SMITH_AFAS_LIVE_03112026.csv'])assert.equal(reportConcertMatch(file,choices,MOJO_VENUES,'2026-11-05').state,'missing');
 assert.equal(reportConcertMatch('incidents_myles_smith_ziggo_dome_03112026.csv',[show,{key:'MYLES_SMITH_ZIGGO_DOME_03112026'}],MOJO_VENUES,'2026-11-05').state,'ambiguous');
});
test('Bekende zaalaliassen wijzen naar hetzelfde bestaande concert',()=>{
 for(const [key,file]of [['Archief_Rotterdam-Ahoy_03112026','incidents_ARCHIEF_AHOY_ROTTERDAM_03112026.csv'],['Archief_GelreDome_03112026','incidents_ARCHIEF_GELRE_DOME_03112026.csv']]){
  const show={key};assert.equal(reportConcertMatch(file,[show],MOJO_VENUES,'2026-11-05').show,show);
 }
});
