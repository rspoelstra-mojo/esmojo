export const showTabNames=['overzicht','showprofiel','risicoanalyse','maatregelen','documenten'];
export function requestedShowTab(search){
 if(typeof search!=='string'||!search)return null;
 const params=new URLSearchParams(search);if(params.getAll('tab').length!==1)return null;
 const index=showTabNames.indexOf(params.get('tab'));return index<0?null:index;
}
export function deadlineTab(kind){return{profile:'showprofiel',operational:'risicoanalyse',production:'risicoanalyse',measures:'maatregelen',show:'overzicht'}[kind]||'overzicht';}
