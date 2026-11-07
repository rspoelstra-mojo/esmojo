import {test} from 'node:test';import assert from 'node:assert/strict';
import {createMailOpenReceipt} from './mail-open-receipt.js';
function harness(hash='#mail-open='+'a'.repeat(64)){
 const listeners=new Map(),calls=[],changes=[];const doc={visibilityState:'visible',prerendering:false,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)},win={location:{hash,pathname:'/rapportages/synthetic',search:''},history:{replaceState:(_,__,url)=>{changes.push(url);win.location.hash='';}}};
 return{doc,win,listeners,calls,changes,receipt:createMailOpenReceipt({concertId:'synthetic',doc,win,request:async(...args)=>{calls.push(args);return{ok:true};}})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('No token or ordinary menu visit never registers; valid receipt waits for successful visible report',async()=>{
 const plain=harness('');plain.receipt.shown();await flush();assert.equal(plain.calls.length,0);
 const h=harness();await flush();assert.equal(h.calls.length,0);h.doc.visibilityState='hidden';h.receipt.shown();await flush();assert.equal(h.calls.length,0);assert.deepEqual(h.changes,['/rapportages/synthetic']);h.doc.visibilityState='visible';h.listeners.get('visibilitychange')();await flush();assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0],['report-email-open',{method:'POST',body:{concertId:'synthetic',token:'a'.repeat(64)}}]);h.receipt.shown();await flush();assert.equal(h.calls.length,1);h.receipt.dispose();assert.equal(h.listeners.size,0);
});
test('Prerender and disposed report do not create false openings; request failure never blocks the report',async()=>{
 const h=harness();h.doc.prerendering=true;h.receipt.shown();await flush();assert.equal(h.calls.length,0);h.receipt.dispose();h.doc.prerendering=false;h.receipt.shown();await flush();assert.equal(h.calls.length,0);
 const f=harness('#mail-open=malformed');f.receipt.shown();await flush();assert.equal(f.calls.length,0);
 const doc={visibilityState:'visible',addEventListener(){},removeEventListener(){}};const r=createMailOpenReceipt({concertId:'x',doc,win:{location:{hash:'#mail-open='+'a'.repeat(64),pathname:'/rapportages/x',search:''},history:{replaceState(){}}},request:async()=>{throw Error('offline');}});assert.doesNotThrow(()=>r.shown());await flush();
});
