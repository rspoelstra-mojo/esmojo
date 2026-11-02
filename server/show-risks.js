// Alleen-lezen websiteweergave. De server kiest de actuele definitieve bron.
export function validateRiskViewRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1
      || typeof input.concertId !== 'string' || !input.concertId.trim() || input.concertId.length > 240
      || /[\x00-\x1f/\\]/.test(input.concertId)) throw Error('VALIDATION');
  return { concertId: input.concertId };
}
