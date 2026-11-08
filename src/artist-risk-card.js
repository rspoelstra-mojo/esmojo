import {operationalIconPaths} from './lib/profile-icons.js';
import {displayedRiskParts} from '../shared/artist-risk-score.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const number=new Intl.NumberFormat('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2});
const definitions=[['visitors','Bezoekersanalyse',25],['artist','Artiestanalyse',25],['operational','Operationele risico’s',15],['incidents','Historische incidenten',35]];
export function renderArtistRiskCard(){
 const card=node('section','artist-profile-card artist-score-card'),heading=node('h2','','Risico inschatting artiest'),body=node('div','artist-score-body');const header=node('div','artist-score-heading'),glyph=node('span','artist-audience-icon');glyph.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${operationalIconPaths}</svg>`;header.append(glyph,heading);card.append(header,body);
 function update(score){
  body.replaceChildren();if(!score){body.append(node('p','artist-score-empty','Nog geen risicoscore beschikbaar'));return;}
  const display=displayedRiskParts(score),summary=node('div','artist-score-summary');summary.append(node('strong','artist-score-total',number.format(score.total)+' / 100'),node('span','artist-score-level',score.level));
  const battery=node('div','artist-score-battery');battery.setAttribute('role','img');battery.setAttribute('aria-label',score.level+': '+number.format(score.total)+' van 100 punten');
  const legend=node('dl','artist-score-legend');
  for(const [key,label,maximum]of definitions){
   const segment=node('span','artist-score-segment artist-score-'+key);segment.style.width=score.parts[key]+'%';segment.title=label+': '+number.format(display[key])+' / '+maximum;battery.append(segment);
   const row=node('div',''),term=node('dt',''),swatch=node('span','artist-score-swatch artist-score-'+key);swatch.setAttribute('aria-hidden','true');term.append(swatch,document.createTextNode(label));row.append(term,node('dd','',number.format(display[key])+' / '+maximum));legend.append(row);
  }
  const remaining=node('span','artist-score-remaining');remaining.style.width=Math.max(0,100-score.total)+'%';battery.append(remaining);
  body.append(summary,battery,legend,node('p','artist-score-note','Gebaseerd op '+score.concerts+' volledig beoordeelde concert'+(score.concerts===1?'':'en')+'. Risiconiveau berekend zonder afronding.'));
 }
 update(null);card.update=update;return card;
}
