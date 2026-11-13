import {executeShowRules} from './rules.js';
import {productionComplete,operationalComplete,showMeasures} from '../../src/lib/show-planning.js';
export function showPlanning(source){
 try{const bundle=executeShowRules(source,'show-open',{concertId:source.concertId,actor:'native-planning'}).result,snapshot={risks:bundle.risks};return{key:source.concertId,updatedAt:new Date().toISOString(),completion:{profile:bundle.pdf?.state==='ready',production:productionComplete(source.shows[0],snapshot),operational:operationalComplete(snapshot),measures:showMeasures(source.shows[0],snapshot).complete}};}catch{return{key:source.concertId,updatedAt:new Date().toISOString(),planningUnavailable:true};}
}
