import {test} from 'node:test';import assert from 'node:assert/strict';
import {homePlanning,calendarMonth,shiftMonth,deadlineSummary,homeShowDates,nextHomeMidnight} from './home-planning.js';
import {homeCatalogue} from './home-catalogue.js';
import {readFileSync} from 'node:fs';
const now=new Date('2026-11-04T12:00:00Z'),show=(key,date,extra={})=>({key,name:key,venueId:'gashouder',venue:'Gashouder',city:'Amsterdam',dates:[date],assigned:true,snapshot:{},...extra});
test('Alleen Gashouder; vijf kaarten maar volledige persoonlijke deadline- en showverzameling',()=>{
 const data={shows:[...Array.from({length:8},(_,i)=>show('show-'+i,`2026-11-${String(i+5).padStart(2,'0')}`)),show('andere-zaal','2026-11-04',{venueId:'ziggo-dome',venue:'Ziggo Dome'}),show('verwijderd','2026-11-04',{deleted:true}),show('ongekoppeld','2026-11-04',{assigned:false})]};
 const model=homePlanning(data,now);assert.equal(model.shows.length,9);assert.equal(model.upcoming.length,5);assert.equal(model.upcoming[0].key,'ongekoppeld');assert.equal(model.assigned.length,8);assert.equal(model.tasks.length,40);assert.equal(model.completedCount,0);assert.ok(model.tasks.every(task=>task.showKey.startsWith('show-')));assert.equal(model.groups.find(group=>group.id==='week').tasks.some(task=>task.date>'2026-11-08'),false);assert.equal(model.groups.find(group=>group.id==='next-week').tasks.every(task=>task.date>'2026-11-08'&&task.date<='2026-11-15'),true);assert.equal(model.tasks.some(task=>task.date>'2026-11-08'),true);
});
test('Bestaande planning eerste reeksdatum; ontbrekende gegevens worden geen verzonnen tijden/statussen',()=>{
 const data={shows:[show('reeks','2026-11-03',{dates:['2026-11-03','2026-11-04','2026-11-05'],times:{'2026-11-04':'19:30'},snapshot:{pdf:{state:'ready'}}}),show('onleesbaar','2026-11-05',{planningUnavailable:true})]};
 const model=homePlanning(data,now);assert.equal(model.shows[0].date,'2026-11-04');assert.equal(model.shows[0].time,'19:30');assert.equal(model.shows[0].status,'behind');assert.equal(model.shows[1].status,'unknown');assert.equal(model.unavailableCount,1);assert.equal(model.tasks.some(task=>task.kind==='profile'),false);assert.equal(model.tasks.find(task=>task.kind==='operational').date,'2026-10-20');assert.equal(model.shows[1].time,null);
 const early=homePlanning({shows:[show('voorbereid','2026-12-31',{snapshot:{pdf:{state:'ready'}}})]},now);assert.equal(early.shows[0].status,'ontrack','Geen onbevestigde voorsprongstatus');
});
test('Nederlandse weekgrenzen: oude achterstand, verlopen deze week, vandaag en na zondag gescheiden',()=>{
 for(const [timestamp,today,monday,sunday]of [['2026-11-01T23:30:00Z','2026-11-02','2026-11-02','2026-11-08'],['2026-11-08T21:00:00Z','2026-11-08','2026-11-02','2026-11-08'],['2026-12-31T23:30:00Z','2027-01-01','2026-12-28','2027-01-03'],['2026-03-29T22:30:00Z','2026-03-30','2026-03-30','2026-04-05']]){
  const model=homePlanning({shows:[show('fixture',today)]},new Date(timestamp));assert.equal(model.today,today);assert.equal(model.monday,monday);assert.equal(model.sunday,sunday);assert.equal(model.groups.find(group=>group.id==='today').tasks[0].kind,'show');assert.equal(model.weekCount,model.tasks.filter(task=>task.date>=monday&&task.date<=sunday).length);
 }
 assert.equal(deadlineSummary(1,1),'1 deadline openstaand, waarvan 1 deze week');
});
test('Maandraster begint maandag, eindigt zondag en bereikt schrikkeldag/volgend jaar',()=>{
 for(const month of ['2026-11','2027-01','2028-02']){const dates=calendarMonth(month);assert.equal(new Date(dates[0]+'T12:00:00Z').getUTCDay(),1);assert.equal(new Date(dates.at(-1)+'T12:00:00Z').getUTCDay(),0);assert.ok(dates.includes(month+'-01'));}
 assert.ok(calendarMonth('2028-02').includes('2028-02-29'));assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2027-01',-1),'2026-12');assert.throws(()=>calendarMonth('2026-13'));
});
test('Catalogus behoudt reeksidentiteit/historische eerste datum en toont alleen actueel geïmporteerde Gashouder-groepen',()=>{
 const row=(id,date,extra={})=>({concertId:id,generalConcertId:id,folderId:'f-'+id,generalFolderId:'f-'+id,artist:id,venue:'Gashouder',city:'Amsterdam',date,...extra});
 const first=row('reeks','2026-11-03',{assignments:[{userId:'richard-id',role:'event-safety-manager'}]}),later={...first,concertId:'later',date:'2026-11-04',time:'19:30'},other=row('ziggo','2026-11-04',{venue:'Ziggo Dome'}),state={version:1,managedBy:'ESMOJO/MOJO-v1',checkedAt:now.toISOString(),active:['later','ziggo'],concerts:[first,later,other,row('verdwenen','2026-11-05')]};
 const assignments=[{concertId:'reeks',userId:'richard-id',role:'event-safety-manager'}],result=homeCatalogue(state,'richard-id',assignments);assert.equal(result.length,1);assert.equal(result[0].key,'reeks');assert.deepEqual(result[0].dates,['2026-11-03','2026-11-04']);assert.equal(result[0].assigned,true);assert.equal(homeCatalogue(state,'richard-id')[0].assigned,false,'Openbare indexvelden verlenen geen persoonlijke toewijzing');assert.equal(homeCatalogue(state,'ander',assignments)[0].assigned,false);assert.deepEqual(result[0].times,{'2026-11-04':'19:30'});assert.equal('assignments' in result[0],false);
 assert.equal(readFileSync('google-apps-script/HomeCatalogue.gs','utf8').split('\n').slice(1).join('\n'),readFileSync('shared/home-catalogue.js','utf8').replaceAll('export ',''));
});

test('Showlijsten combineren echte reeksen; gedeelde reeksdeadlines blijven uniek en linken naar de bestaande reeks',()=>{
 const source=show('reeks','2026-11-05',{dates:['2026-11-05','2026-11-06','2026-11-07'],concerts:[{key:'dag1',date:'2026-11-05',assigned:true},{key:'dag2',date:'2026-11-06',assigned:true},{key:'dag3',date:'2026-11-07',assigned:true}]});
 const model=homePlanning({shows:[source]},now);assert.equal(model.assigned.length,1);assert.equal(model.upcoming.length,1);assert.equal(model.tasks.length,5);assert.equal(new Set(model.tasks.map(task=>task.id)).size,5);assert.deepEqual(model.upcoming.map(show=>show.key),['reeks']);assert.equal(homeShowDates(model.upcoming[0].dates),'5, 6, 7 november 2026');assert.ok(model.tasks.every(task=>task.href.startsWith('/shows/reeks?tab=')));
});

test('Maximaal zes eigen reeksen; verleden en afgeronde taken uit lijst maar behouden in kalender',()=>{
 const shows=[show('verleden','2026-11-01'),show('klaar','2026-11-05',{snapshot:{completion:{profile:true,production:true,operational:false,measures:false}}}),...Array.from({length:8},(_,i)=>show('volgend-'+i,'2026-11-'+String(i+6).padStart(2,'0')))];const model=homePlanning({shows},now);
 assert.equal(model.upcoming.length,5);assert.equal(model.myShows.length,6);assert.equal(model.myShows[0].key,'klaar');assert.equal(model.assigned.length,9);
 assert.equal(model.tasks.some(task=>task.showKey==='verleden'),false);assert.equal(model.calendarTasks.filter(task=>task.showKey==='verleden').length,5);
 assert.equal(model.tasks.some(task=>task.showKey==='klaar'&&['profile','production'].includes(task.kind)),false);assert.equal(model.calendarTasks.filter(task=>task.showKey==='klaar'&&task.completed).length,2);
 assert.equal(homeShowDates(['2026-11-30','2026-12-01']),'30 november 2026 · 1 december 2026');assert.equal(homeShowDates(['2026-11-08','2026-11-06','2026-11-07','2026-11-06']),'6, 7, 8 november 2026');
});

test('Daggroepen wisselen exact om Nederlandse middernacht, ook bij zomer/wintertijd',()=>{
 for(const date of ['2026-11-05T22:59:59.000Z','2026-03-29T21:59:59.000Z','2026-10-25T22:59:59.000Z','2026-12-31T22:59:59.000Z'])assert.equal(nextHomeMidnight(new Date(date)),1000);
 assert.equal(nextHomeMidnight(new Date('2026-03-28T23:00:00Z')),23*3600000);assert.equal(nextHomeMidnight(new Date('2026-10-24T22:00:00Z')),25*3600000);
});

test('Importhistorie behoudt afgelopen shows in kalender maar herintroduceert geen verdwenen toekomstige concerten',()=>{
 const model=homePlanning({shows:[show('verdwenen','2026-11-07',{activeDates:[]}),show('afgelopen','2026-11-01',{activeDates:[]}),show('actueel','2026-11-06',{activeDates:['2026-11-06']})]},now);assert.deepEqual(model.upcoming.map(show=>show.key),['actueel']);assert.deepEqual(model.myShows.map(show=>show.key),['actueel']);assert.equal(model.tasks.some(task=>task.showKey!=='actueel'),false);assert.equal(model.calendarTasks.some(task=>task.showKey==='afgelopen'),true);assert.equal(model.calendarTasks.some(task=>task.showKey==='verdwenen'),false);
});

const ready={profile:true,operational:true,production:true,measures:true};
test('Jaartellers gebruiken gekoppelde showdagen van januari t/m december, inclusief verleden en al voorbereide toekomstige shows',()=>{
 const shows=[show('verleden','2026-01-01',{activeDates:[],snapshot:{completion:ready}}),show('vandaag','2026-11-04',{activeDates:[],snapshot:{completion:ready}}),show('toekomst','2026-12-31',{snapshot:{completion:ready}}),show('open','2026-11-05'),show('vorig','2025-12-31',{snapshot:{completion:ready}}),show('volgend','2027-01-01',{snapshot:{completion:ready}}),show('ongekoppeld','2026-11-06',{assigned:false,snapshot:{completion:ready}}),show('geannuleerd','2026-11-07',{cancelled:true,snapshot:{completion:ready}}),show('verdwenen-toekomst','2026-11-08',{activeDates:[],snapshot:{completion:ready}}),show('andere-zaal','2026-11-09',{venueId:'afas-live',venue:'AFAS Live',snapshot:{completion:ready}})];
 const model=homePlanning({shows},now);assert.equal(model.yearCount,4);assert.equal(model.completedCount,3);assert.equal(model.yearStart,'2026-01-01');assert.equal(model.yearEnd,'2026-12-31');assert.equal(model.shows.find(show=>show.key==='toekomst').status,'completed');assert.equal(model.shows.find(show=>show.key==='toekomst').planning.steps[4].completed,false);
 for(const key of Object.keys(ready)){const model=homePlanning({shows:[show('incompleet','2026-12-31',{snapshot:{completion:{...ready,[key]:false}}})]},now);assert.equal(model.yearCount,1);assert.equal(model.completedCount,0);}
 assert.equal(homePlanning({shows:[show('onbekend','2026-11-06',{planningUnavailable:true,snapshot:{completion:ready}})]},now).completedCount,0);
});
test('Reeksen over jaargrenzen tellen uitsluitend werkelijk gekoppelde kalenderdagen; kaarten en deadlines blijven gegroepeerd',()=>{
 const source=show('reeks','2026-12-31',{dates:['2026-12-30','2026-12-31','2027-01-01'],snapshot:{completion:ready},concerts:[{key:'dag1',date:'2026-12-30',assigned:true},{key:'dag2',date:'2026-12-31',assigned:false},{key:'dag3',date:'2027-01-01',assigned:true}]});
 const a=homePlanning({shows:[source,source]},now);assert.equal(a.yearCount,1);assert.equal(a.completedCount,1);
 const b=homePlanning({shows:[source]},new Date('2026-12-31T23:00:01Z'));assert.equal(b.today,'2027-01-01');assert.equal(b.yearCount,1);assert.equal(b.completedCount,1);assert.equal(b.upcoming.length,1);assert.equal(b.myShows.length,1);
 const full={...source,concerts:source.concerts.map(day=>({...day,assigned:true}))};assert.equal(homePlanning({shows:[full]},now).yearCount,2);assert.equal(homePlanning({shows:[show('reeks-zonder-dagmetadata','2026-11-06',{dates:['2026-11-06','2026-11-07','2026-11-07'],snapshot:{completion:ready}})]},now).yearCount,2);
});
test('Een bevestigde afronding/heropening wijzigt de jaarteller onmiddellijk zonder wachten op de showdatum',()=>{
 const data={shows:[show('aankomend','2026-12-31',{snapshot:{completion:{...ready,measures:false}}})]};assert.equal(homePlanning(data,now).completedCount,0);data.shows[0].snapshot.completion.measures=true;assert.equal(homePlanning(data,now).completedCount,1);data.shows[0].snapshot.completion.operational=false;assert.equal(homePlanning(data,now).completedCount,0);
});

test('Elke deadline linkt in één klik naar de canonieke show en het bijbehorende tabblad',()=>{
 const model=homePlanning({shows:[show('BUNT._Gashouder_01122026','2026-12-01',{routeKey:'canonieke reeks'})]},now);
 assert.deepEqual(model.calendarTasks.map(task=>new URL(task.href,'https://esmojo.nl').searchParams.get('tab')),['showprofiel','risicoanalyse','risicoanalyse','maatregelen','overzicht']);assert.ok(model.calendarTasks.every(task=>task.href.startsWith('/shows/canonieke%20reeks?tab=')));
});

test('Buiten Westen blijft vandaag tot en met de laatste showdag; kalender bewaart alle drie dagen',()=>{
 const source=show('Buiten-Westen_Gashouder_06112026','2026-11-06',{dates:['2026-11-06','2026-11-07','2026-11-08'],activeDates:['2026-11-07','2026-11-08'],snapshot:{completion:ready}}),data={shows:[source]};
 for(const day of ['2026-11-07','2026-11-08']){
  const model=homePlanning(data,new Date(day+'T12:00:00Z'));assert.equal(model.openCount,1);assert.equal(model.tasks[0].kind,'show');assert.equal(model.tasks[0].date,day);assert.equal(model.groups[0].id,'today');assert.equal(model.groups.some(group=>group.id==='overdue'),false);
  const calendar=model.calendarTasks.filter(task=>task.kind==='show');assert.deepEqual(calendar.map(task=>task.date),source.dates);assert.equal(new Set(calendar.map(task=>task.id)).size,3);assert.ok(calendar.filter(task=>task.date<day).every(task=>task.completed));assert.ok(calendar.filter(task=>task.date>=day).every(task=>!task.completed));
 }
 const ended=homePlanning(data,new Date('2026-11-08T23:00:00Z'));assert.equal(ended.openCount,0);assert.equal(ended.groups.length,0);assert.equal(ended.upcoming.length,0);assert.ok(ended.calendarTasks.filter(task=>task.kind==='show').every(task=>task.completed));
});
test('De volgende showdag staat in de juiste kalenderweek en wordt niet voor iedere resterende dag gedupliceerd',()=>{
 const source=show('reeks','2026-11-06',{dates:['2026-11-06','2026-11-07','2026-11-08'],snapshot:{completion:ready}}),data={shows:[source]};
 const nextWeek=homePlanning(data,new Date('2026-10-31T12:00:00Z'));assert.equal(nextWeek.groups[0].id,'next-week');assert.equal(nextWeek.groups[0].title,'Volgende week');assert.equal(nextWeek.groups[0].tasks.length,1);assert.equal(nextWeek.groups[0].tasks[0].date,'2026-11-06');assert.equal(nextWeek.weekCount,0);
 const thisWeek=homePlanning(data,new Date('2026-11-05T12:00:00Z'));assert.equal(thisWeek.groups[0].id,'week');assert.equal(thisWeek.groups[0].tasks.length,1);assert.equal(thisWeek.weekCount,1);
 const between=homePlanning({shows:[{...source,dates:['2026-11-06','2026-11-08']}]},new Date('2026-11-07T12:00:00Z'));assert.equal(between.tasks[0].date,'2026-11-08');assert.equal(between.groups[0].id,'week');
});
