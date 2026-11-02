import { createHash } from 'node:crypto';
import { createShowsStore } from './shows-store.js';
import { riskKeys, riskText, validateRiskReference, validateRiskResult, riskFilename } from '../shared/showprofile-risks.js';
import { riskPrompt } from './showprofile-risk-prompt.js';

export function validateRiskRequest(input) {
  const keys = { pending:['operation','after'], status:['operation','concertId'], pdf:['operation','concertId','source'], read:['operation','concertId','source'], save:['operation','concertId','source','result'], prompt:['operation'] }[input?.operation];
  if (!keys) throw Error('VALIDATION');
  riskKeys(input, keys);
  if (input.operation === 'pending') {
    if (input.after !== undefined) riskText(input.after,240);
  } else if (!['prompt'].includes(input.operation)) {
    riskText(input.concertId,240);
    if (/[\x00-\x1f/\\]/.test(input.concertId)) throw Error('VALIDATION');
    if (['pdf','read','save'].includes(input.operation)) validateRiskReference(input.source);
    if (input.operation === 'save') validateRiskResult(input.result);
  }
  return input;
}
const normalized = value => value.replace(/\s+/g, ' ').trim();
export async function extractRiskPages(bytes) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  let document;
  try { document = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0, isEvalSupported: false }); }
  catch { throw Error('PDF_UNREADABLE'); }
  try {
    if (document.numPages < 1 || document.numPages > 20) throw Error('PDF_UNREADABLE');
    const { text } = await extractText(document, { mergePages: false });
    const pages = text.map((text,index) => ({ page:index+1, text:normalized(text) }));
    if (pages.some(p => !p.text) || pages.reduce((n,p)=>n+p.text.length,0)>80000) throw Error('PDF_UNREADABLE');
    return pages;
  } catch { throw Error('PDF_UNREADABLE'); }
  finally { await document.loadingTask.destroy(); }
}
export function createRiskService({ env=process.env, shows=createShowsStore({env}), extract=extractRiskPages }={}) {
  const pdf = async input => {
    const data = await shows('risk-pdf', { concertId:input.concertId, source:input.source });
    if (data.source?.revision !== input.source.revision || data.source?.sha256 !== input.source.sha256 || !Number.isSafeInteger(data.pdfVersion) || data.pdfVersion < 1
        || typeof data.pdfBase64 !== 'string' || data.pdfBase64.length > 2796204 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.pdfBase64)) throw Error('VERIFY');
    const bytes = Buffer.from(data.pdfBase64,'base64');
    if (bytes.length > 2*1024*1024 || createHash('sha256').update(bytes).digest('hex') !== input.source.sha256) throw Error('VERIFY');
    const pages = await extract(bytes);
    return { concertId:data.concertId, source:data.source, pdfVersion:data.pdfVersion, classification:'vertrouwelijk', pages };
  };
  return async request => {
    const input=validateRiskRequest(request);
    if(input.operation==='prompt') return riskPrompt;
    if(input.operation==='pdf') return pdf(input);
    const { operation, ...payload } = input;
    if(operation!=='save') return shows('risk-'+operation,payload);
    const source = await pdf(input);
    for(const risk of input.result.risks) for(const evidence of risk.evidence) {
      const page = source.pages.find(p=>p.page===evidence.page);
      if(!page || !normalized(page.text).includes(normalized(evidence.quote))) throw Error('EVIDENCE_MISMATCH');
    }
    const saved=await shows('risk-save',payload);
    if(saved.concertId!==source.concertId || saved.filename!==riskFilename(input.source) || typeof saved.created!=='boolean') throw Error('VERIFY');
    const read=await shows('risk-read',{concertId:saved.concertId,source:input.source}),d=read.document;
    if(!d || d.managedBy!=='ESMOJO/ShowProfileRisks-v1' || d.schemaVersion!==1 || d.classification!=='vertrouwelijk' || d.status!=='concept'
       || d.concertId!==saved.concertId || d.source?.revision!==input.source.revision || d.source?.sha256!==input.source.sha256
       || d.pdfVersion!==source.pdfVersion || !Number.isFinite(Date.parse(d.createdAt))
       || JSON.stringify(d.result)!==JSON.stringify(input.result)) throw Error('VERIFY');
    return {...saved,verified:true,status:'concept',classification:'vertrouwelijk'};
  };
}
