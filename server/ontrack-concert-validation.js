import {MAILING_VENUES} from './mojo-venues.js';
import {calendarDate,concertId} from './mojo-agenda.js';
export const MAILING_SNAPSHOT_CODES=['MAILING_SNAPSHOT_STRUCTURE','MAILING_SNAPSHOT_WINDOW','MAILING_SNAPSHOT_COVERAGE','MAILING_SNAPSHOT_ARTIST','MAILING_SNAPSHOT_VENUE','MAILING_SNAPSHOT_DATE','MAILING_SNAPSHOT_SOURCE','MAILING_SNAPSHOT_ID'];
export function validateMailingSnapshot(snapshot,{now=new Date()}={}){
 const fail=code=>{throw Error(code);};
 if(!snapshot||!Array.isArray(snapshot.concerts)||snapshot.concerts.length>5000)fail('MAILING_SNAPSHOT_STRUCTURE');
 if(snapshot.from!==calendarDate(now)||!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.until)||Date.parse(snapshot.until)-Date.parse(snapshot.from)!==365*86400000||!Number.isFinite(Date.parse(snapshot.checkedAt))||Math.abs(now.getTime()-Date.parse(snapshot.checkedAt))>600000)fail('MAILING_SNAPSHOT_WINDOW');
 if(!Array.isArray(snapshot.venues)||snapshot.venues.length!==MAILING_VENUES.length||!MAILING_VENUES.every(venue=>snapshot.venues.includes(venue.id)))fail('MAILING_SNAPSHOT_COVERAGE');
 const ids=new Set();for(const row of snapshot.concerts){
  if(!row||typeof row.artist!=='string'||!row.artist.trim()||row.artist.length>160||/[\x00-\x1f]/.test(row.artist))fail('MAILING_SNAPSHOT_ARTIST');
  if(!MAILING_VENUES.some(venue=>venue.name===row.venue&&venue.city===row.city))fail('MAILING_SNAPSHOT_VENUE');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||row.date<snapshot.from||row.date>=snapshot.until||new Date(row.date).toISOString().slice(0,10)!==row.date)fail('MAILING_SNAPSHOT_DATE');
  // Ook MOJO-comedy/festivalpagina’s zijn officiële agendabronnen; nooit externe hosts.
  if(typeof row.sourceUrl!=='string'||!/^https:\/\/www\.mojo\.nl\/[^\s]*$/.test(row.sourceUrl))fail('MAILING_SNAPSHOT_SOURCE');
  if(row.concertId!==concertId(row.artist,row.date,row.venue)||ids.has(row.concertId))fail('MAILING_SNAPSHOT_ID');ids.add(row.concertId);
 }
 return snapshot;
}
