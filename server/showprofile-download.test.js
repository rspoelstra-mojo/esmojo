import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Voortgang pollt tot gereed; download gebruikt de exacte PDF-bytes en ruimt de tijdelijke URL op',async()=>{
 const bytes=await readFile(new URL('./report-original/example-output.pdf',import.meta.url)),calls=[],timers=[],clicked=[];
 class Element{constructor(tag){this.tag=tag;this.children=[];this.classList={add(){},remove(){}};}setAttribute(){}append(...items){this.children.push(...items);}remove(){}click(){clicked.push({href:this.href,fileName:this.download});}}
 const root=new Element('aside'),body=new Element('body');let blob,revoked;
 const sandbox={Uint8Array,Blob,Date,atob,document:{createElement:tag=>new Element(tag),body},URL:{createObjectURL:value=>{blob=value;return'blob:temporary-test';},revokeObjectURL:url=>{revoked=url;}},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},access:async(action,{body:request})=>{assert.equal(action,'show-profile-pdf');calls.push(request.operation);return request.operation==='download'?{state:'ready',fileName:'SP_Voorbeeldartiest_Gashouder_14112026.pdf',pdfBase64:bytes.toString('base64')}:{state:request.operation==='ensure'?'generating':'ready'};}};
 const source=(await readFile(new URL('../src/showprofile-pdf.js',import.meta.url),'utf8')).replace("import { access } from './auth.js';",'').replace('export function','function');
 vm.createContext(sandbox);vm.runInContext(source,sandbox);const dispose=sandbox.createShowProfilePdfWidget(root,{show:{key:'synthetic-only'}});
 await new Promise(resolve=>setImmediate(resolve));const [,status,button]=root.children[0].children;
 assert.equal(status.textContent,'Showprofiel wordt gemaakt en opgeslagen…');assert.equal(button.hidden,true);assert.deepEqual(calls,['ensure']);
 timers.shift()();await new Promise(resolve=>setImmediate(resolve));assert.equal(button.textContent,'Showprofiel downloaden');assert.equal(button.hidden,false);
 await button.onclick();assert.deepEqual(calls,['ensure','status','download']);assert.equal(clicked.length,1);assert.equal(clicked[0].fileName,'SP_Voorbeeldartiest_Gashouder_14112026.pdf');assert.equal(blob.type,'application/pdf');assert.deepEqual(Buffer.from(await blob.arrayBuffer()),bytes);timers.shift()();assert.equal(revoked,'blob:temporary-test');assert.equal(button.disabled,false);dispose();
});
