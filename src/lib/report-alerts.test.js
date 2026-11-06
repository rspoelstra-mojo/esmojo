import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSaveActivity} from './background-saves.js';import {loadReportAlerts} from './report-alerts.js';
const alert={id:'a'.repeat(64),artist:'Synthetische artiest',date:'2026-11-05',concertId:'Synthetic_Ziggo-Dome_05112026'};
test('PDF-fout verschijnt centraal na de achtergrondread, met veilige directe rapportagelink en zonder opslagsignaal',async()=>{
 const activity=createSaveActivity();await loadReportAlerts({activity,request:async action=>{assert.equal(action,'report-alerts');return{alerts:[alert]};}});assert.equal(activity.messages.length,1);assert.equal(activity.messages[0].route,'/rapportages/'+alert.concertId);assert.match(activity.messages[0].message,/5 november 2026/);assert.match(activity.messages[0].message,/online rapportage is wel beschikbaar/);assert.equal(activity.unconfirmed,false);await loadReportAlerts({activity,request:async()=>({alerts:[alert]})});assert.equal(activity.messages.length,1);
});
test('Afmelden, ongeldige responses en tijdelijk onbereikbare alertread tonen geen oude/ongeautoriseerde melding',async()=>{
 const activity=createSaveActivity();let release;const loading=loadReportAlerts({activity,request:()=>new Promise(done=>release=done)});activity.clear();release({alerts:[alert]});await loading;assert.equal(activity.messages.length,0);
 for(const data of [{alerts:[{...alert,concertId:'//evil.example/path'}]},{alerts:[{...alert,date:'bad date'}]},{}])await loadReportAlerts({activity,request:async()=>data});await loadReportAlerts({activity,request:async()=>{throw Error('private upstream');}});assert.equal(activity.messages.length,0);
});
