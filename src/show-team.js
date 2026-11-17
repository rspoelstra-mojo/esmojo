import './show-team.css';
import {teamRows} from './lib/show-team.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
// Beknopt teamblok in dezelfde vormgeving als het tijdschema: functie links, naam rechts. De namen komen uit de Personeelsplanning
// (Vertrouwelijk, alleen lezen achter de Shows-module) en worden pas opgehaald wanneer het Overzicht zichtbaar is.
// De regel "Bijgewerkt op" is voorlopig een vaste placeholder die later wordt gekoppeld.
export function createShowTeam(block,{show,request=null,updated='Bijgewerkt op 17 nov om 12:51',refreshAfter=10*60*1000}={}){
  const body=node('div','show-team-body'),list=node('dl','show-team-list'),controller=new AbortController();let disposed=false,loading=false,loadedAt=0,failed=false;
  function render(roles){
    list.replaceChildren();
    for(const row of teamRows(roles)){const item=node('div','show-team-row'),name=node('dd','',row.name||'Nog niet ingevuld');if(!row.name)name.dataset.empty='true';item.append(node('dt','',row.label),name);list.append(item);}
  }
  render(null);body.append(list,node('p','show-team-updated',updated));block.append(body);
  async function load(){
    if(!request||loading||disposed)return;loading=true;
    try{const data=await request('show-team',{method:'POST',body:{concertId:show.key},signal:controller.signal});if(disposed)return;failed=false;loadedAt=Date.now();render(data?.roles);}
    catch{if(!disposed)failed=true;}finally{loading=false;}
  }
  return{
    // Herhaald aanroepen is veilig: pas opnieuw ophalen na een tijdje of na een eerdere fout.
    start(){if(disposed)return;if(!loadedAt||failed||Date.now()-loadedAt>refreshAfter)void load();},
    dispose(){disposed=true;controller.abort();body.remove();},
    body,
  };
}
