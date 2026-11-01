import { validateShowProfile } from './show-profile.js';
import { createClient } from '@supabase/supabase-js';
import { createProfiles, validateProfile, validatePhoto } from './account-profiles.js';
import { sendEmail } from './email.js';
import { sessionDeadline, readSessionCookie, writeSessionCookie, clearSessionCookie } from './session-cookie.js';
import { createShowsStore } from './shows-store.js';
import { upcomingArtists, upcomingShows } from './mojo-agenda.js';

export function makeAccountsHandler({ env = process.env, clientFactory = createClient, profiles = createProfiles({ env }), mail = sendEmail, shows = createShowsStore({ env }) } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, data) => res.status(status).json(data);
    try {
      const url = env.VITE_SUPABASE_URL;
      const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !publicKey || !env.SUPABASE_SECRET_KEY) return reply(503, { error: 'Accountbeheer is nog niet geconfigureerd.' });
      const origin = req.headers.origin;
      if (origin && origin !== 'https://esmojo.nl' && origin !== env.APP_ORIGIN) return reply(403, { error: 'Geen toegang.' });
      const action = req.query.action;
      if (action === 'forget' && req.method === 'POST') { clearSessionCookie(res); return reply(200, { ok: true }); }
      let token = /^Bearer ([A-Za-z0-9._-]+)$/.exec(req.headers.authorization || '')?.[1];
      const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
      const auth = clientFactory(url, publicKey, options);
      let restored = null, remembered = null;
      const expired = () => { clearSessionCookie(res); return reply(401, { error: 'Je sessie is verlopen. Log opnieuw in.', code: 'SESSION_EXPIRED' }); };
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
      const actor = data.user.id;
      const ownProfile = async () => {
        try { return await profiles('self', actor); }
        catch (failure) {
          if (failure.message === 'FORBIDDEN') throw new Error('ACCOUNT_DISABLED');
          throw failure;
        }
      };
      // Drive controleert de actuele rol opnieuw; gebruikersmetadata is geen autorisatiebron.
      const own = await ownProfile();
      let expiresAt = sessionDeadline(claims);
      if (remembered) expiresAt = Math.min(expiresAt || 0, remembered.expiresAt);
      if (own.activated && (!expiresAt || expiresAt <= Date.now())) return expired();
      if (action === 'session' && req.method === 'GET') return reply(200, { profile: own, expiresAt });
      if (action === 'restore' && req.method === 'POST') {
        if (!own.activated) return expired();
        writeSessionCookie(res, { userId: actor, refreshToken: restored.refresh_token, expiresAt }, env);
        return reply(200, { profile: own, session: restored, expiresAt });
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
      if (action === 'show-profile' && req.method === 'POST') {
        try {
          const input = validateShowProfile(req.body);
          return reply(200, await shows(input.operation, input.payload));
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
        return reply(200, { artists: upcomingArtists(data.concerts), shows: upcomingShows(data.concerts), checkedAt: data.checkedAt });
      }
      if (action === 'photo' && req.method === 'PATCH') {
        const input = req.body;
        if (!input || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'photo') || !input.photo) throw new Error('VALIDATION');
        const photo = validatePhoto(input.photo);
        const profile = await profiles('photo', actor, { photo });
        return reply(200, { profile });
      }
      if (own.role !== 'beheerder') return reply(403, { error: 'Alleen beheerders hebben toegang.' });
      if (action !== 'accounts') return reply(404, { error: 'Niet gevonden.' });
      if (req.method === 'GET') return reply(200, { accounts: await profiles('list', actor) });
      const input = req.body;
      if (!input || typeof input !== 'object' || JSON.stringify(input).length > 110000) throw new Error('VALIDATION');
      const admin = clientFactory(url, env.SUPABASE_SECRET_KEY, options).auth.admin;
      if (req.method === 'PATCH' && input.operation === 'invite') {
        const accounts = await profiles('list', actor);
        const target = accounts.find(item => item.id === input.id && !item.activated && !item.disabled);
        if (!target) return reply(409, { error: 'Dit account kan niet opnieuw worden uitgenodigd.' });
        const current = await admin.getUserById(target.id);
        if (current.error || !current.data?.user) return reply(503, { error: 'Dit account kon niet worden gecontroleerd.' });
        const type = current.data.user.email_confirmed_at ? 'recovery' : 'invite';
        const generated = await admin.generateLink({ type, email: target.email });
        if (generated.error || generated.data?.user?.id !== target.id || !generated.data?.properties?.hashed_token) return reply(503, { error: 'Uitnodiging kon niet worden vernieuwd.' });
        const link = `https://esmojo.nl/#/activeren?token=${encodeURIComponent(generated.data.properties.hashed_token)}&type=${type}`;
        await mail({ to: target.email, subject: 'Stel je ESMOJO-account in', text: `Stel via deze eenmalige link je wachtwoord en authenticator in:\n\n${link}` });
        return reply(200, { ok: true });
      }
      if (req.method === 'POST') {
        const profile = validateProfile(input);
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
          await mail({ to: email, subject: 'Stel je ESMOJO-account in', text: `Er is een ESMOJO-account voor je aangemaakt. Stel via deze eenmalige link je wachtwoord en authenticator in:\n\n${link}\n\nJe krijgt pas toegang nadat je de 2-stapsverificatie hebt afgerond.` });
        } catch {
          return reply(202, { warning: 'Account aangemaakt, maar uitnodiging niet verzonden. Gebruik Opnieuw uitnodigen bij dit account.' });
        }
        return reply(201, { ok: true });
      }
      if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error('VALIDATION');
      if (req.method === 'PATCH') {
        // E-mailadres blijft de authenticatie-identiteit; wijziging vergt een aparte verificatiestroom.
        await profiles('update', actor, { id: input.id, profile: validateProfile(input) });
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
      if (error.message === 'ACCOUNT_DISABLED') { clearSessionCookie(res); return reply(403, { error: 'Dit account heeft geen toegang. Neem contact op met je beheerder.', code: 'ACCOUNT_DISABLED' }); }
      const status = { FORBIDDEN: 403, CONFLICT: 409, VALIDATION: 400 }[error.message] || 503;
      return reply(status, { error: { 403: 'Geen toegang tot dit account.', 409: 'Deze wijziging is niet toegestaan. Je kunt jezelf of de laatste beheerder niet verwijderen of degraderen.', 400: 'Controleer de ingevulde velden en profielfoto.' }[status] || 'De accountdienst is tijdelijk niet beschikbaar.' });
    }
  };
}
