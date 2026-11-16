// Differential test only: production never loads the archived Google sources.
import assert from 'node:assert/strict';
import {executeShowRules as native} from '../dataverse-shows/rules.js';
import {executeShowRules as archived} from './archived-show-rules.js';
let invocation=0;
const options=(at,seed)=>{let next=0;class Clock extends Date{constructor(...args){super(...(args.length?args:[at]));}static now(){return at;}}return{clock:Clock,newId:()=> '11111111-1111-4111-8111-'+String(seed*1000+(++next)).padStart(12,'0')};};
export function compareShowRules(source,operation,payload={},binary=new Map()){const args=[source,operation,payload,binary],at=Date.now(),seed=++invocation;let expected;try{expected=archived(...args,options(at,seed));}catch(error){assert.throws(()=>native(...args,options(at,seed)),actual=>actual.message===error.message);throw error;}const actual=native(...args,options(at,seed));assert.deepStrictEqual(actual,expected);return actual;}
