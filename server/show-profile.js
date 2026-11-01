// Publieke, door de gebruiker geschreven analyses. Geen vrije Drive-paden.
export function validateShowProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input).length > 4000) throw Error('VALIDATION');
  const allowed = input.operation === 'read' ? ['operation', 'concertId', 'questionNumber'] : ['operation', 'concertId', 'questionNumber', 'status', 'summary', 'revision'];
  if (Object.keys(input).some(key => !allowed.includes(key)) || !['read', 'save'].includes(input.operation)
      || typeof input.concertId !== 'string' || !input.concertId || input.concertId.length > 240 || /[\x00-\x1f/\\]/.test(input.concertId)) throw Error('VALIDATION');
  const result = { concertId: input.concertId };
  if (input.operation === 'save' || input.questionNumber !== undefined) {
    if (!Number.isInteger(input.questionNumber) || input.questionNumber < 1 || input.questionNumber > 11) throw Error('VALIDATION');
    result.questionNumber = input.questionNumber;
  }
  if (input.operation === 'save') {
    if (!['draft', 'completed'].includes(input.status) || typeof input.summary !== 'string' || input.summary.length > 400 || /\x00/.test(input.summary)
        || (input.status === 'completed' && !input.summary.trim()) || !Number.isSafeInteger(input.revision) || input.revision < 0) throw Error('VALIDATION');
    Object.assign(result, { status: input.status, summary: input.summary, revision: input.revision });
  }
  return { operation: `profile-${input.operation}`, payload: result };
}
