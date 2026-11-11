import {createDataverseResearch} from './dataverse-research.js';
import {dataversePilot} from '../shared/dataverse-pilot.js';
import {createDataverseTest} from './dataverse-test.js';
import {createShowManagementService} from './show-management.js';
import {createIncidentMetricsService} from './incident-metrics.js';
import {createArtistService} from './artist-service.js';
import {createBarrierReferenceService} from './barrier-references.js';
import {hasAppMfa,clearMfaCookie} from './mfa-cookie.js';
import {createOnlineReportMailService} from './online-report-mail.js';
import {createWebCatalogueService} from './web-report-catalogue.js';
import {createWebReportService} from './report-web.js';
import {createOnTrackReportStore,createOnTrackReportService} from './ontrack-report/service.js';
import {createMailingConcertsStore} from './ontrack-concerts.js';
import {createOnTrackStore,validateOnTrackRecipients} from './ontrack-store.js';
import {createFluidPreviewSource} from './fluid-preview-source.js';
import {isFluidPreview,fluidPreviewOrigin,fluidAccountRead,createFluidPreviewService} from './fluid-preview.js';
import {validateBarrierRequest} from './barrier-layout.js';
import {validateFloorRequest} from './floor-pressure.js';
import { waitUntil } from '@vercel/functions';
import { createShowProfilePdfService, validatePdfRequest } from './showprofile-pdf.js';
import { validateFinalRequest } from '../shared/analysis-finalization.js';
import { validateTicketRequest } from './ticket-data.js';
import { getMojoPhoto } from './mojo-photo.js';
import { validateShowProfile } from './show-profile.js';
import {validateMeasureRequest,measureFileSignature,measureUploadLimit} from '../shared/measure-workflow.js';
import {createHash} from 'node:crypto';
import {validateOperationalReview} from '../shared/operational-risk.js';
import { validateRiskViewRequest } from './show-risks.js';
import { validateProductionRiskSelection } from '../shared/production-risks.js';
import { createClient } from '@supabase/supabase-js';
import { createProfiles, validateProfile, validatePhoto } from './account-profiles.js';
import { sendEmail } from './email.js';
import {isSuperAdministrator,isAdministrator,hasModule} from '../shared/account-modules.js';
import {createEmailTestService} from './email-tests.js';
import { accountActivationEmail } from './account-email.js';
import { sessionDeadline, readSessionCookie, writeSessionCookie, clearSessionCookie } from './session-cookie.js';
import { createShowsStore } from './shows-store.js';
import { upcomingArtists, upcomingShows } from './mojo-agenda.js';

export function makeAccountsHandler({ env = process.env, clientFactory = createClient, profiles = createProfiles({ env }), mail = sendEmail, ontrack = createOnTrackStore({env}), mailingConcerts = createMailingConcertsStore({env}), ontrackReportStore = createOnTrackReportStore({env}), shows = createShowsStore({ env }), pdfService = createShowProfilePdfService({ shows }), background = waitUntil, previewSource = null, photoService=getMojoPhoto,referenceService=createBarrierReferenceService({shows}), artistService=createArtistService({env,shows}), incidentService=createIncidentMetricsService({shows}), showManagement=createShowManagementService({env,shows}), dataverseTest=createDataverseTest({env}), dataverseResearch=createDataverseResearch({env}) } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, data) => res.status(status).json(data);
    try {
      const url = env.VITE_SUPABASE_URL;
      const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !publicKey || !env.SUPABASE_SECRET_KEY) return reply(503, { error: 'Accountbeheer is nog niet geconfigureerd.' });
      const origin = req.headers.origin;
      if (origin && origin !== 'https://esmojo.nl' && origin !== env.APP_ORIGIN && !fluidPreviewOrigin(origin,env)) return reply(403, { error: 'Geen toegang.' });
      const action = req.query.action;
      if (action === 'forget' && req.method === 'POST') { clearSessionCookie(res);clearMfaCookie(req,res,env); return reply(200, { ok: true }); }
      let token = /^Bearer ([A-Za-z0-9._-]+)$/.exec(req.headers.authorization || '')?.[1];
      const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
      const auth = clientFactory(url, publicKey, options);
      let restored = null, remembered = null;
      const expired = () => { clearSessionCookie(res);clearMfaCookie(req,res,env); return reply(401, { error: 'Je sessie is verlopen. Log opnieuw in.', code: 'SESSION_EXPIRED' }); };
      if (action === 'restore' && req.method === 'POST') {
        remembered = readSessionCookie(req, env);
        if (!remembered) return expired();
        const renewed = await auth.auth.refreshSession({ refresh_token: remembered.refreshToken });
        if (renewed.error) {
          if (renewed.error.status >= 500 || !renewed.error.status) return reply(503, { error: 'Je sessie kan tijdelijk niet worden hersteld. Probeer opnieuw.' });
          return expired();
        }
        restored = renewed.data?.session;
        if (!restored || restored.user.id !== remembered.userId) return expired();
        token = restored.access_token;
        // Een geroteerd refresh-token direct bewaren, ook als Drive tijdelijk faalt.
        writeSessionCookie(res, { ...remembered, refreshToken: restored.refresh_token }, env);
      }
      if (!token) return reply(401, { error: 'Log eerst in.' });
      const { data, error } = await auth.auth.getUser(token);
      if (error || !data?.user) return restored ? expired() : reply(401, { error: 'Je sessie is verlopen. Log opnieuw in.' });
      // Pas na validatie door Supabase vertrouwen we de claims van ditzelfde token.
      let claims;
      try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); } catch { return reply(401, { error: 'Ongeldige sessie.' }); }
      if (claims.sub !== data.user.id) return reply(401, { error: 'Ongeldige sessie.' });
      if (claims.aal !== 'aal2' || !claims.amr?.some(method => method.method === 'totp')
          || !data.user.factors?.some(factor => factor.factor_type === 'totp' && factor.status === 'verified')) {
        clearSessionCookie(res);
        return reply(403, { error: 'Rond eerst de 2-stapsverificatie af.', code: 'MFA_REQUIRED' });
      }
      if(!isFluidPreview(env)&&!hasAppMfa(req,env,claims))return reply(403,{error:'Bevestig je aanmelding opnieuw met je authenticator.',code:'MFA_REQUIRED'});
      const actor = data.user.id;
      const previewReads=isFluidPreview(env)?(previewSource||createFluidPreviewSource({token,mfaCookie:(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>/^__Host-esmojo-mfa=[A-Za-z0-9_-]{1,2000}$/.test(x))})):null;
      let previewDeadline=null,homeDashboard=null,emailTestCopyTo=null;
      const ownProfile = async () => {
        try {
          if(previewReads){const verified=await previewReads.session();if(verified.profile?.id!==actor||!Number.isFinite(verified.expiresAt)||verified.expiresAt<=Date.now())throw Error('FORBIDDEN');previewDeadline=verified.expiresAt;return verified.profile;}
          const result=await profiles('self',actor,['session','restore','login'].includes(action)?{includeHome:true}:{});
          const {homeDashboard:home,emailTestCopyTo:copyTo,...profile}=result;emailTestCopyTo=copyTo||null;homeDashboard=profile.activated&&hasModule(profile,'shows')?home||null:null;return profile;
        }
        catch (failure) {
          if (failure.message === 'FORBIDDEN') throw new Error('ACCOUNT_DISABLED');
          throw failure;
        }
      };
      // Drive controleert de actuele rol opnieuw; gebruikersmetadata is geen autorisatiebron.
      const own = await ownProfile();
      if(isFluidPreview(env)){
        if(!isAdministrator(own)||!own.activated)return reply(403,{error:'Deze testomgeving vereist een geactiveerd beheerderaccount met MFA.'});
        if(!fluidAccountRead(action,req.method,req.body))return reply(403,{error:'Deze testomgeving is uitsluitend alleen-lezen.'});
      }
      let expiresAt = sessionDeadline(claims);
      if(previewDeadline)expiresAt=Math.min(expiresAt||0,previewDeadline);
      if (remembered) expiresAt = Math.min(expiresAt || 0, remembered.expiresAt);
      if (own.activated && (!expiresAt || expiresAt <= Date.now())) return expired();
      if (action === 'session' && req.method === 'GET') return reply(200, { profile: own, expiresAt,homeDashboard });
      if(action==='login'&&req.method==='POST'){
        if(!req.body||Object.keys(req.body).join(',')!=='refreshToken'||typeof req.body.refreshToken!=='string'||req.body.refreshToken.length<8||req.body.refreshToken.length>2000)throw Error('VALIDATION');
        if(own.activated)writeSessionCookie(res,{userId:actor,refreshToken:req.body.refreshToken,expiresAt},env);
        return reply(200,{profile:own,expiresAt,homeDashboard});
      }
      if (action === 'restore' && req.method === 'POST') {
        if (!own.activated) return expired();
        writeSessionCookie(res, { userId: actor, refreshToken: restored.refresh_token, expiresAt }, env);
        return reply(200, { profile: own, session: restored, expiresAt,homeDashboard });
      }
      if (action === 'remember' && req.method === 'POST') {
        if (!own.activated) return reply(403, { error: 'Stel eerst je account in.' });
        const refreshToken = req.body?.refreshToken;
        if (typeof refreshToken !== 'string' || refreshToken.length < 8 || refreshToken.length > 2000) throw new Error('VALIDATION');
        writeSessionCookie(res, { userId: actor, refreshToken, expiresAt }, env);
        return reply(200, { expiresAt });
      }
      if (action === 'complete' && req.method === 'POST') {
        if (own.activated) return reply(409, { error: 'Dit account is al ingesteld.' });
        const password = req.body?.password;
        if (typeof password !== 'string' || password.length < 12 || password.length > 128) return reply(400, { error: 'Gebruik een wachtwoord van 12 tot 128 tekens.' });
        const admin = clientFactory(url, env.SUPABASE_SECRET_KEY, options).auth.admin;
        const updated = await admin.updateUserById(actor, { password });
        if (updated.error) return reply(400, { error: 'Het wachtwoord is niet geaccepteerd.' });
        await profiles('activate', actor);
        return reply(200, { ok: true });
      }
      if (!own.activated) return reply(403, { error: 'Stel eerst je account volledig in.', code: 'SETUP_REQUIRED' });
      const requiredModule=['show-management','barrier-reference','show-storage-alerts','home-dashboard','home-metadata','shows','show-open','show-photo','show-profile','show-risks','show-profile-pdf','analysis-finalization','ticket-data','barrier-layout','floor-pressure','production-risks','operational-risk','measure','fluid-preview'].includes(action)?'shows':(action==='artists'||typeof action==='string'&&action.startsWith('artist-'))?'artists':(['ontrack','ontrack-report','reports'].includes(action)||typeof action==='string'&&action.startsWith('report-'))?'reports':null;
      if(requiredModule&&!hasModule(own,requiredModule))return reply(403,{error:'Je hebt geen toegang tot deze module.',code:'MODULE_FORBIDDEN',module:requiredModule});
      if(action==='show-management'){
        if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Niet toegestaan.'});}
        try{return reply(200,await showManagement.manage(req.body));}
        catch(error){const code=error.message;return reply(code==='VALIDATION'?400:code==='FORBIDDEN'?403:503,{code:code==='MANAGEMENT_SCHEMA_REQUIRED'?code:'UNAVAILABLE',error:code==='VALIDATION'?'Ongeldig Showbeheer-verzoek.':code==='FORBIDDEN'?'Showbeheer is alleen beschikbaar voor Gashouder-shows.':code==='MANAGEMENT_SCHEMA_REQUIRED'?'Showbeheer is nog niet ingesteld. De Supabase-migratie moet eerst worden uitgevoerd.':'Showbeheer kon niet worden geladen. Probeer opnieuw.'});}
      }
      if(action==='artist-risk'){
        if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Niet toegestaan.'});}
        try{return reply(200,await artistService.risk(actor,req.body,incidentService));}
        catch(error){return reply(error.message==='VALIDATION'?400:503,{error:'De risicoscore kon niet worden bijgewerkt. Probeer opnieuw.'});}
      }
      if(['artist-menu','artist-ranking','artist-detail','artist-view','artist-show'].includes(action)){
        const method=['artist-menu','artist-ranking'].includes(action)?'GET':'POST';
        if(req.method!==method){res.setHeader('Allow',method);return reply(405,{error:'Niet toegestaan.'});}
        try{return reply(200,await artistService[{'artist-menu':'menu','artist-ranking':'ranking','artist-detail':'detail','artist-view':'record','artist-show':'show'}[action]](actor,req.body));}
        catch(error){const status=error.message==='VALIDATION'?400:error.message==='FORBIDDEN'?403:error.message==='NOT_FOUND'?404:503;
          return reply(status,{error:status===400?'Ongeldig artiestverzoek.':status===403?'Je hebt geen toegang tot Artiesten.':status===404?'Deze artiest is niet beschikbaar.':action==='artist-view'||action==='artist-ranking'?'Meest bekeken kon niet worden bijgewerkt.':'De artiesten konden niet worden geladen.',...(status===403?{code:'MODULE_FORBIDDEN',module:'artists'}:{})});}
      }
      if(action==='barrier-reference'){
        if(req.method!=='POST')return reply(405,{error:'Niet toegestaan.'});
        try{return reply(200,await (previewReads?previewReads.reference(req.body?.type):referenceService(actor,req.body)));}catch(error){return reply(error.message==='VALIDATION'?400:error.message==='FORBIDDEN'?403:503,{error:'De schematische afbeelding is niet beschikbaar.'});}
      }
      if(action==='home-dashboard'||action==='home-metadata'){
        const metadata=action==='home-metadata',method=metadata?'POST':'GET';
        if(req.method!==method){res.setHeader('Allow',method);return reply(405,{error:'Niet toegestaan.'});}
        try{
          if(!metadata&&req.body&&Object.keys(req.body).length)throw Error('VALIDATION');
          return reply(200,await shows(action,{...(metadata?validateRiskViewRequest(req.body):{}),actor}));
        }catch(error){const code=error.message,status=code==='FORBIDDEN'?403:code==='VALIDATION'?400:code==='NOT_FOUND'?404:503;
          return reply(status,{error:status===403?'Je hebt geen toegang tot Shows.':status===400?'Ongeldig verzoek.':status===404?'Deze show is niet beschikbaar.':'Het planningdashboard kon niet worden geladen. Probeer opnieuw.',...(status===403?{code:'MODULE_FORBIDDEN',module:'shows'}:{})});}
      }
      if(action==='show-storage-alerts'){if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(405,{error:'Niet toegestaan.'});}try{return reply(200,{alerts:shows.activeStorage?await shows.activeStorage.alerts():[]});}catch{return reply(503,{error:'Opslagmeldingen zijn niet beschikbaar.'});}}
      if(action==='report-email-history'||action==='report-email-open'){
        const history=action==='report-email-history',method=history?'GET':'POST';
        if(req.method!==method){res.setHeader('Allow',method);return reply(405,{error:'Niet toegestaan.'});}
        if(history&&!isAdministrator(own))return reply(403,{error:'Geen toegang.'});
        try{
          if(!history&&(!req.body||Object.keys(req.body).sort().join(',')!=='concertId,token'||typeof req.body.concertId!=='string'||!req.body.concertId||req.body.concertId.length>240||/[\x00-\x1f/\\]/.test(req.body.concertId)||typeof req.body.token!=='string'||!/^[a-f0-9]{64}$/.test(req.body.token)))throw Error('VALIDATION');
          return reply(200,await ontrackReportStore(history?'email-history':'email-open',actor,history?{}:req.body));
        }catch(error){return reply(error.message==='FORBIDDEN'?403:error.message==='VALIDATION'?400:503,{error:'De e-mailregistratie kon niet worden verwerkt.'});}
      }
      if(action==='report-alerts'){if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(405,{error:'Niet toegestaan.'});}try{return reply(200,await ontrackReportStore('pdf-alerts',actor));}catch(error){return reply(error.message==='FORBIDDEN'?403:503,{error:'Rapportagemeldingen zijn niet beschikbaar.'});}}
      if(action==='report-menu'){
        if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(405,{error:'Niet toegestaan.'});}
        try{return reply(200,await createWebCatalogueService({store:ontrackReportStore,onPublished:()=>background(createOnlineReportMailService({store:ontrackReportStore,mail}).run().catch(()=>{}))}).menu(actor));}catch(error){return reply(error.message==='FORBIDDEN'?403:503,{error:'Het rapportagesmenu kon niet worden geladen.',...(error.message==='FORBIDDEN'?{code:'MODULE_FORBIDDEN',module:'reports'}:{})});}
      }
      if(action==='report-web'){
        if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Niet toegestaan.'});}
        try{return reply(200,await createWebReportService({store:ontrackReportStore,photo:photoService})(actor,req.body));}
        catch(error){const status=error.message==='VALIDATION'?400:error.message==='FORBIDDEN'?403:error.message==='NOT_FOUND'?404:503;return reply(status,{error:status===400?'Deze rapportage is niet beschikbaar.':status===403?'Je hebt geen toegang tot deze module.':'De rapportage kon niet worden geladen. Probeer opnieuw.',...(status===403?{code:'MODULE_FORBIDDEN',module:'reports'}:{})});}
      }
      if(previewReads&&action==='shows'&&req.method==='GET')return reply(200,await previewReads.menu());
      if(previewReads&&action==='show-photo'&&req.method==='POST'){const input=validateRiskViewRequest(req.body);return reply(200,await previewReads.photo(input.concertId));}
      if(action==='fluid-preview'){
        if(!isFluidPreview(env))return reply(404,{error:'Niet beschikbaar.'});
        try{return reply(200,await createFluidPreviewService({shows:previewReads.shows,pdfService:createShowProfilePdfService({shows:previewReads.shows})})(req.body,actor));}
        catch(error){return reply(error.message==='VALIDATION'?400:503,{error:error.message==='VALIDATION'?'Ongeldig testverzoek.':'De bestaande Puscifer-gegevens konden niet worden gelezen.'});}
      }
      const schedulePdf = task => { try { background(task); } catch { void task.catch(()=>{}); } };
      const pdfManager = () => [own.firstName,own.lastName].filter(Boolean).join(' ').trim();
      if(action==='show-open'&&req.method==='POST'){
        try{const input=validateRiskViewRequest(req.body);const [bundle,research]=await Promise.all([shows('show-open',{...input,actor}),dataverseResearch.load(input.concertId)]);return reply(200,{...bundle,profile:dataverseResearch.merge(bundle.profile,research)});}
        catch(error){return reply(error.message==='VALIDATION'?400:503,{error:error.message==='VALIDATION'?'Ongeldige show.':'De show kon niet volledig worden geladen. Probeer opnieuw.'});}
      }
      if(['barrier-layout','floor-pressure'].includes(action)&&req.method==='POST'){
        try{const input=action==='barrier-layout'?validateBarrierRequest(req.body):validateFloorRequest(req.body),{operation,...payload}=input;return reply(200,await shows((action==='barrier-layout'?'barrier-':'floor-')+operation,{...payload,actor}));}
        catch(error){const code=error.message;return reply(code==='VALIDATION'?400:['ASSESSMENT_CONFLICT','ASSESSMENT_COMPLETED','CONFLICT'].includes(code)?409:503,{code:['VALIDATION','ASSESSMENT_CONFLICT','ASSESSMENT_COMPLETED','ATTACHMENT_INVALID'].includes(code)?code:'UNAVAILABLE',error:code==='VALIDATION'?(action==='barrier-layout'?'Controleer de verplichte velden en kies een geldige PNG of PDF (maximaal 2 MB).':'Controleer de publieksvakken, bezoekersaantallen, oppervlakten en verplichte beoordeling.'):code==='ASSESSMENT_CONFLICT'?'Deze beoordeling of de brongegevens zijn intussen gewijzigd. Laad opnieuw; je invoer is behouden.':code==='ASSESSMENT_COMPLETED'?'Dit onderdeel is al afgerond. Open de actuele beoordeling of kies eerst Bewerken.':'Laden of opslaan is niet gelukt. Je invoer is behouden. Probeer opnieuw.'});}
      }
      if(action==='measure'){
        if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Methode niet toegestaan.'});}
        try{const input=validateMeasureRequest(req.body);if(input.operation==='upload'){const bytes=Buffer.from(input.base64,'base64');if(bytes.length>measureUploadLimit||!measureFileSignature(bytes,input.mime)||createHash('sha256').update(bytes).digest('hex')!==input.sha256)throw Error('VALIDATION');}const {operation,...payload}=input;return reply(200,await shows('measure-'+operation,{...payload,actor}));}
        catch(error){const code=error.message;return reply(code==='FORBIDDEN'?403:code==='VALIDATION'?400:['SOURCE_CHANGED','ASSESSMENT_CONFLICT','ASSESSMENT_COMPLETED','CONFLICT'].includes(code)?409:503,{error:code==='VALIDATION'?'Controleer de verplichte beoordeling en kies een PDF, PNG of JPG van maximaal 2 MB.':code==='FORBIDDEN'?'Je hebt geen toegang tot deze module.':['SOURCE_CHANGED','ASSESSMENT_CONFLICT','ASSESSMENT_COMPLETED','CONFLICT'].includes(code)?'Het risico of de maatregel is intussen gewijzigd. Je invoer is behouden; laad de actuele maatregel.':'Opslag of documentcontrole niet bevestigd. Je invoer is behouden; probeer opnieuw.'});}
      }
      if(action==='operational-risk'&&req.method==='POST'){
        try{return reply(200,await shows('risk-operational-save',{...validateOperationalReview(req.body),actor}));}
        catch(error){const conflict=['SOURCE_CHANGED','ASSESSMENT_CONFLICT','CONFLICT','REPORT_NOT_READY'].includes(error.message);return reply(error.message==='VALIDATION'?400:conflict?409:503,{error:error.message==='VALIDATION'?'Kies een risicoklasse en vul de verplichte toelichting of beheersmaatregel in.':conflict?'Het risico of de beoordeling is intussen gewijzigd. Laad de actuele risico’s; je invoer is behouden.':'Opslag niet bevestigd. Je invoer is behouden; probeer opnieuw.'});}
      }
      if (action === 'show-risks' && req.method === 'POST') {
        try { return reply(200, await shows('risk-view', validateRiskViewRequest(req.body))); }
        catch (error) { return reply(error.message === 'VALIDATION' ? 400 : 503, {
          error: error.message === 'VALIDATION' ? 'Ongeldige show.' : 'Risicoanalyse laden is niet gelukt. Probeer opnieuw.',
        }); }
      }
      if (action === 'production-risks' && req.method === 'POST') {
        try {
          const saved=await shows('risk-production-save',{...validateProductionRiskSelection(req.body),actor});
          // Een reeds geopende oudere client verwacht uitsluitend de keuze.
          // Nieuwe clients verwerken de homepage-envelop vóór domeinvalidatie.
          const {homePlanning,...state}=saved;
          return reply(200,req.headers['x-esmojo-planning-envelope']==='1'?saved:state);
        }
        catch(error){return reply(error.message==='VALIDATION'?400:error.message==='CONFLICT'?409:503,{
          error:error.message==='CONFLICT'?'De keuzes zijn intussen gewijzigd. Laad de risicoanalyse opnieuw.':'De keuze kon niet worden opgeslagen. Laad de risicoanalyse opnieuw en probeer het nogmaals.',
        });}
      }
      if(action==='show-profile-pdf'&&req.method==='POST'){
        try{const input=validatePdfRequest(req.body);if(input.operation==='download')return reply(200,await pdfService.download(input.concertId));const status=await pdfService.status(input.concertId);
          if((input.operation==='ensure'&&status.state==='pending')||(input.operation==='retry'&&['pending','failed'].includes(status.state))){schedulePdf(pdfService.ensure(input.concertId,pdfManager()).catch(()=>{}));return reply(200,{state:'generating'});}return reply(200,status);
        }catch(error){return reply(error.message==='VALIDATION'?400:['REPORT_NOT_READY','REPORT_CONFLICT'].includes(error.message)?409:503,{error:error.message==='VALIDATION'?'Ongeldig PDF-verzoek.':'Het showprofiel is niet beschikbaar. Vernieuw de show; je gegevens zijn behouden.'});}
      }
      if (action === 'analysis-finalization' && req.method === 'POST') {
        try { const input = validateFinalRequest(req.body); const {operation,...payload}=input; const result=await shows('final-'+operation,payload);if(operation==='complete'&&result.finalization?.categories.visitors.completedAt&&result.finalization?.categories.artist.completedAt)schedulePdf(pdfService.ensure(input.concertId,pdfManager()).catch(()=>{}));return reply(200,result); }
        catch(error) { const code=error.message; return reply(code==='VALIDATION'?400:['FINAL_CONFLICT','FINAL_NOT_READY'].includes(code)?409:503,{error:code==='VALIDATION'?'Kies een cijfer van 1 tot en met 10 en vul een samenvatting in (maximaal 2000 tekens).':code==='FINAL_NOT_READY'?'Nog niet alle vereiste stappen zijn afgerond. Vernieuw het overzicht.':code==='FINAL_CONFLICT'?'De analyse is intussen gewijzigd of al afgerond. Vernieuw het overzicht; je invoer is behouden.':'Afronden of laden is niet gelukt. Je invoer is behouden.'}); }
      }
      if (action === 'ticket-data' && req.method === 'POST') {
        try { const input = validateTicketRequest(req.body); return reply(200, await shows(input.operation, { ...input.payload, actor })); }
        catch (error) { const code = error.message; return reply(code === 'VALIDATION' ? 400 : code === 'TICKET_CONFLICT' ? 409 : 503, { error: code === 'TICKET_CONFLICT' ? 'Dit veld is gereserveerd of intussen gewijzigd. Je invoer is behouden. Ga terug en laad de laatste gegevens.' : code === 'VALIDATION' ? 'Controleer de ingevoerde waarden en showdagen.' : 'Laden of opslaan is niet gelukt. Je invoer is behouden.' }); }
      }
      if (action === 'show-photo' && req.method === 'POST') {
        const input = req.body;
        if (!input || Object.keys(input).length !== 1 || typeof input.concertId !== 'string' || input.concertId.length > 240 || /[\x00-\x1f/\\]/.test(input.concertId)) return reply(400, { error: 'Ongeldige show.' });
        const index = await shows('list');
        let concert = index.concerts.find(row => row.concertId === input.concertId);
        if(!concert){try{concert=(await shows('home-metadata',{concertId:input.concertId,actor})).show;}catch{/* Geen vrije URL/andere zaal als fallback. */}}
        return reply(200, { photo: concert ? await photoService(concert.sourceUrl) : null });
      }
      if (action === 'show-profile' && req.method === 'POST') {
        try {
          const input = validateShowProfile(req.body);
          if(input.operation!=='profile-read')return reply(200,await shows(input.operation,input.payload));
          const [profile,research]=await Promise.all([shows(input.operation,input.payload),dataverseResearch.load(input.payload.concertId)]);
          return reply(200,dataverseResearch.merge(profile,research,input.payload.questionNumber));
        } catch (error) {
          const code = error.message;
          return reply(code === 'VALIDATION' ? 400 : code === 'PROFILE_CONFLICT' ? 409 : 503, { error: code === 'PROFILE_CONFLICT'
            ? 'Deze analyse is intussen gewijzigd. Ga terug en laad de nieuwste versie; je tekst is niet overschreven.'
            : code === 'VALIDATION' ? 'Controleer de samenvatting (maximaal 400 tekens).' : 'Opslaan of laden is niet gelukt. Je tekst blijft in beeld; probeer opnieuw.' });
        }
      }
      if (action === 'shows' && req.method === 'GET') {
        const data = await shows('list');
        if (!data.checkedAt) return reply(503, { error: 'De concertagenda is nog niet geïmporteerd.' });
        const concerts=data.concerts.some(row=>row.concertId===dataversePilot.concertId)?data.concerts:[...data.concerts,dataversePilot];
        return reply(200, { artists: upcomingArtists(data.concerts), shows: upcomingShows(concerts), checkedAt: data.checkedAt });
      }
      if (action === 'photo' && req.method === 'PATCH') {
        const input = req.body;
        if (!input || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'photo') || !input.photo) throw new Error('VALIDATION');
        const photo = validatePhoto(input.photo);
        const profile = await profiles('photo', actor, { photo });
        return reply(200, { profile });
      }
      if (!isAdministrator(own)) return reply(403, { error: 'Alleen beheerders hebben toegang.' });
      if(action==='dataverse-test'){
        if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Niet toegestaan.'});}
        if(!req.body||Object.keys(req.body).length!==1||!['status','table-read','table-write'].includes(req.body.operation))return reply(400,{error:'Ongeldig testverzoek.'});
        try{return reply(200,await dataverseTest({table:req.body.operation!=='status',...(req.body.operation==='table-write'?{write:true}:{})}));}catch{return reply(503,{error:'De verbindingstest kon niet worden uitgevoerd.'});}
      }
      if(action==='incidents'){
        if(own.disabled)return reply(403,{error:'Geen toegang.'});
        try{
          if(req.method==='GET')return reply(200,await incidentService.snapshot(actor));
          res.setHeader('Allow','GET');return reply(405,{error:'Niet toegestaan.'});
        }catch(error){return reply(error.message==='VALIDATION'?400:error.message==='CONFLICT'?409:error.message==='FORBIDDEN'?403:503,{error:error.message==='CONFLICT'?'De registratie is intussen gewijzigd. Laad de actuele gegevens; je invoer is behouden.':'De incidentgegevens konden niet worden geladen of opgeslagen. Controleer je invoer en probeer opnieuw.'});}
      }
      if(action==='ontrack-report'){
        if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Niet toegestaan.'});}
        try{const service=createOnTrackReportService({store:ontrackReportStore,mail}),result=await service.action(actor,req.body);if(['link','retry','send'].includes(req.body.operation))background((async()=>{await createOnlineReportMailService({store:ontrackReportStore,mail}).run();await service.run();})().catch(()=>{}));return reply(200,result);}
        catch(error){const status=error.message==='VALIDATION'?400:error.message==='REPORT_CONFLICT'?409:error.message==='FORBIDDEN'?403:503;return reply(status,{error:status===400?'Controleer de CSV- en concertkeuze.':status===409?'De CSV of koppeling is intussen gewijzigd. Vernieuw de gegevens.':'De rapportage kon niet worden geladen of verwerkt. De bron en eerdere rapporten blijven behouden.'});}
      }
      if(action==='ontrack'){
        try{
          if(req.method==='GET'){const [status,assetStatus]=await Promise.all([ontrack('status',actor),createOnTrackReportService({store:ontrackReportStore,mail}).assetStatus()]);return reply(200,{...status,...assetStatus});}
          if(req.method==='PATCH'){const saved=await ontrack('recipients',actor,validateOnTrackRecipients(req.body));return reply(200,{...saved,...await createOnTrackReportService({store:ontrackReportStore,mail}).assetStatus()});}
          res.setHeader('Allow','GET, PATCH');return reply(405,{error:'Niet toegestaan.'});
        }catch(error){const status=error.message==='VALIDATION'?400:error.message==='CONFLICT'?409:error.message==='FORBIDDEN'?403:503;return reply(status,{error:status===400?'Selecteer geldige ontvangeraccounts.':status===409?'De ontvangers zijn intussen gewijzigd. Je selectie is behouden; laad de actuele instellingen voordat je opnieuw opslaat.':'OnTrack kon niet worden geladen of opgeslagen. Je selectie is behouden. Probeer opnieuw.'});}
      }
      if(action==='email'){
        const service=createEmailTestService({mail,shows,mailingConcerts,reportContext:ontrackReportStore,copyTo:emailTestCopyTo,copyActor:own.id});
        try{
          if(req.method==='GET')return reply(200,await service.catalog(own,Boolean(env.RESEND_API_KEY)));
          if(req.method==='POST'){
            if(!env.RESEND_API_KEY)return reply(503,{error:'E-mailverzending is nog niet geconfigureerd.'});
            return reply(200,await service.send(own,req.body));
          }
          res.setHeader('Allow','GET, POST');return reply(405,{error:'Niet toegestaan.'});
        }catch(error){
          const status=error.message==='VALIDATION'?400:['EMAIL_TEMPLATE_NOT_FOUND','EMAIL_SHOW_NOT_FOUND'].includes(error.message)?404:503;
          return reply(status,{error:status===400?'Kies een geldig template en, indien nodig, een concert.':status===404?'Dit template of concert is niet beschikbaar.':'De e-mailtemplates konden niet worden geladen of de testmail kon niet worden verstuurd. Probeer opnieuw.'});
        }
      }
      if (action !== 'accounts') return reply(404, { error: 'Niet gevonden.' });
      if (req.method === 'GET') return reply(200, { accounts: await profiles('list', actor) });
      const input = req.body;
      if (!input || typeof input !== 'object' || JSON.stringify(input).length > 110000) throw new Error('VALIDATION');
      const admin = clientFactory(url, env.SUPABASE_SECRET_KEY, options).auth.admin;
      if (req.method === 'PATCH' && ['invite','activation-link'].includes(input.operation)) {
        if(Object.keys(input).sort().join(',')!=='id,operation'||typeof input.id!=='string'||!/^[0-9a-f-]{36}$/i.test(input.id))throw new Error('VALIDATION');
        const accounts = await profiles('list', actor);
        const target = accounts.find(item => item.id === input.id && !item.activated && !item.disabled);
        if (!target) return reply(409, { error: 'Dit account kan niet opnieuw worden uitgenodigd.' });
        const current = await admin.getUserById(target.id);
        if (current.error || !current.data?.user) return reply(503, { error: 'Dit account kon niet worden gecontroleerd.' });
        const type = current.data.user.email_confirmed_at ? 'recovery' : 'invite';
        const generated = await admin.generateLink({ type, email: target.email });
        if (generated.error || generated.data?.user?.id !== target.id || !generated.data?.properties?.hashed_token) return reply(503, { error: 'Uitnodiging kon niet worden vernieuwd.' });
        const link = `https://esmojo.nl/#/activeren?token=${encodeURIComponent(generated.data.properties.hashed_token)}&type=${type}`;
        if(input.operation==='activation-link')return reply(200,{activationUrl:link});
        await mail(accountActivationEmail({to:target.email,firstName:target.firstName,activationUrl:link,reissued:true}));
        return reply(200, { ok: true });
      }
      if (req.method === 'POST') {
        const profile = validateProfile(input,{defaultRole:'gebruiker'});
        const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('VALIDATION');
        if (!env.RESEND_API_KEY) return reply(503, { error: 'Uitnodigingsmail is nog niet geconfigureerd.' });
        const created = await admin.createUser({ email, email_confirm: false });
        if (created.error || !created.data?.user?.id) return reply(409, { error: 'Account kon niet worden aangemaakt. Controleer of het e-mailadres al bestaat.' });
        const id = created.data.user.id;
        const generated = await admin.generateLink({ type: 'invite', email });
        if (generated.error || generated.data?.user?.id !== id || !generated.data?.properties?.hashed_token) {
          await admin.deleteUser(id);
          return reply(503, { error: 'De uitnodiging kon niet worden voorbereid.' });
        }
        try {
          await profiles('create', actor, { profile: { ...profile, id, email } });
        } catch (failure) {
          // Geen account zonder profiel achterlaten. Nooit credentialwaarden loggen.
          await admin.deleteUser(id);
          throw failure;
        }
        const link = `https://esmojo.nl/#/activeren?token=${encodeURIComponent(generated.data.properties.hashed_token)}`;
        try {
          await mail(accountActivationEmail({to:email,firstName:profile.firstName,activationUrl:link}));
        } catch {
          return reply(202, { warning: 'Account aangemaakt, maar uitnodiging niet verzonden. Gebruik Opnieuw uitnodigen bij dit account.' });
        }
        return reply(201, { ok: true });
      }
      if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error('VALIDATION');
      if (req.method === 'PATCH') {
        // E-mailadres blijft de authenticatie-identiteit; wijziging vergt een aparte verificatiestroom.
        let changed;
        if(input.role===undefined&&input.id===own.id&&isSuperAdministrator(own)){
          changed=validateProfile({...input,role:'beheerder'});changed.role=own.role;
        }else changed=validateProfile(input);
        await profiles('update', actor, { id: input.id, profile: changed });
        return reply(200, { ok: true });
      }
      if (req.method === 'DELETE') {
        // Eerst blokkeren in Drive. Zelfs als Supabase faalt krijgt dit account geen API-toegang.
        await profiles('disable', actor, { id: input.id });
        const removed = await admin.deleteUser(input.id);
        if (removed.error) return reply(503, { error: 'Account is geblokkeerd. Verwijderen uit de authenticatiedienst is nog niet gelukt; probeer opnieuw.' });
        await profiles('delete', actor, { id: input.id });
        return reply(200, { ok: true });
      }
      res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
      return reply(405, { error: 'Niet toegestaan.' });
    } catch (error) {
      if(isFluidPreview(env)&&error.message==='PREVIEW_AUTH_REQUIRED'){clearSessionCookie(res);return reply(401,{error:'Log opnieuw in op de preview.',code:'SESSION_EXPIRED'});}
      if(isFluidPreview(env)&&error.message==='PREVIEW_SOURCE_UNAVAILABLE')return reply(503,{error:'De preview kan de bestaande ESMOJO-accountdienst niet bereiken. Probeer opnieuw.',code:'PREVIEW_SOURCE_UNAVAILABLE'});
      if (error.message === 'ACCOUNT_DISABLED') { clearSessionCookie(res); return reply(403, { error: 'Dit account heeft geen toegang. Neem contact op met je beheerder.', code: 'ACCOUNT_DISABLED' }); }
      const status = { FORBIDDEN: 403, CONFLICT: 409, VALIDATION: 400 }[error.message] || 503;
      return reply(status, { error: { 403: 'Geen toegang tot dit account.', 409: 'Deze wijziging is niet toegestaan. Je kunt jezelf of de laatste beheerder niet verwijderen of degraderen.', 400: 'Controleer de ingevulde velden en profielfoto.' }[status] || 'De accountdienst is tijdelijk niet beschikbaar.' });
    }
  };
}
