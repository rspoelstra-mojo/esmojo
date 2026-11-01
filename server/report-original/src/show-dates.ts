/** Compact unique calendar dates while preserving month and year boundaries. */
export function compactShowDates(values:string[],includeYear=false){
 const dates=[...new Set(values)].sort()
 if(dates.some(date=>!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date))throw new Error('Ongeldige showdatum.')
 const spansYears=new Set(dates.map(date=>date.slice(0,4))).size>1
 return dates.map((date,index)=>{
  const sharedMonth=dates[index+1]?.slice(0,7)===date.slice(0,7)
  const label=new Date(date+'T12:00:00Z').toLocaleDateString('nl-NL',{day:'numeric',...(!sharedMonth?{month:'long',...((spansYears||(includeYear&&index===dates.length-1))?{year:'numeric'}:{})}:{}),timeZone:'Europe/Amsterdam'})
  return {date,label}
 })
}
