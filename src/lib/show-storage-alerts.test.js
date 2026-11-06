import assert from 'node:assert/strict';
import {loadShowStorageAlerts} from './show-storage-alerts.js';
import {createSaveActivity} from './background-saves.js';
const activity=createSaveActivity();
await loadShowStorageAlerts({activity,request:async()=>({alerts:[{key:'Artist_Gashouder_06112026'},{key:'//bad'},{key:'bad\u0000'}]})});assert.equal(activity.messages.length,1);assert.match(activity.messages[0].message,/gegevens zijn behouden/);
let release;const task=loadShowStorageAlerts({activity,request:()=>new Promise(resolve=>release=resolve)});activity.clear();release({alerts:[{key:'old-session'}]});await task;assert.equal(activity.messages.length,0);
await loadShowStorageAlerts({activity,request:async()=>{throw Error('synthetic');}});assert.equal(activity.messages.length,0);
console.log('Archiefmeldingen: uitsluitend geldige interne links, late sessieantwoorden gewist en stille read-uitval.');
