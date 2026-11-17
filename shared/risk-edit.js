// Bewerken van de tekst van een operationeel risico: titel, gedefinieerd risico (omschrijving) en mogelijk gevolg.
export const riskEditLimits=Object.freeze({title:120,description:600,consequence:600});
export function validateRiskEdit(input){
 const keys=['concertId','source','riskId','editRevision','title','description','consequence'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.slice().sort().join(','))throw Error('VALIDATION');
 const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value);
 if(typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)||!/^R[0-9]{2}$/.test(input.riskId||'')||!Number.isSafeInteger(input.editRevision)||input.editRevision<0)throw Error('VALIDATION');
 if(!input.source||Object.keys(input.source).sort().join(',')!=='revision,sha256'||!['revision','sha256'].every(key=>/^[a-f0-9]{64}$/.test(input.source[key]||'')))throw Error('VALIDATION');
 if(!text(input.title,riskEditLimits.title)||!text(input.description,riskEditLimits.description)||!text(input.consequence,riskEditLimits.consequence))throw Error('VALIDATION');
 return{concertId:input.concertId,source:{...input.source},riskId:input.riskId,editRevision:input.editRevision,title:input.title.trim().replace(/\s+/g,' '),description:input.description.trim(),consequence:input.consequence.trim()};
}
