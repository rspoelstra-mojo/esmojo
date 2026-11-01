import test from 'node:test'
import assert from 'node:assert/strict'
import {fitReportText} from '../server/report-text-fit.ts'
test('text fitting tries every exact tenth and stops at the largest fitting size',()=>{
 const tried:number[]=[]
 assert.equal(fitReportText(size=>{tried.push(size);return size<=11.7}),11.7)
 assert.deepEqual(tried,[12,11.9,11.8,11.7])
})
test('text fitting preserves the original size when possible and never skips a tenth',()=>{
 let calls=0;assert.equal(fitReportText(()=>{calls++;return true}),12);assert.equal(calls,1)
 const tried:number[]=[];assert.equal(fitReportText(size=>{tried.push(size);return size<=13.8},14),13.8);assert.deepEqual(tried,[14,13.9,13.8])
})
test('text fitting cannot loop indefinitely or silently drop text if no size fits',()=>{
 let calls=0;assert.throws(()=>fitReportText(()=>{calls++;return false}),/oorspronkelijke tekstvakken/);assert.equal(calls,120)
})
