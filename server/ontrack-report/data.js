// Pure rekenlaag. Geen IO, logs, bestandsnamen of showdefaults.
export const ONTRACK_HEADERS=Object.freeze(['ID','Date and Time','Division','Reporting Department','Type','Zone','Priority','Dispatch','Status','Resolved Status','Resolution Note','Source','Description','Dispatched Units','Affected Person','Comments','Attachments']);
export const REPORT_TIMEZONE='Europe/Amsterdam';
export class OnTrackDataError extends Error{constructor(code,row,field){super(code);this.code=code;this.row=row;this.field=field;}}
const fail=(code,row,field)=>{throw new OnTrackDataError(code,row,field);};
const missing=value=>!value?.trim()||/^n\/a$/i.test(value.trim());
export const displayValue=value=>missing(value)?'Niet opgegeven':value.trim();
const contains=(value,keyword)=>(value||'').toLocaleLowerCase('nl').includes(keyword);

export function parseCsv(input){
  let text;
  try{text=typeof input==='string'?input:new TextDecoder('utf-8',{fatal:true}).decode(input);}catch{fail('CSV_ENCODING');}
  if(Buffer.byteLength(text,'utf8')>2*1024*1024)fail('CSV_TOO_LARGE');
  text=text.replace(/^\uFEFF/,'');
  const first=text.split(/\r?\n/,1)[0],delimiter=first.includes(';')&&!first.includes(',')?';':',';
  const rows=[];let row=[],cell='',quoted=false,afterQuote=false;
  function finishCell(){row.push(cell);cell='';afterQuote=false;}
  function finishRow(){finishCell();if(row.some(value=>value.trim()))rows.push(row);row=[];}
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell||afterQuote)fail('CSV_QUOTES',rows.length+1);quoted=true;continue;}
    if(c===delimiter){finishCell();continue;}
    if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;finishRow();continue;}
    if(afterQuote)fail('CSV_QUOTES',rows.length+1);cell+=c;
  }
  if(quoted)fail('CSV_QUOTES',rows.length+1);if(cell||afterQuote||row.length)finishRow();
  const headers=rows.shift();
  if(!headers||headers.length!==ONTRACK_HEADERS.length||headers.some((value,index)=>value!==ONTRACK_HEADERS[index]))fail('CSV_HEADERS');
  const result=rows.map((cells,index)=>{if(cells.length!==headers.length)fail('CSV_COLUMNS',index+2);return Object.fromEntries(headers.map((name,i)=>[name,cells[i]]));});
  if(!result.length)fail('CSV_EMPTY');return result;
}
const localFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:REPORT_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function localParts(timestamp){const parts=Object.fromEntries(localFormatter.formatToParts(new Date(timestamp)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;}
export function parseOnTrackTime(value,row){
  const match=/^(\d{4}-\d{2}-\d{2}) - (0?[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/i.exec(value.trim());
  if(!match)fail('CSV_TIME',row,'Date and Time');
  const [,date,h,m,period]=match,hour=Number(h)%12+(period.toUpperCase()==='PM'?12:0),time=String(hour).padStart(2,'0')+':'+m,target=date+'T'+time+':00',naive=Date.parse(target+'Z');
  if(!Number.isFinite(naive)||new Date(naive).toISOString().slice(0,10)!==date)fail('CSV_TIME',row,'Date and Time');
  const offsets=new Set([-86400000,0,86400000].map(delta=>Date.parse(localParts(naive+delta)+'Z')-(naive+delta)));
  const candidates=[...offsets].map(offset=>naive-offset).filter(timestamp=>localParts(timestamp)===target).sort((a,b)=>a-b);
  if(!candidates.length)fail('CSV_TIME_NONEXISTENT',row,'Date and Time');
  return {localDate:date,time,minuteOfDay:hour*60+Number(m),timestamp:candidates[0],ambiguous:candidates.length>1};
}
function persons(value,row){
  if(missing(value))return 0;
  const normalized=value.trim().replace(',','.');
  if(!/^\d+(?:\.\d+)?$/.test(normalized)||!Number.isSafeInteger(Number(normalized)))fail('CSV_AFFECTED_PERSON',row,'Affected Person');return Number(normalized);
}
const nextDate=date=>new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
function groups(rows,field){
  const counts=new Map();for(const row of rows){const name=displayValue(row[field]);if(!counts.has(name))counts.set(name,{name,count:0,first:row.position});counts.get(name).count++;counts.get(name).first=Math.min(counts.get(name).first,row.position);}
  return [...counts.values()].sort((a,b)=>b.count-a.count||a.first-b.first).map(({name,count})=>({name,count}));
}
export function calculateReport(input,{generatedAt=new Date().toISOString()}={}){
  if(!Number.isFinite(Date.parse(generatedAt)))fail('REPORT_TIME');
  const raw=parseCsv(input),ids=new Set(),warnings=[];
  const incidents=raw.map((values,position)=>{
    const row=position+2,id=values.ID.trim();if(!id||ids.has(id))fail('CSV_ID',row,'ID');ids.add(id);
    const clock=parseOnTrackTime(values['Date and Time'],row);if(clock.ambiguous)warnings.push({code:'DST_AMBIGUOUS_EARLIEST',row});
    return {id,position,...clock,division:missing(values.Division)?'':values.Division.trim(),type:missing(values.Type)?'':values.Type.trim(),zone:missing(values.Zone)?'':values.Zone.trim(),priority:missing(values.Priority)?'':values.Priority.trim(),description:missing(values.Description)?'':values.Description.trim(),note:missing(values['Resolution Note'])?'':values['Resolution Note'].trim(),resolvedStatus:missing(values['Resolved Status'])?'':values['Resolved Status'].trim(),affectedPerson:persons(values['Affected Person'],row)};
  }).sort((a,b)=>a.timestamp-b.timestamp||a.position-b.position);
  const medical=incidents.filter(row=>contains(row.division,'medisch')),security=incidents.filter(row=>contains(row.division,'beveiliging'));
  const selfcare=medical.filter(row=>contains(row.type,'zelfzorg')||['pcm','paracetemol','paracetamol','pleister','kolven'].some(keyword=>contains(row.description,keyword))).length;
  const sum=keyword=>{const total=incidents.filter(row=>contains(row.resolvedStatus,keyword)).reduce((sum,row)=>sum+row.affectedPerson,0);if(!Number.isSafeInteger(total))fail('CSV_AFFECTED_PERSON');return total;};
  const firstDate=incidents.map(row=>row.localDate).sort()[0],secondDate=nextDate(firstDate);
  const later=incidents.filter(row=>row.localDate>secondDate).length;if(later)warnings.push({code:'GRAPH_DATES_AFTER_SECOND',count:later});
  const eligible=incidents.filter(row=>(row.localDate===firstDate&&row.minuteOfDay>17*60)||row.localDate===secondDate),buckets=new Map();
  for(const row of eligible){const minute=(row.localDate===secondDate?1440:0)+Math.floor(row.minuteOfDay/30)*30;if(!buckets.has(minute))buckets.set(minute,{medical:0,security:0});const bucket=buckets.get(minute);if(contains(row.division,'medisch'))bucket.medical++;if(contains(row.division,'beveiliging'))bucket.security++;}
  const points=[];if(buckets.size){const keys=[...buckets.keys()],start=Math.min(...keys),end=Math.max(...keys);for(let minute=start;minute<=end;minute+=30){const bucket=buckets.get(minute)||{medical:0,security:0},clock=minute%1440;points.push({minute,date:minute>=1440?secondDate:firstDate,time:String(Math.floor(clock/60)).padStart(2,'0')+':'+String(clock%60).padStart(2,'0'),...bucket});}}
  return {exportGeneratedAt:new Date(generatedAt).toISOString(),timeZone:REPORT_TIMEZONE,kpis:{medical:{total:medical.length,selfcare,treatments:medical.length-selfcare,unwell:medical.filter(row=>contains(row.type,'onwelwording')||contains(row.type,'flauwval')).length,ambulance:sum('ambulance')},security:{total:security.length,verbal:incidents.filter(row=>contains(row.type,'verbale')).length,physical:incidents.filter(row=>contains(row.type,'fysieke')).length,evictions:sum('eviction'),arrests:sum('arrest')}},types:{medical:groups(medical,'type').filter(group=>group.count>1),security:groups(security,'type').filter(group=>group.count>1)},timeline:{firstDate,secondDate,points},locations:groups(incidents,'zone').slice(0,7),incidents:incidents.map(row=>({...row,highlight:['high','critical'].includes(row.priority.toLowerCase())})),warnings};
}
