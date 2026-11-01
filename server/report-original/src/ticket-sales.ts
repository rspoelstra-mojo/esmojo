import {concertShows} from './concerts.ts'
import type {Concert} from './concerts.ts'
export type TicketSale={date:string;time:string;count:string}
export function validSaleCount(value:unknown):value is string{return typeof value==='string'&&/^\d{1,9}$/.test(value)}
export function parseTicketSales(content:unknown,allowEmpty=false):TicketSale[]|null{
 if(typeof content!=='string')return null
 try{
  const rows=JSON.parse(content)
  if(!Array.isArray(rows)||!rows.length||rows.length>5)return null
  const seen=new Set<string>()
  for(const row of rows){
   if(!row||Object.keys(row).sort().join(',')!=='count,date,time'||typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date))||new Date(row.date).toISOString().slice(0,10)!==row.date||typeof row.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)&&row.time!=='Niet vermeld'||!(validSaleCount(row.count)||allowEmpty&&row.count===''))return null
   const key=row.date+'|'+row.time;if(seen.has(key))return null;seen.add(key)
  }
  return rows
 }catch{return null}
}
export function saleShows(concert:Concert){return [...new Map(concertShows(concert).map(show=>[show.date+'|'+show.time,{date:show.date,time:show.time}])).values()].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))}
export function ticketSalesMatch(content:unknown,shows:{date:string;time:string}[]){
 if(validSaleCount(content))return shows.length<=1
 const rows=parseTicketSales(content)
 return Boolean(rows&&rows.length===shows.length&&shows.every(show=>rows.some(row=>row.date===show.date&&row.time===show.time)))
}
export function fullShowDate(date:string){const text=new Date(date+'T12:00:00Z').toLocaleDateString('nl-NL',{timeZone:'Europe/Amsterdam',weekday:'long',day:'numeric',month:'long'});return text[0].toUpperCase()+text.slice(1)}
