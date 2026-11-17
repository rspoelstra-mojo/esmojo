import './show-team.css';
import {placeholderTeam} from './lib/show-team.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
// Beknopt teamblok in dezelfde vormgeving als het tijdschema: functie links, naam rechts.
export function createShowTeam(block,{members=placeholderTeam(),updated='Bijgewerkt op 17 nov om 12:51'}={}){
  const body=node('div','show-team-body'),list=node('dl','show-team-list');
  for(const member of members){const row=node('div','show-team-row');row.append(node('dt','',member.role),node('dd','',member.name));list.append(row);}
  // Voorlopig een vaste placeholderregel (nog niet gekoppeld aan een werkelijke wijzigingsdatum); wordt later gebruikt.
  body.append(list,node('p','show-team-updated',updated));block.append(body);
  return{body,dispose(){body.remove();}};
}
