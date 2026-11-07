const ESMOJO_SUPER_ADMIN_EMAIL='redacted@example.invalid';
// De gebruiker heeft alle huidige accounts expliciet bij MOJO ondergebracht.
function esmojoMigrateAccountCompanies_(state){
 if(state.companyMigrationV1)return false;
 const missing=state.profiles.filter(profile=>profile.company===undefined);
 if(!missing.length)return false;
 missing.forEach(profile=>{profile.company='MOJO Concerts';});state.companyMigrationV1=true;return true;
}
// Alleen ondertekend serververkeer. Profielen blijven binnen de vaste Drive-map.
function esmojoAccounts_(input) {
  const secret = PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
  if (!secret || secret.length < 32 || typeof input.body !== 'string' || input.body.length > 110000
      || !Number.isSafeInteger(input.timestamp) || Math.abs(Date.now() - input.timestamp) > 120000
      || !/^[a-f0-9]{32}$/.test(input.nonce || '') || !/^[a-f0-9]{64}$/.test(input.signature || '')) {
    return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  }
  const hex = bytes => bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  const digest = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input.body, Utilities.Charset.UTF_8));
  const expected = hex(Utilities.computeHmacSha256Signature('accounts\n' + input.timestamp + '\n' + input.nonce + '\n' + digest, secret, Utilities.Charset.UTF_8));
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ input.signature.charCodeAt(i);
  if (difference) return esmojoReply_({ ok: false, code: 'FORBIDDEN' });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return esmojoReply_({ ok: false, code: 'BUSY' });
  let stage = 'REQUEST';
  try {
    const request = JSON.parse(input.body);
    stage = 'DRIVE_FOLDER';
    const folder = DriveApp.getFolderById(ESMOJO_FOLDER_ID);
    if (folder.isTrashed()) throw new Error();
    stage = 'DRIVE_READ';
    const files = folder.getFilesByName('_esmojo_accounts_v1.json');
    const file = files.hasNext() ? files.next() : null;
    if (files.hasNext()) return esmojoReply_({ ok: false, code: 'REGISTER_DUPLICATE' });
    stage = 'REGISTER_INVALID';
    const state = file ? JSON.parse(file.getBlob().getDataAsString('UTF-8')) : { profiles: [], nonces: {} };
    if (!Array.isArray(state.profiles) || !state.nonces || typeof state.nonces !== 'object') throw new Error();
    if (request.operation === 'bootstrap-check') return esmojoReply_({ ok: state.profiles.length === 0, code: state.profiles.length ? 'CONFLICT' : undefined, data: { empty: state.profiles.length === 0 } });
    const actor = state.profiles.find(profile => profile.id === request.actor && !profile.disabled);
    // Eenmalige, expliciet opgedragen roltoekenning; uitsluitend het vaste bestaande account.
    if(actor){
      const superAccounts=state.profiles.filter(item=>typeof item.email==='string'&&item.email.toLowerCase()===ESMOJO_SUPER_ADMIN_EMAIL);
      if(superAccounts.length>1)throw Error('PROFILE_INVALID');
      const superAccount=superAccounts[0];
      if(superAccount&&superAccount.role!=='superbeheerder'){
        superAccount.role='superbeheerder';stage='DRIVE_WRITE';file.setContent(JSON.stringify(state));
      }
    }
    const denied = () => esmojoReply_({ ok: false, code: 'FORBIDDEN' });
    const conflict = () => esmojoReply_({ ok: false, code: 'CONFLICT' });
    if (request.operation === 'self') {
      if(!actor)return denied();
      if(esmojoMigrateAccountCompanies_(state)){stage='DRIVE_WRITE';file.setContent(JSON.stringify(state));}
      let homeDashboard=null;
      if(request.includeHome===true&&actor.activated&&hasModule(actor,'shows')){try{homeDashboard=esmojoHomeDashboard_({operation:'home-dashboard',actor:actor.id},folder);}catch{/* Fout in de homepage blokkeert nooit aanmelden. */}}
      return esmojoReply_({ok:true,data:request.includeHome===true?Object.assign({},actor,{homeDashboard}):actor});
    }
    if (request.operation === 'activate') {
      if (!actor) return denied();
    } else if (request.operation === 'photo') {
      if (!actor || !actor.activated) return denied();
    } else if (request.operation === 'bootstrap') {
      if (state.profiles.length) return conflict();
    } else if (!actor || !isAdministrator(actor) || !actor.activated) return denied();
    if(request.operation==='list'&&esmojoMigrateAccountCompanies_(state)){stage='DRIVE_WRITE';file.setContent(JSON.stringify(state));}
    if (request.operation === 'list') return esmojoReply_({ ok: true, data: state.profiles.map(profile => {
      const copy = Object.assign({}, profile); delete copy.photo; return copy;
    }) });
    // Een schrijfverzoek kan binnen het tijdvenster maar één keer worden uitgevoerd.
    for (const nonce in state.nonces) if (state.nonces[nonce] < Date.now() - 120000) delete state.nonces[nonce];
    if (state.nonces[input.nonce]) return denied();
    state.nonces[input.nonce] = input.timestamp;
    const target = state.profiles.find(profile => profile.id === request.id);
    const profile = request.profile;
    if (['create', 'bootstrap', 'update'].includes(request.operation)) {
      if (!profile || !['beheerder', 'superbeheerder', 'gebruiker'].includes(profile.role)) return esmojoReply_({ ok: false, code: 'PROFILE_INVALID' });
      const email=request.operation==='update'?target?.email:profile.email;
      if(profile.role==='superbeheerder'&&(request.operation!=='update'||!isSuperAdministrator(target)||!isSuperAdministrator(actor)||target.id!==actor.id||typeof email!=='string'||email.toLowerCase()!==ESMOJO_SUPER_ADMIN_EMAIL))return denied();
      for (const key of ['firstName', 'lastName', 'jobTitle']) {
        if (typeof profile[key] !== 'string' || !profile[key].trim() || profile[key].length > 120) return esmojoReply_({ ok: false, code: 'PROFILE_INVALID' });
      }
      const effectiveRole=['create','bootstrap'].includes(request.operation)?(email?.toLowerCase()===ESMOJO_SUPER_ADMIN_EMAIL?'superbeheerder':request.operation==='bootstrap'?'beheerder':profile.role):profile.role;
      try{validateAccountEmployment(Object.assign({},profile,{role:effectiveRole}));}catch(_){return esmojoReply_({ok:false,code:'PROFILE_INVALID'});}
      if(Object.prototype.hasOwnProperty.call(profile,'modules')){try{profile.modules=validateAccountModules(profile.modules);}catch(_){return esmojoReply_({ok:false,code:'PROFILE_INVALID'});}}
      if (profile.photo !== undefined && profile.photo !== '' && (typeof profile.photo !== 'string' || profile.photo.length > 100000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(profile.photo))) return denied();
    }
    if (['create', 'bootstrap'].includes(request.operation)) {
      if (!/^[0-9a-f-]{36}$/i.test(profile.id || '') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email || '')) return esmojoReply_({ ok: false, code: 'PROFILE_INVALID' });
      if (state.profiles.some(item => item.id === profile.id || item.email.toLowerCase() === profile.email.toLowerCase())) return conflict();
      state.profiles.push({ id: profile.id, email: profile.email.toLowerCase(), firstName: profile.firstName,
        lastName: profile.lastName, company:profile.company, jobTitle: profile.jobTitle, role: profile.email.toLowerCase()===ESMOJO_SUPER_ADMIN_EMAIL?'superbeheerder':request.operation === 'bootstrap' ? 'beheerder' : profile.role,
        modules:profile.modules===undefined?accountModules.map(module=>module.id):profile.modules, photo: profile.photo || '', activated: false, disabled: false });
    } else if (request.operation === 'photo') {
      if (Object.keys(request).some(key => !['operation', 'actor', 'photo'].includes(key))
          || typeof request.photo !== 'string' || request.photo.length > 100000
          || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(request.photo)) return esmojoReply_({ ok: false, code: 'PROFILE_INVALID' });
      actor.photo = request.photo;
    } else if (request.operation === 'activate') {
      actor.activated = true;
    } else if (['update', 'disable', 'delete'].includes(request.operation)) {
      if (!target) return conflict();
      if(isSuperAdministrator(target)&&(!isSuperAdministrator(actor)||request.operation!=='update'||profile.role!=='superbeheerder'))return conflict();
      if (target.id === actor.id && (request.operation !== 'update' || !isAdministrator({role:profile.role,email:target.email}))) return conflict();
      if (isAdministrator(target) && !target.disabled && (request.operation !== 'update' || !isAdministrator({role:profile.role,email:target.email}))
          && state.profiles.filter(item => isAdministrator(item) && !item.disabled).length <= 1) return conflict();
      if (request.operation === 'update') {
        ['firstName', 'lastName', 'company', 'jobTitle', 'role', 'photo', 'modules'].forEach(key => { if (profile[key] !== undefined) target[key] = profile[key]; });
      } else if (request.operation === 'disable') target.disabled = true;
      else state.profiles = state.profiles.filter(item => item.id !== target.id);
    } else return denied();
    esmojoMigrateAccountCompanies_(state);
    const serialized = JSON.stringify(state);
    stage = 'DRIVE_WRITE';
    if (file) file.setContent(serialized);
    else folder.createFile(Utilities.newBlob(serialized, 'application/json', '_esmojo_accounts_v1.json'));
    return esmojoReply_({ ok: true, data: request.operation === 'photo' ? actor : { ok: true } });
  } catch (_) {
    return esmojoReply_({ ok: false, code: stage });
  } finally { lock.releaseLock(); }
}
