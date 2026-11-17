import './show-information.css';
import {showInformation,scoreHue} from './lib/show-information.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const numbers=new Intl.NumberFormat('nl-NL');
const empty='Nog niet ingevuld';
// Blok Show informatie: risico's per klasse (zelfde kleuren als de artiestenpagina), analysescores en kerngegevens uit het showprofiel.
// Leest uitsluitend uit de bevestigde showcontext; geen eigen verzoeken of opslag.
export function createShowInformation(block,{show,data}){
  const body=node('div','show-information-body');block.append(body);let disposed=false;
  function row(list,label,value,{long=false}={}){
    const item=node('div','show-information-row'),term=node('dt','',label),detail=node('dd','',value??empty);
    if(value==null)detail.dataset.empty='true';else if(long)detail.title=value;
    if(long)detail.dataset.long='true';item.append(term,detail);list.append(item);
  }
  function render(){
    if(disposed)return;const info=showInformation(show,data.informationSnapshot());body.replaceChildren();
    // Volgorde: kerngegevens, Analyses en direct daaronder Risico's.
    // Analyses: twee tegels die meekleuren met het eindcijfer (1 groen … 10 rood).
    const analyses=node('section','show-information-section');analyses.setAttribute('aria-label','Analyses');
    analyses.append(node('h3','show-information-subtitle','Analyses'));
    const scores=node('dl','show-information-tiles show-information-tiles-two');
    for(const [key,label] of [['visitors','Bezoekersanalyse'],['artist','Artiestanalyse']]){
      const score=info.scores[key],hue=scoreHue(score),tile=node('div','show-information-tile show-score-tile');
      if(hue===null)tile.dataset.empty='true';else tile.style.setProperty('--score-hue',String(hue));
      tile.append(node('dt','',label),node('dd','',score===null?empty:score+' / 10'));
      scores.append(tile);
    }
    analyses.append(scores);
    const facts=node('dl','show-information-list');
    row(facts,info.soldDays?`Verkochte kaarten (${info.soldDays} dagen)`:'Verkochte kaarten',info.soldTickets==null?null:numbers.format(info.soldTickets));
    row(facts,'Man/vrouw verhouding',info.gender,{long:true});
    row(facts,'Leeftijdsrange',info.ageRange,{long:true});
    // Risico's helemaal onderin.
    const risks=node('section','show-information-section');risks.setAttribute('aria-label','Risico’s volgens de ESM');
    risks.append(node('h3','show-information-subtitle','Risico’s'));
    const tiles=node('dl','show-information-tiles');
    for(const [key,label] of [['low','Laag'],['medium','Midden'],['high','Hoog']]){const tile=node('div','show-information-tile show-risk-'+key);tile.append(node('dt','',label),node('dd','',numbers.format(info.risks[key])));tiles.append(tile);}
    risks.append(tiles);
    body.append(facts,analyses,risks);
  }
  const unsubscribe=data.subscribe(render);render();
  return()=>{disposed=true;unsubscribe();body.remove();};
}
