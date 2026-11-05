// Vertrouwelijke ESM-beoordeling; brongebonden, geen AI-tekst overschrijven.
export const operationalRiskLabels={none:'Geen risico',low:'Laag',medium:'Midden',high:'Hoog'};
export function validateOperationalReview(input){
 const keys=['concertId','source','riskId','revision','riskLevel','riskNote'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.sort().join(','))throw Error('VALIDATION');
 if(typeof input.concertId!=='string'||!input.concertId.trim()||input.concertId.length>240||/[\x00-\x1f/\\]/.test(input.concertId)||!/^R[0-9]{2}$/.test(input.riskId||'')||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('VALIDATION');
 if(!input.source||Object.keys(input.source).sort().join(',')!=='revision,sha256'||!['revision','sha256'].every(key=>/^[a-f0-9]{64}$/.test(input.source[key]||'')))throw Error('VALIDATION');
 if(!Object.hasOwn(operationalRiskLabels,input.riskLevel)||typeof input.riskNote!=='string'||input.riskNote.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(input.riskNote)||input.riskLevel!=='low'&&!input.riskNote.trim())throw Error('VALIDATION');
 return {...input,source:{...input.source},riskNote:input.riskLevel==='low'?'':input.riskNote.trim()};
}
