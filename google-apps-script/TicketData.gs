// Vertrouwelijk: uitsluitend in de bestaande canonieke concert/reeksmap in Drive.
function esmojoReadTicketData_(file, concertId) {
  if (!file) return { managedBy: 'ESMOJO/TicketData-v1', classification: 'vertrouwelijk', concertId, workflow_json: JSON.stringify({ visitors: { fields: {} } }), leases: {}, history: [] };
  const data = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (data.managedBy !== 'ESMOJO/TicketData-v1' || data.classification !== 'vertrouwelijk' || data.concertId !== concertId
      || typeof data.workflow_json !== 'string' || !data.leases || !Array.isArray(data.history)) throw Error('TICKET_CONFLICT');
  const workflow = JSON.parse(data.workflow_json);
  if (!workflow.visitors || !workflow.visitors.fields || Array.isArray(workflow.visitors.fields)) throw Error('TICKET_CONFLICT');
  for (const field of Object.keys(workflow.visitors.fields)) {
    const row = workflow.visitors.fields[field];
    if (!ticketFields.includes(field) || !row || typeof row.content !== 'string' || row.content.length > 3200
        || !Number.isSafeInteger(row.version) || row.version < 1 || (row.completed_at !== null && !Number.isFinite(Date.parse(row.completed_at)))) throw Error('TICKET_CONFLICT');
  }
  return data;
}
function esmojoTicketData_(request) {
  const op = request.operation.slice(7), allowed = ['operation','concertId','actor','field','token','expectedVersion','content'];
  if (Object.keys(request).some(key => !allowed.includes(key)) || !['read','reserve','renew','release','review','reopen'].includes(op)
      || typeof request.actor !== 'string' || !request.actor || request.actor.length > 100) throw Error('VALIDATION');
  if (op !== 'read' && (!ticketFields.includes(request.field) || !/^[a-f0-9-]{36}$/.test(request.token || '') || !Number.isSafeInteger(request.expectedVersion) || request.expectedVersion < 0)) throw Error('VALIDATION');
  const target = esmojoResearchTarget_(request.concertId), file = esmojoShowFile_(target.folder, 'bezoekersdata.json');
  const data = esmojoReadTicketData_(file, target.primary.concertId), workflow = JSON.parse(data.workflow_json), visitors = workflow.visitors;
  const shows = saleShows({ shows: target.seriesShows });
  const result = () => ({ workflow, shows });
  if (op === 'read') return result();
  const field = request.field, stored = visitors.fields[field], version = stored?.version || 0, now = Date.now(), lease = data.leases[field];
  const owned = lease && lease.actor === request.actor && lease.token === request.token;
  const live = owned && lease.expiresAt > now;
  const write = () => {
    data.workflow_json = JSON.stringify(workflow);
    const body = JSON.stringify(data);
    const saved = file ? (file.setContent(body), file) : target.folder.createFile(Utilities.newBlob(body, 'application/json', 'bezoekersdata.json'));
    if (saved.getBlob().getDataAsString('UTF-8') !== body) throw Error('UNAVAILABLE');
  };
  if (op === 'release') { if (owned) { delete data.leases[field]; write(); } return result(); }
  if (op === 'reserve' || op === 'renew') {
    if ((lease && lease.expiresAt > now && !owned) || request.expectedVersion !== version || (op === 'renew' && !live)) throw Error('TICKET_CONFLICT');
    data.leases[field] = { actor: request.actor, token: request.token, expiresAt: now + 120000 };
    write(); return Object.assign(result(), { lease: { expiresAt: data.leases[field].expiresAt } });
  }
  if (!live || request.expectedVersion !== version) throw Error('TICKET_CONFLICT');
  if (op === 'review') {
    if (stored?.completed_at || visitors.completed_at || !validTicketContent(field, request.content, shows)) throw Error('VALIDATION');
    const content = field === 'ticket_sales' ? normalizedTicketSales(request.content, shows) : request.content;
    visitors.fields[field] = { content, completed_at: new Date(now).toISOString(), version: version + 1 };
  } else {
    if (!stored?.completed_at) throw Error('VALIDATION');
    if (field !== 'ticket_sales' && visitors.completed_at) throw Error('TICKET_CONFLICT');
    visitors.fields[field] = Object.assign({}, stored || { content: '' }, { completed_at: null, version: version + 1 });
    visitors.completed_at = null; delete visitors.score; delete workflow.completed_at;
  }
  data.history.push({ at: new Date(now).toISOString(), actor: request.actor, field, action: op === 'review' ? 'review' : 'review_reopen', before: stored || null, after: visitors.fields[field] });
  delete data.leases[field]; write(); return result();
}
function esmojoMoveTicketData_(from, to, oldId, newId) {
  const source = esmojoShowFile_(from, 'bezoekersdata.json'), destination = esmojoShowFile_(to, 'bezoekersdata.json');
  if (source && destination) throw Error('TICKET_CONFLICT');
  const file = source || destination; if (!file) return;
  const currentId = JSON.parse(file.getBlob().getDataAsString('UTF-8')).concertId;
  if (![oldId,newId].includes(currentId)) throw Error('TICKET_CONFLICT');
  const data = esmojoReadTicketData_(file,currentId);data.concertId=newId;data.leases={};file.setContent(JSON.stringify(data));if(source)file.moveTo(to);
}
