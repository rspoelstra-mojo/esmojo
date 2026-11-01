import {compactShowDates} from './show-dates.ts'
import type {Concert} from './concerts.ts'
export const REPORT_LAYOUT_VERSION='gashouder-showprofile-v6-confidential-footer'
export type ReportShow={artist:string;venue:'Gashouder';date:string}
export function gashouderReportEnabled(concertId:string){return /^[A-Z0-9]+(?:_[A-Z0-9]+)*_GASHOUDER_\d{8}(?:_\d{4})?$/.test(concertId)}
export function reportFileName(show:ReportShow){
 const part=(value:string)=>value.replace(/[<>:"/\\|?*]/g,'_').replace(/\s+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'')
 const [year,month,day]=show.date.split('-')
 return `SP_${part(show.artist)}_${part(show.venue)}_${day}${month}${year}.pdf`
}

export function reportShowDates(concert:Concert|undefined,anchorDate:string){
 const dates=concert?.shows?.length?concert.shows.map(show=>show.date):[concert?.date||anchorDate]
 return compactShowDates(dates).map(item=>item.date)
}
export function reportCoverDate(concert:Concert|undefined,anchorDate:string){
 const dates=reportShowDates(concert,anchorDate)
 return compactShowDates(dates,true).map(item=>item.label).join(', ')
}
