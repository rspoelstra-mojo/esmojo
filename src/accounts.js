import { access } from './auth.js';

const glyphs = {
  edit: '<path d="m14 4 6 6M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/>',
  remove: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  invite: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
};

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function createAccountsView(container, currentUser) {
  let disposed = false;
  const view = element('section', '', 'accounts-view');
  container.replaceChildren(view);
  const report = (message, error = false) => {
    const notice = element('p', message, error ? 'form-message' : 'account-notice');
    notice.setAttribute('role', 'status'); view.prepend(notice);
  };
  async function load() {
    view.replaceChildren(element('p', 'Accounts laden…', 'account-notice'));
    try {
      const result = await access('accounts');
      if (disposed) return;
      view.replaceChildren();
      const toolbar = element('div', '', 'accounts-toolbar');
      const add = element('button', 'Account aanmaken', 'primary-button');
      add.addEventListener('click', () => edit());
      toolbar.append(element('h1', 'Accounts'), add); view.append(toolbar);
      if (!result.accounts.length) { view.append(element('p', 'Er zijn nog geen accounts.')); return; }
      const table = element('table', '', 'accounts-table');
      const caption = element('caption', 'Alle ESMOJO-accounts'); caption.className = 'visually-hidden'; table.append(caption);
      const head = table.createTHead().insertRow();
      for (const label of ['Voornaam', 'Functie', 'E-mailadres', 'Acties']) { const th = element('th', label); th.scope = 'col'; head.append(th); }
      const body = table.createTBody();
      for (const account of result.accounts) {
        const row = body.insertRow();
        for (const [label, value] of [['Voornaam', account.firstName], ['Functie', account.jobTitle], ['E-mailadres', account.email]]) {
          const td = row.insertCell(); td.dataset.label = label; td.textContent = value;
        }
        const cell = row.insertCell(); cell.dataset.label = 'Acties';
        const actions = element('div', '', 'account-actions');
        actions.append(action('edit', `Bewerk ${account.firstName}`, () => edit(account)));
        const remove = action('remove', `Verwijder ${account.firstName}`, async () => {
          if (!confirm(`Account van ${account.firstName} ${account.lastName} verwijderen? Deze gebruiker kan daarna niet meer inloggen.`)) return;
          await access('accounts', { method: 'DELETE', body: { id: account.id } }); await load();
        });
        remove.disabled = account.id === currentUser.id;
        actions.append(remove);
        if (!account.activated && !account.disabled) actions.append(action('invite', `Nodig ${account.firstName} opnieuw uit`, async () => {
          await access('accounts', { method: 'PATCH', body: { id: account.id, operation: 'invite' } }); report('Uitnodiging opnieuw verzonden.');
        }));
        if (account.disabled) actions.append(element('span', 'Geblokkeerd; verwijder opnieuw om de opruiming te voltooien.', 'account-notice'));
        else if (!account.activated) actions.append(element('span', 'Uitgenodigd', 'account-notice'));
        cell.append(actions);
      }
      view.append(table);
    } catch (error) { if (!disposed) { view.replaceChildren(); report(error.message, true); } }
  }
  function action(glyph, label, callback) {
    const button = element('button', '', 'icon-button'); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label);
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[glyph]}</svg>`;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await callback(); } catch (error) { if (!disposed) report(error.message, true); }
      finally { button.disabled = false; }
    });
    return button;
  }
  function edit(account) {
    view.replaceChildren();
    const toolbar = element('div', '', 'accounts-toolbar'); toolbar.append(element('h1', account ? 'Account bewerken' : 'Account aanmaken')); view.append(toolbar);
    const form = element('form', '', 'account-form');
    for (const [name, title, type] of [['firstName', 'Voornaam', 'text'], ['lastName', 'Achternaam', 'text'], ['jobTitle', 'Functie', 'text'], ['email', 'E-mailadres', 'email']]) {
      const label = element('label', title), input = element('input');
      input.name = name; input.type = type; input.required = true; input.maxLength = name === 'email' ? 254 : 120;
      input.value = account?.[name] || '';
      if (account && name === 'email') input.readOnly = true;
      label.append(input); form.append(label);
    }
    const roleLabel = element('label', 'Rol'), select = element('select'); select.name = 'role';
    for (const [value, title] of [['gebruiker', 'Gebruiker'], ['beheerder', 'Beheerder']]) { const option = element('option', title); option.value = value; select.append(option); }
    select.value = account?.role || 'gebruiker';
    if (account?.id === currentUser.id) select.disabled = true;
    roleLabel.append(select); form.append(roleLabel);
    const photoLabel = element('label', 'Profielfoto (optioneel)'), photo = element('input');
    photo.type = 'file'; photo.accept = 'image/png,image/jpeg,image/webp'; photoLabel.append(photo); form.append(photoLabel);
    const clearLabel = element('label', 'Bestaande profielfoto verwijderen'), clear = element('input'); clear.type = 'checkbox'; clearLabel.append(clear);
    if (account) form.append(clearLabel);
    const message = element('p', '', 'form-message'); message.setAttribute('role', 'alert');
    const buttons = element('div', '', 'form-actions'), save = element('button', account ? 'Opslaan' : 'Account aanmaken', 'primary-button');
    const cancel = element('button', 'Annuleren', 'secondary-button'); cancel.type = 'button'; cancel.addEventListener('click', load);
    buttons.append(save, cancel); form.append(message, buttons); view.append(form);
    form.addEventListener('submit', async event => {
      event.preventDefault(); save.disabled = true; message.textContent = '';
      try {
        const fields = Object.fromEntries(new FormData(form));
        if (account) fields.id = account.id;
        if (select.disabled) fields.role = account.role;
        if (clear.checked) fields.photo = '';
        if (photo.files[0]) fields.photo = await resizePhoto(photo.files[0]);
        const result = await access('accounts', { method: account ? 'PATCH' : 'POST', body: fields });
        if (disposed) return;
        await load();
        if (result.warning) report(result.warning, true);
      } catch (error) { message.textContent = error.message; }
      finally { save.disabled = false; }
    });
  }
  load();
  return () => { disposed = true; view.replaceChildren(); };
}

async function resizePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5000000) throw new Error('Kies een PNG-, JPG- of WebP-foto van maximaal 5 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', .75);
    if (data.length > 100000) throw new Error('Deze foto is te groot. Kies een kleinere foto.');
    return data;
  } finally { bitmap.close(); }
}
