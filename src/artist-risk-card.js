import {operationalIconPaths} from './lib/profile-icons.js';
import {displayedRiskParts,displayedRiskTotal} from '../shared/artist-risk-score.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const number=new Intl.NumberFormat('nl-NL',{maximumFractionDigits:0});
const definitions=[['visitors','Bezoekersanalyse',25],['artist','Artiestanalyse',25],['operational','Operationele risico’s',15],['incidents','Historische incidenten',35]];
export function renderArtistRiskCard(){
 const card=node('section','artist-profile-card artist-score-card'),heading=node('h2','','Risico inschatting artiest'),body=node('div','artist-score-body');const header=node('div','artist-score-heading'),glyph=node('span','artist-audience-icon');glyph.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${operationalIconPaths}</svg>`;const badge=node('span','artist-score-status');badge.hidden=true;header.append(glyph,heading,badge);card.append(header,body);
 function update(score,assessment=null){
  body.replaceChildren();
  if(!score)body.append(node('p','artist-score-empty','Nog geen risicoscore beschikbaar'));
  const incomplete=score?.status==='incomplete',status=incomplete?'Onvolledige risicoscore':score?'Volledige risicoscore':'';
  card.dataset.scoreStatus=score?score.status||'complete':assessment?.reliability==='unreliable'?'unreliable':'unavailable';
  badge.hidden=!score;badge.textContent=status;badge.className='artist-score-status '+(incomplete?'artist-score-status-incomplete':'artist-score-status-complete');
  if(!score&&assessment?.reliability==='unreliable')body.append(node('p','artist-score-note','Historische vergelijking niet betrouwbaar: een noodzakelijke referentiewaarde ontbreekt of is nul bij positieve incidenten.'));
  const display=score?displayedRiskParts(score):null,total=score?displayedRiskTotal(score):null,summary=node('div','artist-score-summary');summary.append(node('strong','artist-score-total',(score?number.format(total):'—')+' / 100'),node('span','artist-score-level',score?.level||''));
  const battery=node('div','artist-score-battery');battery.setAttribute('role','img');battery.setAttribute('aria-label',score?(incomplete?status:score.level)+': '+number.format(total)+' van 100 punten':'Lege batterij: nog geen risicoscore beschikbaar');
  const legend=node('dl','artist-score-legend');
  for(const [key,label,maximum]of definitions){
   const available=score&&Number.isFinite(score.parts[key]);
   if(available){const segment=node('span','artist-score-segment artist-score-'+key);segment.style.width=display[key]+'%';segment.title=label+': '+number.format(display[key])+' / '+maximum;battery.append(segment);}
   const row=node('div',''),term=node('dt',''),swatch=node('span','artist-score-swatch artist-score-'+key);swatch.setAttribute('aria-hidden','true');term.append(swatch,document.createTextNode(label));row.append(term,node('dd','',(available?number.format(display[key]):'—')+' / '+maximum));legend.append(row);
  }
  const remaining=node('span','artist-score-remaining');remaining.style.width=Math.max(0,100-(total||0))+'%';battery.append(remaining);
  body.append(summary,battery,legend);if(score)body.append(node('p','artist-score-note',(incomplete?'Alleen historische incidenten, maximaal 35 van 100 punten beschikbaar. ':'')+status+'. Gebaseerd op '+score.concerts+(incomplete?' concert':' volledig beoordeelde concert')+(score.concerts===1?'':'en')+'. Historische incidenten: maximaal 25 punten beveiliging en 10 punten medisch.'+(incomplete?' Overige onderdelen nog niet volledig beoordeeld.':' Risiconiveau berekend zonder afronding.')));
 }
 update(null);card.update=update;return card;
}
