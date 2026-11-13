// De gebruiker heeft alle huidige accounts expliciet bij MOJO ondergebracht.
function esmojoMigrateAccountCompanies_(state){
 if(state.companyMigrationV1)return false;
 const missing=state.profiles.filter(profile=>profile.company===undefined);
 if(!missing.length)return false;
 missing.forEach(profile=>{profile.company='MOJO Concerts';});state.companyMigrationV1=true;return true;
}
// Eenmalig het bestaande legacybeleid expliciet maken, vóór fail-closed clients.
// Alleen ontbrekende velden; expliciete keuzes (ook []/ongeldig) nooit verruimen.
function esmojoMigrateAccountModules_(state){
 if(state.moduleMigrationV1)return false;
 state.profiles.forEach(profile=>{if(profile.modules===undefined)profile.modules=accountModules.map(module=>module.id);});
 state.moduleMigrationV1=true;return true;
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
    const properties=PropertiesService.getScriptProperties();
    const configuredMode=properties.getProperty('ESMOJO_ACCOUNT_ACCESS_MODE');
    const accessMode=['freeze','dataverse'].includes(configuredMode)?configuredMode:'legacy';
    const contract=request.accessContract==='account-access-v1';
    // Old deployments must not keep authorizing from a stale Drive mirror.
    if(accessMode==='dataverse'&&(!contract||request.actorNativeAllowed!==true))return esmojoReply_({ok:false,code:'FORBIDDEN'});
    if(accessMode==='freeze'&&['create','bootstrap','update','disable','delete','activate'].includes(request.operation))return esmojoReply_({ok:false,code:'ACCESS_FROZEN'});
    const nativeActor=accessMode==='dataverse'&&contract&&request.actorNativeAllowed===true;
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
    const actor=state.profiles.find(profile=>profile.id===request.actor&&(!profile.disabled||nativeActor));
    const denied=()=>esmojoReply_({ok:false,code:'FORBIDDEN'});
    const conflict=()=>esmojoReply_({ok:false,code:'CONFLICT'});
    // De eerder geverifieerde vaste identiteit staat uitsluitend in het private register.
    const superId=state.superAdminId;
    if(actor&&typeof superId==='string'){
      const pinned=state.profiles.find(profile=>profile.id===superId);
      if(!pinned||!nativeActor&&pinned.disabled||pinned.role!=='superbeheerder')throw Error('REGISTER_INVALID');
    }
    if(['access-policy','access-snapshot','access-state'].includes(request.operation)){
      if(!contract||!actor||(!actor.activated&&!nativeActor))return denied();
      if(request.operation==='access-state'){
        if(request.id!==actor.id&&!isAdministrator(actor))return denied();
        const found=state.profiles.find(profile=>profile.id===request.id);
        return esmojoReply_({ok:true,data:found?{id:found.id,activated:found.activated,disabled:found.disabled,modules:isSuperAdministrator(found)?accountModules.map(module=>module.id):validateAccountModules(found.modules)}:null});
      }
      if(!isAdministrator(actor)||!hasModule(actor,'shows'))return denied();
      if(request.operation==='access-snapshot'){
        if(accessMode==='legacy')return denied();
        return esmojoReply_({ok:true,data:state.profiles.map(profile=>{
          if(typeof profile.activated!=='boolean'||typeof profile.disabled!=='boolean')throw Error('REGISTER_INVALID');
          return{id:profile.id,activated:profile.activated,disabled:profile.disabled,modules:isSuperAdministrator(profile)?accountModules.map(module=>module.id):validateAccountModules(profile.modules)};
        })});
      }
      if(request.mode===undefined)return esmojoReply_({ok:true,data:{mode:accessMode}});
      if(!['legacy','freeze','dataverse'].includes(request.mode)||accessMode==='dataverse'&&request.mode!=='dataverse'||request.mode==='dataverse'&&accessMode!=='freeze'&&accessMode!=='dataverse')return conflict();
      // Same ScriptLock as account writes: no source mutation can cross freeze.
      properties.setProperty('ESMOJO_ACCOUNT_ACCESS_MODE',request.mode);
      return esmojoReply_({ok:true,data:{mode:properties.getProperty('ESMOJO_ACCOUNT_ACCESS_MODE')}});
    }
    if (request.operation === 'self') {
      if(!actor)return denied();
      const companyChanged=esmojoMigrateAccountCompanies_(state);
      if(esmojoMigrateAccountModules_(state)||companyChanged){stage='DRIVE_WRITE';file.setContent(JSON.stringify(state));}
      let homeDashboard=null;
      if(request.includeHome===true&&actor.activated&&hasModule(actor,'shows')){try{homeDashboard=esmojoHomeDashboard_({operation:'home-dashboard',actor:actor.id},folder);}catch{/* Fout in de homepage blokkeert nooit aanmelden. */}}
      // The show-opening route only needs fresh authorization and actor metadata.
      // Keep the canonical register read/role checks above; do not send an unused
      // base64 avatar or private email-test configuration on every show request.
      if(request.authorizationOnly===true){
        const result={};
        for(const key of ['id','firstName','lastName','email','company','jobTitle','role','modules','activated','disabled'])if(Object.prototype.hasOwnProperty.call(actor,key))result[key]=actor[key];
        return esmojoReply_({ok:true,data:result});
      }
      const copy=state.emailTestCopy;
      const result=Object.assign({},actor,request.includeHome===true?{homeDashboard}:{},actor.id===superId&&isSuperAdministrator(actor)&&copy?.actor===actor.id&&typeof copy.address==='string'?{emailTestCopyTo:copy.address}:{});
      return esmojoReply_({ok:true,data:result});
    }
    if (request.operation === 'activate') {
      if (!actor) return denied();
    } else if (request.operation === 'photo') {
      if (!actor || !actor.activated&&!nativeActor) return denied();
    } else if (request.operation === 'bootstrap') {
      if (state.profiles.length) return conflict();
    } else if (!actor || !isAdministrator(actor) || !actor.activated&&!nativeActor) return denied();
    if(request.operation==='list'){const companyChanged=esmojoMigrateAccountCompanies_(state);if(esmojoMigrateAccountModules_(state)||companyChanged){stage='DRIVE_WRITE';file.setContent(JSON.stringify(state));}}
    if (request.operation === 'list') return esmojoReply_({ ok: true, data: state.profiles.map(profile => {
      const copy = Object.assign({}, profile); delete copy.photo; return copy;
    }) });
    // Een schrijfverzoek kan binnen het tijdvenster maar één keer worden uitgevoerd.
    for (const nonce in state.nonces) if (state.nonces[nonce] < Date.now() - 120000) delete state.nonces[nonce];
    if (state.nonces[input.nonce]) return denied();
    state.nonces[input.nonce] = input.timestamp;
    const target = state.profiles.find(profile => profile.id === request.id);
    const profile = request.profile;
    const nativeTargetId=request.operation==='create'?profile?.id:request.operation==='activate'?request.actor:request.id;
    const nativeFlags=request.nativeAccessState;
    if(accessMode==='dataverse'&&['create','update','disable','delete','activate'].includes(request.operation)){
      if(!nativeActor||!nativeFlags||nativeFlags.id!==nativeTargetId||typeof nativeFlags.activated!=='boolean'||typeof nativeFlags.disabled!=='boolean')return denied();
      try{validateAccountModules(nativeFlags.modules);}catch(_){return denied();}
      const old=request.operation==='activate'?actor:target;
      const expectedFlags=request.operation==='create'?{id:profile.id,activated:false,disabled:false,modules:profile.modules||[]}:
        request.operation==='delete'?{id:request.id,activated:false,disabled:true,modules:[]}:
        {id:old?.id,activated:request.operation==='activate'?true:old?.activated,disabled:request.operation==='disable'?true:old?.disabled,modules:request.operation==='update'&&profile.modules!==undefined?profile.modules:old?.modules};
      if(request.operation==='update'&&profile.role==='superbeheerder')expectedFlags.modules=accountModules.map(module=>module.id);
      if(nativeFlags.id!==expectedFlags.id||nativeFlags.activated!==expectedFlags.activated||nativeFlags.disabled!==expectedFlags.disabled||JSON.stringify(validateAccountModules(nativeFlags.modules))!==JSON.stringify(validateAccountModules(expectedFlags.modules)))return denied();
    }
    if (['create', 'bootstrap', 'update'].includes(request.operation)) {
      if (!profile || !['beheerder', 'superbeheerder', 'gebruiker'].includes(profile.role)) return esmojoReply_({ ok: false, code: 'PROFILE_INVALID' });
      if(profile.role==='superbeheerder'&&(request.operation!=='update'||!isSuperAdministrator(target)||!isSuperAdministrator(actor)||target.id!==actor.id||target.id!==superId))return denied();
      for (const key of ['firstName', 'lastName', 'jobTitle']) {
        if (typeof profile[key] !== 'string' || !profile[key].trim() || profile[key].length > 120) return esmojoReply_({ ok: false, code: 'PROFILE_INVALID' });
      }
      const effectiveRole=request.operation==='bootstrap'?'beheerder':profile.role;
      try{validateAccountEmployment(Object.assign({},profile,{role:effectiveRole}));}catch(_){return esmojoReply_({ok:false,code:'PROFILE_INVALID'});}
      if(Object.prototype.hasOwnProperty.call(profile,'modules')){try{profile.modules=validateAccountModules(profile.modules);}catch(_){return esmojoReply_({ok:false,code:'PROFILE_INVALID'});}}
      if (profile.photo !== undefined && profile.photo !== '' && (typeof profile.photo !== 'string' || profile.photo.length > 100000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(profile.photo))) return denied();
    }
    if (['create', 'bootstrap'].includes(request.operation)) {
      if (!/^[0-9a-f-]{36}$/i.test(profile.id || '') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email || '')) return esmojoReply_({ ok: false, code: 'PROFILE_INVALID' });
      if (state.profiles.some(item => item.id === profile.id || item.email.toLowerCase() === profile.email.toLowerCase())) return conflict();
      state.profiles.push({ id: profile.id, email: profile.email.toLowerCase(), firstName: profile.firstName,
        lastName: profile.lastName, company:profile.company, jobTitle: profile.jobTitle, role: request.operation === 'bootstrap' ? 'beheerder' : profile.role,
        modules:profile.modules===undefined?[]:profile.modules, photo: profile.photo || '', activated: false, disabled: false });
    } else if (request.operation === 'photo') {
      if (Object.keys(request).some(key => !['operation', 'actor', 'photo','accessContract','actorNativeAllowed'].includes(key))
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
    if(accessMode==='dataverse'&&nativeFlags&&request.operation!=='delete'){
      const saved=state.profiles.find(profile=>profile.id===nativeTargetId);
      if(!saved)throw Error('REGISTER_INVALID');
      saved.activated=nativeFlags.activated;saved.disabled=nativeFlags.disabled;saved.modules=validateAccountModules(nativeFlags.modules);
    }
    esmojoMigrateAccountCompanies_(state);esmojoMigrateAccountModules_(state);
    const serialized = JSON.stringify(state);
    stage = 'DRIVE_WRITE';
    if (file) file.setContent(serialized);
    else folder.createFile(Utilities.newBlob(serialized, 'application/json', '_esmojo_accounts_v1.json'));
    return esmojoReply_({ ok: true, data: request.operation === 'photo' ? actor : { ok: true } });
  } catch (_) {
    return esmojoReply_({ ok: false, code: stage });
  } finally { lock.releaseLock(); }
}
