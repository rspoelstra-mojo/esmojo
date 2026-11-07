import {accountCompanies,companyJobs,validateAccountEmployment} from '../shared/account-employment.js';
import {singleSubmission} from './lib/single-submission.js';
import {detailBackButton} from './detail-back.js';
import {createPageFeedback} from './lib/page-feedback.js';
import {backgroundSaves,saveRequestInfo} from './lib/background-saves.js';
import {accountModules,hasModule,isSuperAdministrator} from '../shared/account-modules.js';
import { access } from './auth.js';
import { cropPhoto } from './photo-crop.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';

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

export function createAccountsView(container, currentUser, submenuLink,{onSaved=()=>{}}={}) {
  let disposed = false,accountsCache=null,mode='list',viewRevision=0;
  const feedbacks=new Map();const feedback=info=>{if(!feedbacks.has(info.key))feedbacks.set(info.key,createPageFeedback(info));return feedbacks.get(info.key);};
  const general=feedback({key:'accounts-feedback',label:'Accountactie',route:'/beheerder/accounts'});
  const loading = createSubmenuLoading(submenuLink, container);
  const controller = new AbortController();
  const view = element('section', '', 'accounts-view');
  container.replaceChildren(view);
  const report=(message,error=false)=>{const failed=error?backgroundSaves.failures.findLast(item=>item.route==='/beheerder/accounts'):null;const target=failed?feedback(failed):general;target.show(error?'De accountactie kon niet worden bevestigd. Je invoer is behouden.':message,error?()=>load():null,'Actuele gegevens laden');};
  async function load() {
    mode='list';const opened=++viewRevision;const finishLoading = loading.start();
    if(accountsCache)renderAccounts(accountsCache);else view.replaceChildren();
    try {
      const result = await access('accounts');
      if (disposed) return;
      accountsCache=result.accounts;if(mode==='list'&&opened===viewRevision)renderAccounts(accountsCache);
    } catch (error) { if (!disposed&&mode==='list'&&opened===viewRevision) { report(error.message,true); } }
    finally { finishLoading(); }
  }
  function renderAccounts(accounts){
    if(disposed)return;mode='list';
      view.replaceChildren();
      const toolbar = element('div', '', 'accounts-toolbar');
      const add = element('button', 'Account aanmaken', 'primary-button');
      add.disabled=Boolean(backgroundSaves.form('account:new').busy);add.addEventListener('click', () => edit());
      toolbar.append(element('h1', 'Accounts'), add); view.append(toolbar);
      if (!accounts.length) { view.append(element('p', 'Er zijn nog geen accounts.')); return; }
      const table = element('table', '', 'accounts-table');
      const caption = element('caption', 'Alle ESMOJO-accounts'); caption.className = 'visually-hidden'; table.append(caption);
      const head = table.createTHead().insertRow();
      for (const label of ['Voornaam', 'Functie', 'E-mailadres', 'Acties']) { const th = element('th', label); th.scope = 'col'; head.append(th); }
      const body = table.createTBody();
      for (const account of accounts) {
        const row = body.insertRow();
        for (const [label, value] of [['Voornaam', account.firstName], ['Functie', account.jobTitle], ['E-mailadres', account.email]]) {
          const td = row.insertCell(); td.dataset.label = label; td.textContent = value;
        }
        const cell = row.insertCell(); cell.dataset.label = 'Acties';
        const actions = element('div', '', 'account-actions');
        const editButton=action('edit', `Bewerk ${account.firstName}`, () => edit(account));editButton.disabled=Boolean(backgroundSaves.form('account:'+account.id).busy);actions.append(editButton);
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
    for(const account of [null,...accounts]){const draft=backgroundSaves.form('account:'+(account?.id||'new'));if(draft.error)feedback(saveRequestInfo('accounts',{id:account?.id})).show('Account opslaan is niet bevestigd. Je invoer is behouden.',()=>{if(disposed)return false;edit(account);return false;},'Invoer bekijken');}
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
    mode='edit';viewRevision++;const draft=backgroundSaves.form('account:'+(account?.id||'new'));const initial={...account,...draft.fields};
    view.replaceChildren();
    const toolbar = element('div', '', 'accounts-toolbar account-editor-heading analysis-editor-header'),back=detailBackButton(element('button','','profile-back'));back.addEventListener('click',load);toolbar.append(back,element('h1', account ? 'Account bewerken' : 'Account aanmaken'));view.append(toolbar);
    const form = element('form', '', 'account-form account-editor');form.method='post';form.autocomplete='off';
    const main=element('div','','account-editor-main'),aside=element('div','','account-editor-aside');
    const card=title=>{const section=element('section','','account-editor-card');section.append(element('h2',title));return section;};
    const identity=card('Accountgegevens'),organisation=card('Organisatie'),permissions=card('Toegang'),portrait=card('Profielfoto');
    const identityFields=element('div','','account-editor-fields');identity.append(identityFields);main.append(identity,organisation);aside.append(permissions,portrait);form.append(main,aside);
    for (const [name, title, type] of [['firstName', 'Voornaam', 'text'], ['lastName', 'Achternaam', 'text'], ['email', 'E-mailadres', 'email']]) {
      const label = element('label', title), input = element('input');
      input.name = name; input.type = type; input.required = true; input.maxLength = name === 'email' ? 254 : 120;
      input.value = initial[name] || '';
      if (account && name === 'email') input.readOnly = true;
      label.append(input);label.classList.add('account-editor-field-'+name);identityFields.append(label);
    }
    const companyLabel=element('label','Bedrijf'),company=element('select');company.name='company';company.required=true;
    const companyPlaceholder=element('option','Kies een bedrijf');companyPlaceholder.value='';company.append(companyPlaceholder);
    for(const definition of accountCompanies){const option=element('option',definition.name);option.value=definition.name;company.append(option);}
    company.value=initial.company||'';companyLabel.append(company);
    const jobLabel=element('label','Functie'),job=element('select');job.name='jobTitle';job.required=true;jobLabel.append(job);
    const legacyJob=element('p','','account-notice');legacyJob.hidden=true;organisation.append(companyLabel,jobLabel,legacyJob);
    const roleLabel = element('label', 'Rol'), select = element('select'); select.name = 'role';
    for (const [value, title] of [['gebruiker', 'Gebruiker'], ['beheerder', 'Beheerder']]) { const option = element('option', title); option.value = value; select.append(option); }
    select.value = isSuperAdministrator(account)?'beheerder':initial.role || 'gebruiker';
    if (account?.id === currentUser.id) select.disabled = true;
    if(isSuperAdministrator(account)){const fixedRole=element('input');fixedRole.type='text';fixedRole.readOnly=true;fixedRole.value='Super beheerder';roleLabel.append(fixedRole);}else roleLabel.append(select);
    permissions.append(roleLabel);
    const roleHint=element('p','','account-notice');permissions.append(roleHint);
    function updateEmployment(first=false){
      const jobs=companyJobs(company.value);job.replaceChildren();const placeholder=element('option',company.value?'Kies een functie':'Kies eerst een bedrijf');placeholder.value='';job.append(placeholder);
      for(const title of jobs){const option=element('option',title);option.value=title;job.append(option);}
      job.disabled=!company.value;job.value=first&&jobs.includes(initial.jobTitle)?initial.jobTitle:'';
      const ownRole=account?.id===currentUser.id,external=company.value!=='MOJO Concerts';
      select.querySelector('option[value="beheerder"]').disabled=external;
      if(external)select.value='gebruiker';else if(ownRole||isSuperAdministrator(account))select.value=isSuperAdministrator(account)?'beheerder':account.role;else if(first)select.value=isSuperAdministrator(account)?'beheerder':initial.role||'gebruiker';
      select.disabled=ownRole||external||isSuperAdministrator(account);
      company.setCustomValidity(ownRole&&account.role!=='gebruiker'&&company.value&&external?'Je kunt je eigen beheerderaccount niet naar een ander bedrijf wijzigen.':'');
      roleHint.textContent=isSuperAdministrator(account)?'De vaste superbeheerderrol blijft behouden.':external?'Alleen medewerkers van MOJO Concerts kunnen Beheerder zijn.':'Standaard Gebruiker. Kies handmatig Beheerder als dat nodig is.';
      legacyJob.hidden=!(first&&account?.jobTitle&&!jobs.includes(account.jobTitle));if(!legacyJob.hidden)legacyJob.textContent='Huidige functie: '+account.jobTitle+'. Kies de passende functie uit de lijst.';
    }
    company.addEventListener('change',()=>updateEmployment());job.addEventListener('change',()=>{legacyJob.hidden=true;});updateEmployment(true);

    const modules=element('fieldset','','account-modules'),legend=element('legend','Modules');modules.append(legend);
    const moduleInputs=accountModules.map(module=>{
      const label=element('label',module.label),input=element('input');input.type='checkbox';input.checked=draft.fields?.modules?draft.fields.modules.includes(module.id):account?hasModule(account,module.id):true;input.disabled=isSuperAdministrator(account);input.value=module.id;input.dataset.module=module.id;label.prepend(input);modules.append(label);return input;
    });permissions.append(modules);
    if(isSuperAdministrator(account))permissions.append(element('p','Super beheerder heeft altijd toegang tot alle huidige en toekomstige modules.','account-notice'));
    const photoLabel = element('label', 'Profielfoto (optioneel)'), photo = element('input');
    photo.type = 'file'; photo.accept = 'image/png,image/jpeg,image/webp'; photoLabel.append(photo); portrait.append(photoLabel);
    const clearLabel = element('label', 'Bestaande profielfoto verwijderen'), clear = element('input'); clear.type = 'checkbox'; clearLabel.classList.add('account-editor-check');clearLabel.append(clear);
    if (account) portrait.append(clearLabel);
    const message = element('p', '', 'form-message'); message.setAttribute('role', 'alert');
    const buttons = element('div', '', 'form-actions'), save = element('button', account ? 'Opslaan' : 'Account aanmaken', 'primary-button');
    save.disabled=Boolean(draft.busy)||isSuperAdministrator(account)&&!isSuperAdministrator(currentUser);
    const cancel = element('button', 'Annuleren', 'secondary-button'); cancel.type = 'button'; cancel.addEventListener('click', load);
    buttons.append(save, cancel); form.append(message, buttons); view.append(form);
    const submitOnce=singleSubmission(async()=>{
      if(draft.busy||isSuperAdministrator(account)&&!isSuperAdministrator(currentUser)||!form.reportValidity())return;
      save.disabled = true; message.textContent = '';
      try {
        const fields = Object.fromEntries(new FormData(form));
        fields.modules=moduleInputs.filter(input=>input.checked).map(input=>input.value);
        if (account) fields.id = account.id;
        if(isSuperAdministrator(account))delete fields.role;
        else if (select.disabled) fields.role = account?.id===currentUser.id?account.role:'gebruiker';
        validateAccountEmployment({...fields,role:isSuperAdministrator(account)?'superbeheerder':fields.role});
        if(draft.fields?.photo!==undefined)fields.photo=draft.fields.photo;
        if (clear.checked) fields.photo = '';
        if (photo.files[0]) {
          const cropped = await cropPhoto(photo.files[0], { signal: controller.signal });
          if (!cropped || disposed) return;
          fields.photo = cropped;
        }
        draft.fields=structuredClone(fields);draft.busy=true;draft.error='';
        const task=access('accounts',{method:account?'PATCH':'POST',body:fields});
        renderAccounts(accountsCache||[]);
        void task.then(result=>{draft.fields=null;draft.error='';if(account?.id===currentUser.id&&!disposed)onSaved();draft.warning=result.warning;},error=>{draft.error=error.message||'Opslaan is niet bevestigd.';}).finally(()=>{draft.busy=false;backgroundSaves.changed();if(!disposed&&mode==='list'){renderAccounts(accountsCache||[]);if(!draft.error)void load().then(()=>{if(!disposed&&mode==='list'&&draft.warning)report(draft.warning,true);});}});

      } catch { report('De accountactie is niet bevestigd.',true); }
      finally { save.disabled = Boolean(draft.busy)||isSuperAdministrator(account)&&!isSuperAdministrator(currentUser); }
    },()=>form.isConnected);
    form.addEventListener('submit',event=>{event.preventDefault();void submitOnce();});
  }
  const offActivity=backgroundSaves.subscribe(()=>{if(!disposed&&mode==='list'&&accountsCache)renderAccounts(accountsCache);});
  load();
  return () => { disposed = true;for(const item of feedbacks.values())item.dispose();offActivity(); loading.dispose(); controller.abort(); view.replaceChildren(); };
}
