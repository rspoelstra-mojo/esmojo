import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {reportCoverDate,reportShowDates,REPORT_LAYOUT_VERSION} from '../src/report-show.ts'
import type {Concert} from '../src/concerts.ts'
const concert=(dates:string[]):Concert=>({id:'test',artist:'Test',venue:'Gashouder',city:'Amsterdam',genre:'Live',date:dates[0],time:'20:00',shows:dates.map((date,i)=>({id:String(i),date,time:i===1?'21:00':'20:00'}))})
test('PDF cover shows all unique concert dates compactly and retains the existing single-date format',()=>{
 assert.equal(reportCoverDate(concert(['2026-11-06','2026-11-07','2026-11-08']),'2026-11-06'),'6, 7, 8 november 2026')
 assert.equal(reportCoverDate(concert(['2026-11-08','2026-11-06','2026-11-06']),'2026-11-06'),'6, 8 november 2026')
 assert.equal(reportCoverDate(concert(['2026-10-31','2026-11-01','2026-11-02']),'2026-10-31'),'31 oktober, 1, 2 november 2026')
 assert.equal(reportCoverDate(concert(['2026-12-31','2027-01-01']),'2026-12-31'),'31 december 2026, 1 januari 2027')
 assert.equal(reportCoverDate(concert(['2026-11-06','2026-11-06']),'2026-11-06'),'6 november 2026')
 assert.equal(reportCoverDate(undefined,'2026-11-06'),'6 november 2026')
 assert.throws(()=>reportCoverDate(concert(['2026-02-30']),'2026-02-30'),/Ongeldige showdatum/)
})
test('Apps Script and PDF agree on dates; report revision changes for changed dates, not order, repeated times or artwork',async()=>{
 const context=vm.createContext({Utilities:{DigestAlgorithm:{SHA_256:'sha256'},newBlob:(value:string)=>({getBytes:()=>Buffer.from(value)}),computeDigest:(_algorithm:string,bytes:Uint8Array)=>[...createHash('sha256').update(bytes).digest()]}})
 vm.runInContext(await readFile(new URL('../integrations/google-sheets/Code.gs',import.meta.url),'utf8'),context)
 assert.equal(vm.runInContext('REPORT_LAYOUT_VERSION',context),REPORT_LAYOUT_VERSION)
 const show=concert(['2026-11-06','2026-11-07','2026-11-08']),record={concert_id:'TEST_GASHOUDER_06112026',manager:'Manager',workflow_json:'{}',research_json:'{}',concert_json:JSON.stringify(show)}
 context.record=record
 assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('reportDates_(record)',context))),reportShowDates(show,'2026-11-06'))
 const initial=vm.runInContext('reportRevision_(record)',context)
 record.concert_json=JSON.stringify({...show,image:'https://example.invalid/new.jpg',shows:[...show.shows!].reverse().concat(show.shows![0])})
 assert.equal(vm.runInContext('reportRevision_(record)',context),initial)
 record.concert_json=JSON.stringify(concert(['2026-11-06','2026-11-07','2026-11-09']))
 assert.notEqual(vm.runInContext('reportRevision_(record)',context),initial)
 record.concert_json='';assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('reportDates_(record)',context))),['2026-11-06'])
})

test('approved confidentiality footer creates a new snapshot revision for unchanged source data',async()=>{
 const source=await readFile(new URL('../integrations/google-sheets/Code.gs',import.meta.url),'utf8')
 const revision=(code:string)=>{
  const context=vm.createContext({Utilities:{DigestAlgorithm:{SHA_256:'sha256'},newBlob:(value:string)=>({getBytes:()=>Buffer.from(value)}),computeDigest:(_algorithm:string,bytes:Uint8Array)=>[...createHash('sha256').update(bytes).digest()]}})
  vm.runInContext(code,context)
  context.record={concert_id:'TEST_GASHOUDER_06112026',manager:'Manager',workflow_json:'{}',research_json:'{}',concert_json:'{}'}
  return vm.runInContext('reportRevision_(record)',context)
 }
 assert.notEqual(revision(source),revision(source.replace(REPORT_LAYOUT_VERSION,'gashouder-showprofile-v5-two-pages')))
})
