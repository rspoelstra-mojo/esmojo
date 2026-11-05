import {parse} from 'parse5';
import {createHash} from 'node:crypto';
import {mojoConcertUrl} from './mojo-photo.js';
import {MOJO_VENUES,matchesMojoVenue} from './mojo-venues.js';
import {nextTimetableDate,validateTimetable} from '../shared/show-timetable.js';
const attr=(node,name)=>node.attrs?.find(item=>item.name===name)?.value||'';
const children=node=>node.childNodes||[];
const all=(node,predicate)=>{const result=[];function walk(item){if(predicate(item))result.push(item);for(const child of children(item))walk(child);}walk(node);return result;};
const text=node=>node.nodeName==='#text'?node.value:['script','style','nav','footer'].includes(node.tagName)?'':children(node).map(text).join(' ').replace(/\s+/g,' ').trim();
const hasClass=(node,name)=>attr(node,'class').split(/\s+/).includes(name);
const normalized=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('nl').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function clock(value){
 if(/[€$£%]/.test(value))return null;
 const matches=[...value.matchAll(/\b(\d{1,2})(?::|\.|h)(\d{2})(?:\s*(a\.?m\.?|p\.?m\.?))?\b/gi)];
 if(!matches.length){const hour=/^\s*(\d{1,2})\s*(?:uur|u|h)\s*$/i.exec(value);return hour&&Number(hour[1])<24?hour[1].padStart(2,'0')+':00':null;}
 if(matches.length>1&&!/^\s*\d{1,2}[:.h]\d{2}\s*(?:[-–—]|tot)\s*\d{1,2}[:.h]\d{2}\s*(?:uur|u)?\s*$/i.test(value))return null;
 let hour=Number(matches[0][1]),minute=Number(matches[0][2]);const period=matches[0][3]?.replace(/\./g,'').toLowerCase();if(period){if(hour<1||hour>12)return null;hour=hour%12+(period==='pm'?12:0);}if(hour===24&&minute===0&&!period)return'00:00';if(hour>23||minute>59)return null;
 return String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
}
function classify(label){
 if(/\b(?:deuren|doors|zaal)\b.*\bopen\b/i.test(label))return{kind:'doors',label};
 if(/\b(?:pauze|intermission|interval)\b/i.test(label))return{kind:'pause',label};
 if(/\b(?:verwacht\s+einde|eindtijd|einde(?:\s+show)?|expected\s+end|curfew)\b/i.test(label))return{kind:'end',label};
 const name=label.replace(/^(?:support(?:\s+act)?|voorprogramma|surprise(?:\s+act)?|special\s+guest|hoofdact|headliner|main\s+act)\b\s*(?:[:–—-]\s*)?/i,'').trim();return{kind:'act',label:name||label};
}
export function parseMojoTimetable(html,show,{capturedAt=new Date().toISOString()}={}){
 if(typeof html!=='string'||html.length>2000000||!mojoConcertUrl(show.sourceUrl))throw Error('TIMETABLE_SOURCE');
 const document=parse(html),title=all(document,node=>node.tagName==='h1')[0];if(!title||!(' '+normalized(text(title))+' ').includes(' '+normalized(show.artist)+' '))throw Error('TIMETABLE_CONTEXT');
 const headings=all(document,node=>/^h[1-6]$/.test(node.tagName||'')&&/^(?:tijdschema|time\s*table|timetable|time\s*schedule)$/i.test(text(node)));
 let reason='NOT_PUBLISHED',rows=[],unresolved=[];
 for(const heading of headings){
  let scope=heading.parentNode;while(scope?.parentNode&&!all(scope,node=>attr(node,'role')==='tabpanel').length&&!['section','article','main'].includes(scope.tagName))scope=scope.parentNode;
  const panels=all(scope,node=>attr(node,'role')==='tabpanel'),forDate=panels.filter(panel=>new RegExp('(?:^|[^0-9])'+show.date+'(?:[^0-9]|$)').test(attr(panel,'id')+' '+attr(panel,'data-date'))),venue=MOJO_VENUES.find(venue=>venue.name===show.venue&&venue.city===show.city);
  if(!forDate.length){reason='DATE_NOT_PUBLISHED';continue;}
  const dated=forDate.filter(panel=>venue&&matchesMojoVenue(all(panel,node=>hasClass(node,'item-list__label')).map(text).join(' '),venue));
  if(dated.length>1)throw Error('TIMETABLE_AMBIGUOUS');if(!dated.length)throw Error('TIMETABLE_CONTEXT');const panel=dated[0];
  const items=all(panel,node=>node.tagName==='li'||node.tagName==='tr');
  for(const item of items){
   const labelNode=all(item,node=>hasClass(node,'item-list__title')||/^h[3-6]$/.test(node.tagName||''))[0]||children(item).find(node=>['th','td','strong'].includes(node.tagName)),bodyNode=all(item,node=>hasClass(node,'item-list__body'))[0];
   if(!labelNode)continue;const publishedLabel=text(labelNode),body=bodyNode?text(bodyNode):children(item).filter(node=>node!==labelNode).map(text).join(' '),time=clock(body);
   if(!publishedLabel)continue;if(!time){unresolved.push(publishedLabel);continue;}rows.push({...classify(publishedLabel),publishedLabel,time,explicitNextDay:/^\s*24[:.h]00\b/.test(body)});
  }
  const anchor=rows.find(row=>row.kind==='doors')?.time||(/-(\d{2})(\d{2})$/.exec(attr(panel,'id'))||[]).slice(1).join(':');
  let rolled=false,previous=null;rows=rows.map(({explicitNextDay,...row})=>{if(!anchor&&previous&&Number(previous.slice(0,2))>=18&&Number(row.time.slice(0,2))<12)rolled=true;previous=row.time;return{...row,localDate:(explicitNextDay||anchor&&anchor>='12:00'&&row.time<'12:00'||rolled)?nextTimetableDate(show.date):show.date};});
  reason=rows.length?null:'TIME_NOT_PUBLISHED';break;
 }
 rows=rows.sort((a,b)=>(a.localDate+a.time).localeCompare(b.localDate+b.time));const unique=[...new Map(rows.map(row=>[JSON.stringify(row),row])).values()];
 return validateTimetable({concertId:show.concertId,date:show.date,sourceUrl:show.sourceUrl,capturedAt,sourceHash:createHash('sha256').update(html).digest('hex'),status:unique.length?'available':'missing',reason:unique.length?null:reason,entries:unique,unresolved:[...new Set(unresolved)]},show);
}
export async function fetchMojoTimetable(show,{request=fetch,now=()=>new Date()}={}){
 const source=mojoConcertUrl(show.sourceUrl);if(!source)throw Error('TIMETABLE_SOURCE');
 const response=await request(source,{headers:{'User-Agent':'Mozilla/5.0',Accept:'text/html','Cache-Control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html')||Number(response.headers.get('content-length')||0)>2000000)throw Error('TIMETABLE_SOURCE');
 return parseMojoTimetable(await response.text(),show,{capturedAt:now().toISOString()});
}
