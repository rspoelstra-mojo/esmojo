import {createShowData} from './show-data.js';

// Geen browseropslag. Een lease houdt de geopende show in geheugen; na verlaten
// vervalt die na 15 minuten. Lopende writes mogen altijd hun bevestiging verwerken.
export function createShowMemory({request,createData=createShowData,now=Date.now,ttl=15*60*1000,limit=5,setTimer=setTimeout,clearTimer=clearTimeout}){
  const entries=new Map();let timer=null;
  function drop(entry){
    if(entries.get(entry.key)===entry)entries.delete(entry.key);
    entry.live=false;entry.data?.dispose();
  }
  function afterWrites(entry){
    if(entry.waiting)return;entry.waiting=true;
    void entry.data.whenSettled().then(()=>{entry.waiting=false;if(entry.live)prune();});
  }
  function schedule(){
    if(timer!==null)clearTimer(timer);timer=null;
    const idle=[...entries.values()].filter(entry=>!entry.users&&!entry.waiting);
    if(idle.length){const delay=Math.max(1,Math.min(...idle.map(entry=>entry.until))-now());timer=setTimer(prune,delay);timer?.unref?.();}
  }
  function prune(){
    const current=now();
    for(const entry of entries.values())if(!entry.users&&entry.until<=current){if(entry.data?.busy)afterWrites(entry);else drop(entry);}
    for(const entry of [...entries.values()].sort((a,b)=>a.touched-b.touched)){
      if(entries.size<=limit)break;if(entry.users)continue;
      if(entry.data?.busy)afterWrites(entry);else drop(entry);
    }
    schedule();
  }
  return{
    acquire(key){
      prune();let entry=entries.get(key);
      if(!entry){
        entry={key,users:0,until:Infinity,touched:now(),live:true,data:null,view:{tab:0},waiting:false};entries.set(key,entry);
        entry.promise=Promise.resolve().then(()=>request('show-open',{method:'POST',body:{concertId:key}})).then(bundle=>{
          if(!entry.live)throw Error('Showgeheugen gewist.');
          entry.data=createData(bundle,request,key);return entry.data;
        });
      }
      entry.users++;entry.touched=now();entry.until=Infinity;let released=false;
      const ready=entry.promise.then(data=>data.prepare()).then(data=>{if(!entry.live)throw Error('Showgeheugen gewist.');return data;}).catch(error=>{drop(entry);schedule();throw error;});
      prune();
      return{ready,view:entry.view,release(){if(released)return;released=true;if(!entry.live)return;entry.users--;if(!entry.users){entry.until=now()+ttl;if(entry.data?.busy)afterWrites(entry);}prune();}};
    },
    get size(){return entries.size;},
    clear(){for(const entry of entries.values())drop(entry);if(timer!==null)clearTimer(timer);timer=null;},
  };
}
