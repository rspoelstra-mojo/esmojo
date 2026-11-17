export const showTabNames=['overzicht','showprofiel','risicoanalyse','maatregelen','documenten'];
export function requestedShowTab(search){
 if(typeof search!=='string'||!search)return null;
 const params=new URLSearchParams(search);if(params.getAll('tab').length!==1)return null;
 const index=showTabNames.indexOf(params.get('tab'));return index<0?null:index;
}
export function deadlineTab(kind){return{profile:'showprofiel',operational:'risicoanalyse',production:'risicoanalyse',measures:'maatregelen',show:'overzicht'}[kind]||'overzicht';}

// Diepe links vanuit de actielijst: ?tab=<tabblad> plus één bestemming binnen dat tabblad.
// analysis (1-11) | tickets=1 | finalize=visitors|artist (Showprofiel); risk=R01 | production=<id> (Risicoanalyse);
// measure=<id> (Maatregelen); send=1 (Overzicht). Meer dan één bestemming of een ongeldige waarde: alleen het tabblad.
export function requestedShowTarget(search){
 const index=requestedShowTab(search);if(index===null)return null;
 const params=new URLSearchParams(search),tab=showTabNames[index],target={tab},found=[];
 const one=name=>{const values=params.getAll(name);return values.length===1?values[0]:null;};
 const analysis=one('analysis');if(tab==='showprofiel'&&analysis!==null&&/^(?:[1-9]|10|11)$/.test(analysis))found.push({analysis:Number(analysis)});
 if(tab==='showprofiel'&&one('tickets')==='1')found.push({tickets:true});
 const finalize=one('finalize');if(tab==='showprofiel'&&['visitors','artist'].includes(finalize))found.push({finalize});
 const risk=one('risk');if(tab==='risicoanalyse'&&risk!==null&&/^R\d{2}$/.test(risk))found.push({risk});
 const production=one('production');if(tab==='risicoanalyse'&&production!==null&&/^[a-z_]{2,40}$/.test(production))found.push({production});
 const measure=one('measure');if(tab==='maatregelen'&&measure!==null&&/^[a-z]{3,20}(?::[A-Za-z0-9_]{1,80}){1,2}$/.test(measure))found.push({measure});
 if(tab==='overzicht'&&one('send')==='1')found.push({send:true});
 // Een tweede, afwijkende bestemming maakt de link dubbelzinnig: dan alleen het tabblad.
 return found.length===1?{...target,...found[0]}:target;
}
export function showTargetHref(showKey,target){
 const params=new URLSearchParams({tab:target.tab});
 if(target.analysis)params.set('analysis',String(target.analysis));if(target.tickets)params.set('tickets','1');if(target.finalize)params.set('finalize',target.finalize);
 if(target.risk)params.set('risk',target.risk);if(target.production)params.set('production',target.production);if(target.measure)params.set('measure',target.measure);if(target.send)params.set('send','1');
 return '/shows/'+encodeURIComponent(showKey)+'?'+params.toString();
}
