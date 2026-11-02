// Gegenereerd uit shared/showprofile-risks.js: alleen export-keywords verwijderd.
// Gedeeld met Apps Script. Alleen structuur; inhoudelijke kwaliteit blijft AI/ESM-beoordeling.
const RISK_PROMPT_VERSION = 1;
function riskKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw Error('VALIDATION');
}
function riskText(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw Error('VALIDATION');
  return value;
}
function validateRiskReference(value) {
  riskKeys(value, ['revision', 'sha256']);
  for (const key of ['revision', 'sha256']) if (!/^[a-f0-9]{64}$/.test(value[key] || '')) throw Error('VALIDATION');
  return { revision: value.revision, sha256: value.sha256 };
}
function validateRiskResult(value) {
  riskKeys(value, ['promptVersion', 'analysedAt', 'risks', 'limitations']);
  if (JSON.stringify(value).length > 32000 || value.promptVersion !== RISK_PROMPT_VERSION
      || typeof value.analysedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value.analysedAt)
      || !Number.isFinite(Date.parse(value.analysedAt)) || new Date(value.analysedAt).toISOString().replace('.000Z','Z') !== value.analysedAt.replace('.000Z','Z')
      || !Array.isArray(value.risks) || value.risks.length > 30 || !Array.isArray(value.limitations) || value.limitations.length > 10
      || (!value.risks.length && !value.limitations.length)) throw Error('VALIDATION');
  const titles = new Set();
  value.risks.forEach((risk, index) => {
    riskKeys(risk, ['id', 'title', 'description', 'consequence', 'basis', 'evidence']);
    if (risk.id !== 'R' + String(index + 1).padStart(2,'0') || !['explicit','inferred'].includes(risk.basis)
        || !Array.isArray(risk.evidence) || !risk.evidence.length || risk.evidence.length > 3) throw Error('VALIDATION');
    const title = riskText(risk.title, 120).trim().toLowerCase();
    if (titles.has(title)) throw Error('VALIDATION');
    titles.add(title); riskText(risk.description, 800); riskText(risk.consequence, 600);
    for (const evidence of risk.evidence) {
      riskKeys(evidence, ['page', 'quote']);
      if (!Number.isInteger(evidence.page) || evidence.page < 1 || evidence.page > 20) throw Error('VALIDATION');
      riskText(evidence.quote, 400);
    }
  });
  value.limitations.forEach(text => riskText(text, 300));
  return value;
}
function riskFilename(reference) {
  validateRiskReference(reference);
  return 'showprofiel_risicos_v1_' + reference.revision + '.json';
}
