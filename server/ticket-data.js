import { ticketFields } from '../shared/ticket-data.js';
export function validateTicketRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input).length > 10000) throw Error('VALIDATION');
  const allowed = ['operation', 'concertId', 'field', 'token', 'expectedVersion', 'content'];
  if (Object.keys(input).some(key => !allowed.includes(key)) || !['read','reserve','renew','release','review','reopen'].includes(input.operation)
      || typeof input.concertId !== 'string' || !input.concertId || input.concertId.length > 240 || /[\x00-\x1f/\\]/.test(input.concertId)) throw Error('VALIDATION');
  if (input.operation === 'read') { if (Object.keys(input).some(key => !['operation','concertId'].includes(key))) throw Error('VALIDATION'); }
  else if (!ticketFields.includes(input.field) || !/^[a-f0-9-]{36}$/.test(input.token || '') || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0
    || (input.operation === 'review' ? typeof input.content !== 'string' || input.content.length > 3200 : input.content !== undefined)) throw Error('VALIDATION');
  return { operation: 'ticket-' + input.operation, payload: Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'operation')) };
}
