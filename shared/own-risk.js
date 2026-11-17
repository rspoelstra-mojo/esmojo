import {validateOperationalReview} from './operational-risk.js';
// Eigen operationeel risico van de ESM: gedefinieerd risico, mogelijk gevolg en meteen de beoordeling (met beheersmaatregel bij Midden/Hoog).
// De requestId maakt een herhaalde opdracht na een verloren bevestiging idempotent.
export const ownRiskLimits=Object.freeze({title:120,description:600,consequence:600});
export function validateOwnRisk(input){
 const keys=['concertId','source','requestId','title','description','consequence','riskLevel','riskNote'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.slice().sort().join(','))throw Error('VALIDATION');
 const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value);
 if(!/^[a-f0-9-]{36}$/.test(input.requestId||'')||!text(input.title,ownRiskLimits.title)||!text(input.description,ownRiskLimits.description)||!text(input.consequence,ownRiskLimits.consequence))throw Error('VALIDATION');
 const review=validateOperationalReview({concertId:input.concertId,source:input.source,riskId:'R31',revision:0,riskLevel:input.riskLevel,riskNote:input.riskNote});
 return{concertId:input.concertId,source:review.source,requestId:input.requestId,title:input.title.trim().replace(/\s+/g,' '),description:input.description.trim(),consequence:input.consequence.trim(),riskLevel:review.riskLevel,riskNote:review.riskNote};
}
