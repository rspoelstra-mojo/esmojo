import {backgroundSaves} from './background-saves.js';
import {productionRiskFields, validateProductionRiskState} from '../../shared/production-risks.js';

// Alleen tijdelijk showgeheugen. Eén write tegelijk, met de laatst bevestigde revisie.
const unsaved = new Set();
export function createProductionChoiceQueue({save, read}) {
  let server = null, alive = true, failed = false, task = null;
  const jobs = [], listeners = new Set();
  const emit = () => { backgroundSaves.changed(); if (alive) for (const callback of listeners) { try { callback(); } catch { /* Opslag blijft doorlopen bij een weergavefout. */ } } };
  const unwatch=backgroundSaves.watch(()=>alive&&(Boolean(task)||jobs.length>0));
  const queue = {
    get server() { return server; },
    get failed() { return failed; },
    get busy() { return task !== null; },
    pending(field) { return jobs.some(job => job.field === field); },
    value(field) { return jobs.findLast(job => job.field === field)?.value ?? server?.choices[field]; },
    sync(data) {
      validateProductionRiskState(data);
      if (!alive) return;
      if (!server || data.revision >= server.revision) server = structuredClone(data);
      emit();
    },
    enqueue(field, value) {
      if (!alive || !server || !productionRiskFields.includes(field) || typeof value !== 'boolean' || queue.value(field) === value) return;
      jobs.push({field, value}); unsaved.add(queue); emit(); pump();
    },
    retry() { if (alive && failed && !task) { failed = false; pump(true); } return queue.whenSettled(); },
    async whenSettled() { while (task) await task; },
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); },
    cancel() { alive = false; unwatch(); jobs.length = 0; server = null; listeners.clear(); unsaved.delete(queue); },
  };
  function pump(refresh = false) {
    if (!alive || task || failed || !jobs.length) return;
    // Start in een microtask zodat task ook bij synchrone fouten geldig blijft.
    task = Promise.resolve().then(async () => {
      try {
        if (refresh) { const data = await read(); if (!alive) return; queue.sync(data); }
        while (alive && jobs.length) {
          const job = jobs[0];
          // Een verloren antwoord kan al verwerkt zijn; na herlezen geen dubbele write.
          if (server.choices[job.field] !== job.value) {
            const data = await save({...job, revision: server.revision});
            if (!alive) return;
            validateProductionRiskState(data);
            if (data.revision < server.revision || data.choices[job.field] !== job.value) throw Error('UNVERIFIED');
            server = structuredClone(data);
          }
          jobs.shift(); emit();
        }
      } catch { if (alive) failed = true; }
      finally { task = null; if (!jobs.length) unsaved.delete(queue); emit(); }
    });
  }
  return queue;
}
