const calendarDay=date=>Math.floor(Date.parse(date+'T12:00:00Z')/86400000);
export function groupReportMenu(reports,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),day=calendarDay(today);
 const available=reports.flatMap(report=>{
  // Alleen beschikbare rapportdatums, geen toekomstige agenda-items.
  const dates=(report.dates||[]).filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&calendarDay(date)<=day).sort();
  return dates.length?[{...report,date:dates.at(-1)}]:[];
 }).sort((a,b)=>b.date.localeCompare(a.date)||a.label.localeCompare(b.label,'nl'));
 return[{id:'week',title:'Afgelopen week',reports:available.filter(report=>day-calendarDay(report.date)<=7)},
  {id:'period',title:'Afgelopen periode',reports:available.filter(report=>day-calendarDay(report.date)>=8&&day-calendarDay(report.date)<=45)}];
}
