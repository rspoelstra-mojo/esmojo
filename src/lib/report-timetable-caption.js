// Bronbewuste presentatie: TSC-brontijden hebben geen MOJO-ophaaldatum.
export function reportTimetableCaption(timetable){
 const available=timetable?.status==='available';
 if(timetable?.sourceType==='tsc-historical')return available?'Werkelijke tijden uit de historische TSC-rapportage.':'Geen tijden beschikbaar in de historische TSC-rapportage.';
 if(!available)return 'Geen op de showdag opgeslagen MOJO-tijdschema beschikbaar.';
 const capturedAt=timetable.capturedAt;
 if(typeof capturedAt!=='string'||!Number.isFinite(Date.parse(capturedAt)))return 'Geplande tijden volgens MOJO.';
 const captured=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Amsterdam'}).format(new Date(capturedAt));
 return 'Geplande tijden volgens MOJO · vastgelegd '+captured;
}
