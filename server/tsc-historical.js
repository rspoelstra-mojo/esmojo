import {createHash} from 'node:crypto';
import {parseCsv,calculateReport,ONTRACK_HEADERS} from './ontrack-report/data.js';
import {validateReportDay} from './web-report-catalogue.js';
import {validTscShowData} from '../shared/report-source.js';
const headers=['Date and Time','Discipline','Type','Priority','Description','Resolution Note'];
const metaHeaders=['visitors','evictions','arrests','doors','start','end'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const quote=value=>'"'+String(value).replace(/"/g,'""')+'"';
export function convertTscHistorical(input,{concertId,date}={}){
 const original=Buffer.from(input),text=new TextDecoder('utf-8',{fatal:true}).decode(original);
 if(Buffer.byteLength(text)>2*1024*1024||typeof concertId!=='string'||!concertId||/[\x00-\x1f/\\]/.test(concertId))throw Error('TSC_INVALID');
 const clean=text.replace(/^\uFEFF/,''),lineEnd=clean.indexOf('\n');if(lineEnd<0)throw Error('TSC_HEADER');
 const first=clean.slice(0,lineEnd).replace(/\r$/,''),csv=clean.slice(lineEnd+1);
 const raw=/^\s*,\s*,\s*,\s*,\s*,\s*$/.test(first)?Object.fromEntries(metaHeaders.map(key=>[key,''])):parseCsv(metaHeaders.join(',')+'\n'+first,{headers:metaHeaders})[0];
 const showData={};
 for(const key of metaHeaders.slice(0,3)){const value=raw[key].trim();if(value&&!/^\d{1,9}$/.test(value))throw Error('TSC_COUNT');showData[key]=value?Number(value):null;}
 for(const [key,label]of [['doors','Deuren open'],['start','Aanvang show'],['end','Einde show']]){
  const value=raw[key].trim();if(!value||value===label){showData[key]=null;continue;}
  const match=new RegExp('^'+label+' ((?:[01]\\d|2[0-3]):[0-5]\\d)$').exec(value);if(!match)throw Error('TSC_TIME');showData[key]=match[1];
 }
 if(!validTscShowData(showData))throw Error('TSC_METADATA_INVALID');
 const all=parseCsv(csv,{headers}),kept=all.map((row,index)=>({row,index})).filter(({row})=>!/schoonmaak/iu.test(row.Discipline));
 const converted=[ONTRACK_HEADERS.map(quote).join(',')];
 for(const {row,index}of kept){const mapped={...row,ID:'tsc-'+hash(concertId+'\n'+index),Division:row.Discipline.trim().toLowerCase()==='ehbo'?'Medisch':row.Discipline};delete mapped.Discipline;converted.push(ONTRACK_HEADERS.map(key=>quote(mapped[key]??'')).join(','));}
 const bytes=Buffer.from(converted.join('\r\n')+'\r\n');validateReportDay(calculateReport(bytes,{generatedAt:'2026-01-01T00:00:00.000Z'}),date);
 return{sourceType:'tsc-historical',showData,csvBase64:bytes.toString('base64'),sha256:hash(bytes),incidentCount:kept.length,originalSha256:hash(original),originalCsvBase64:original.toString('base64'),excludedCleaning:all.length-kept.length};
}
