import {test} from 'node:test';import assert from 'node:assert/strict';
import {webReportTimeline,savedTimelineBounds,timelineHoverMinute,timelineTime} from './report-timeline.js';
const date='2026-11-03',entry=(kind,time,localDate=date)=>({kind,time,localDate,label:kind,publishedLabel:kind}),snapshot=(entries)=>({concertId:'Synthetic_Ziggo-Dome_03112026',date,sourceUrl:'https://www.mojo.nl/concerten/synthetic',capturedAt:date+'T11:00:00.000Z',sourceHash:'a'.repeat(64),status:'available',reason:null,entries,unresolved:[]});
const report={timeline:{firstDate:date,points:[{minute:1080,date,time:'18:00',medical:2,security:0}]},incidents:[{localDate:date,time:'16:30',division:'Medisch'},{localDate:date,time:'18:30',division:'Medisch'},{localDate:date,time:'23:00',division:'Beveiliging'},{localDate:'2026-11-04',time:'00:30',division:'Beveiliging'},{localDate:'2026-11-04',time:'02:00',division:'Beveiliging'}]};
test('Alleen één duidelijke opgeslagen deuren- en eindtijd bepalen het webvenster, ook over middernacht',()=>{
 const schedule=snapshot([entry('doors','16:00'),entry('act','20:00'),entry('end','01:00','2026-11-04')]);const graph=webReportTimeline(report,schedule,date);
 assert.deepEqual(graph.domain,{start:960,end:1500});assert.equal(graph.points[0].time,'16:00');assert.equal(graph.points.at(-1).time,'01:00');assert.equal(graph.points.at(-1).date,'2026-11-04');assert.equal(graph.points.reduce((n,p)=>n+p.medical,0),2,'Ook echte incidenten voor 17:00 binnen het geplande venster');assert.equal(graph.points.reduce((n,p)=>n+p.security,0),2,'Na de geplande eindtijd niet in de webgrafiek');assert.equal(report.incidents.length,5);assert.equal(report.timeline.points.length,1);
});
test('Ontbrekende/ambigue/ongeldige of niet op de showdag opgeslagen grenzen houden exact de bestaande tijdlijn',()=>{
 for(const schedule of [null,snapshot([entry('doors','18:00')]),snapshot([entry('end','23:00')]),snapshot([entry('doors','18:00'),entry('doors','19:00'),entry('end','23:00')]),snapshot([entry('end','17:00'),entry('doors','18:00')]),{...snapshot([entry('doors','18:00'),entry('end','23:00')]),capturedAt:date+'T14:00:00.000Z'}])assert.equal(webReportTimeline(report,schedule,date),report.timeline);
 assert.equal(savedTimelineBounds(snapshot([entry('doors','18:00'),entry('end','23:00')]),'2026-11-04'),null);
});
test('Niet-afgeronde grenzen blijven exact; halve-uurvakken en tooltip tonen alleen de juiste kloktijd',()=>{
 const schedule=snapshot([entry('doors','18:45'),entry('end','23:10')]),graph=webReportTimeline(report,schedule,date);assert.deepEqual(graph.domain,{start:1125,end:1390});assert.equal(graph.points[0].time,'18:45');assert.equal(graph.points.reduce((n,p)=>n+p.medical,0),0);
 assert.equal(timelineTime(timelineHoverMinute(graph,0)),'18:45');assert.equal(timelineTime(timelineHoverMinute(graph,1)),'23:10');assert.equal(timelineTime(1500).replace(':','.'),'01.00');assert.equal(timelineTime(timelineHoverMinute({points:[{minute:1200},{minute:1230},{minute:1260}]},1)).replace(':','.'),'21.00');
});
