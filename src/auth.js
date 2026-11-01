import { getSupabase } from './lib/supabase.js';
import './accounts.css';
import logo from './assets/ESMOJO-logo.svg?raw';
import { singleSubmission } from './lib/single-submission.js';

let client;
let onReady;
let onSignedOut;
let running = false;
let expiresAt = null;
let expiryTimer;
let loggingOut = false;
let activeSession = null;
let restoring = null;
const panel = () => document.querySelector('#auth-panel');

export async function access(action, { method = 'GET', body } = {}) {
  if (expiresAt && Date.now() >= expiresAt) { await logout('Je bent na 72 uur automatisch uitgelogd. Log opnieuw in.'); throw new Error('Je sessie is verlopen.'); }
  if (activeSession && expiresAt && activeSession.expires_at * 1000 <= Date.now() + 30000) {
    // Gebruik de gedeelde cookie i.p.v. een mogelijk oud refresh-token uit een ander tabblad.
    const previousUser = activeSession.user.id;
    const restored = await restoreRemembered();
    if (!restored || restored.profile.id !== previousUser) { await logout(); throw new Error('Log opnieuw in.'); }
    armExpiry(restored.expiresAt);
  }
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error('Log opnieuw in.');
  activeSession = data.session;
  const response = await fetch(`/api/access?action=${action}`, { method, cache: 'no-store',
    headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  let result;
  try { result = await response.json(); } catch { throw new Error('De accountdienst is niet beschikbaar.'); }
  if (!response.ok) {
    if (response.status === 401 || ['ACCOUNT_DISABLED', 'MFA_REQUIRED'].includes(result.code)) await logout();
    throw new Error(result.error || 'Het verzoek is mislukt.');
  }
  return result;
}

async function restoreRemembered() {
  if (restoring) return restoring;
  const run = async () => {
    const response = await fetch('/api/access?action=restore', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error('Je sessie kan tijdelijk niet worden hersteld. Probeer opnieuw.');
    const restored = await response.json();
    if (!restored.expiresAt || restored.expiresAt <= Date.now()) return null;
    const result = await client.auth.setSession({ access_token: restored.session.access_token, refresh_token: restored.session.refresh_token });
    if (result.error) return null;
    activeSession = result.data.session;
    return restored;
  };
  restoring = (navigator.locks ? navigator.locks.request('esmojo-session-refresh', run) : run()).finally(() => { restoring = null; });
  return restoring;
}

function armExpiry(deadline) {
  clearTimeout(expiryTimer); expiresAt = deadline;
  if (deadline) expiryTimer = setTimeout(() => { void logout('Je bent na 72 uur automatisch uitgelogd. Log opnieuw in.'); }, Math.max(0, deadline - Date.now()));
}
async function remember(session) {
  const response = await fetch('/api/access?action=remember', { method: 'POST', cache: 'no-store', credentials: 'same-origin',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refresh_token }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Je sessie kon niet worden bewaard. Probeer opnieuw.');
  armExpiry(result.expiresAt);
  return result.expiresAt;
}
function enter(profile, deadline) {
  armExpiry(deadline);
  panel().hidden = true; panel().replaceChildren(); onReady(profile);
}

function screen(title, description, fields, submitText, submit) {
  panel().hidden = false;
  panel().replaceChildren();
  const form = document.createElement('form');
  form.className = 'auth-card';
  form.id = fields.some(field => field.autocomplete === 'one-time-code') ? 'esmojo-authenticator' : fields.some(field => field.autocomplete === 'current-password') ? 'esmojo-login' : 'esmojo-setup';
  form.method = 'post';
  const brand = document.createElement('div'); brand.className = 'auth-logo'; brand.setAttribute('role', 'img'); brand.setAttribute('aria-label', 'ESMOJO');
  brand.innerHTML = logo; brand.querySelector('svg').setAttribute('aria-hidden', 'true');
  const heading = document.createElement('h1'); heading.textContent = title;
  if (title === 'Inloggen') heading.className = 'visually-hidden';
  const intro = document.createElement('p'); intro.textContent = description;
  const message = document.createElement('p'); message.setAttribute('role', 'alert'); message.className = 'form-message';
  form.append(heading);
  if (description) form.append(intro);
  for (const field of fields) {
    const label = document.createElement('label'); label.textContent = field.label;
    const input = document.createElement('input');
    input.id = `esmojo-${field.name}`;
    for (const [name, value] of Object.entries(field)) if (name !== 'label') input.setAttribute(name, value);
    label.append(input); form.append(label);
  }
  const button = document.createElement('button'); button.className = 'primary-button'; button.textContent = submitText;
  form.append(message, button); panel().append(brand, form);
  // Een late tweede wachtwoordlogin mag de MFA-sessie niet terugzetten naar aal1.
  const submitOnce = singleSubmission(async () => {
    button.disabled = true; message.textContent = '';
    try { await submit(new FormData(form), form); }
    catch (error) { message.textContent = error.message || 'Probeer het opnieuw.'; }
    finally { button.disabled = false; }
  }, () => form.isConnected);
  form.addEventListener('submit', event => {
    event.preventDefault();
    void submitOnce();
  });
  form.querySelector('input')?.focus({ preventScroll: true });
  return form;
}

function signIn(message = '') {
  screen('Inloggen', message, [
    { label: 'E-mailadres', name: 'email', type: 'email', autocomplete: 'username', required: '' },
    { label: 'Wachtwoord', name: 'password', type: 'password', autocomplete: 'current-password', required: '' },
  ], 'Inloggen', async fields => {
    const { error } = await client.auth.signInWithPassword({ email: fields.get('email').trim(), password: fields.get('password') });
    if (error) throw new Error('Inloggen mislukt. Controleer je e-mailadres en wachtwoord.');
    await continueLogin();
  });
}

async function continueLogin() {
  if (running) return;
  running = true;
  try {
    const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw new Error('Je sessie kon niet worden gecontroleerd.');
    if (assurance.data.currentLevel === 'aal2') {
      const { profile } = await access('session');
      if (!profile.activated) return setPassword();
      const { data } = await client.auth.getSession();
      const deadline = await remember(data.session);
      enter(profile, deadline); return;
    }
    const listed = await client.auth.mfa.listFactors();
    if (listed.error) throw new Error('Authenticatorgegevens konden niet worden opgehaald.');
    const factor = listed.data.totp.find(item => item.status === 'verified');
    if (factor) return codeForm(factor.id);
    const form = screen('2-stapsverificatie instellen', 'Koppel een authenticator-app, zoals Google Authenticator, Microsoft Authenticator of 1Password. Zonder deze stap krijg je geen toegang.', [], 'Authenticator koppelen', async () => {
      for (const pending of listed.data.all.filter(item => item.factor_type === 'totp' && item.status !== 'verified')) {
        const removed = await client.auth.mfa.unenroll({ factorId: pending.id });
        if (removed.error) throw new Error('Opnieuw koppelen is tijdelijk niet mogelijk.');
      }
      const enrolled = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ESMOJO', issuer: 'ESMOJO' });
      if (enrolled.error) throw new Error('De authenticator kon niet worden gekoppeld.');
      codeForm(enrolled.data.id, enrolled.data.totp);
    });
    addLogout(form);
  } finally { running = false; }
}

function codeForm(factorId, totp) {
  const form = screen(totp ? 'Scan de QR-code' : '2-stapsverificatie', 'Voer de 6-cijferige code uit je authenticator in. Deze verandert iedere 30 seconden.', [
    { label: 'Authenticatorcode', name: 'code', type: 'text', inputmode: 'numeric', pattern: '[0-9]{6}', maxlength: '6', autocomplete: 'one-time-code', required: '' },
  ], 'Bevestigen', async fields => {
    const result = await client.auth.mfa.challengeAndVerify({ factorId, code: fields.get('code') });
    if (result.error) throw new Error('Deze code is ongeldig of verlopen. Gebruik de huidige code uit je app.');
    await continueLogin();
  });
  if (totp) {
    const image = document.createElement('img'); image.width = 200; image.height = 200;
    image.alt = 'QR-code voor het koppelen van je authenticator'; image.className = 'totp-qr';
    const svg = totp.qr_code.replace(/^data:image\/svg\+xml[^,]*,/, '');
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Handmatig instellen';
    const secret = document.createElement('code'); secret.textContent = totp.secret;
    details.append(summary, secret); form.insertBefore(image, form.querySelector('label')); form.insertBefore(details, form.querySelector('label'));
  }
  addLogout(form);
}

function setPassword() {
  const form = screen('Kies je wachtwoord', 'Je authenticator is bevestigd. Kies nu een eigen wachtwoord om je account te activeren.', [
    { label: 'Nieuw wachtwoord', name: 'password', type: 'password', minlength: '12', maxlength: '128', autocomplete: 'new-password', required: '' },
    { label: 'Herhaal wachtwoord', name: 'repeat', type: 'password', minlength: '12', maxlength: '128', autocomplete: 'new-password', required: '' },
  ], 'Account activeren', async fields => {
    if (fields.get('password') !== fields.get('repeat')) throw new Error('De wachtwoorden zijn niet gelijk.');
    await access('complete', { method: 'POST', body: { password: fields.get('password') } });
    // Nieuwe aanmelding bevestigt dat zowel wachtwoord als TOTP werkelijk bruikbaar zijn.
    await logout('Je account is ingesteld. Log nu in met je nieuwe wachtwoord en authenticator.');
  });
  addLogout(form);
}

function addLogout(form) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'text-button'; button.textContent = 'Terug naar inloggen';
  button.addEventListener('click', () => logout()); form.append(button);
}

export async function logout(message) {
  if (loggingOut) return;
  loggingOut = true; armExpiry(null); activeSession = null;
  onSignedOut();
  try {
    await Promise.allSettled([
      fetch('/api/access?action=forget', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) }),
      client.auth.signOut({ scope: 'local' }),
    ]);
  } finally { loggingOut = false; signIn(message); }
}

export async function startAuth(callbacks) {
  ({ onReady, onSignedOut } = callbacks);
  try {
    client = await getSupabase();
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session && expiresAt) {
        activeSession = session;
        // Buiten de Supabase-lock werken. Alleen het token vernieuwen, niet de eindtijd.
        setTimeout(() => { if (!loggingOut && expiresAt) void remember(session).catch(() => logout('Je sessie kon niet worden vernieuwd. Log opnieuw in.')); }, 0);
      }
      if (event === 'SIGNED_OUT' && !loggingOut) {
        activeSession = null; armExpiry(null); onSignedOut(); signIn();
        void fetch('/api/access?action=forget', { method: 'POST', credentials: 'same-origin', cache: 'no-store' }).catch(() => {});
      }
    });
    const checkExpiry = () => { if (expiresAt && Date.now() >= expiresAt) void logout('Je bent na 72 uur automatisch uitgelogd. Log opnieuw in.'); };
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    const match = /^#\/activeren\?token=([^&]+)(?:&type=(invite|recovery))?$/.exec(location.hash);
    if (match) {
      const token = decodeURIComponent(match[1]);
      history.replaceState(null, '', location.pathname + location.search);
      const result = await client.auth.verifyOtp({ token_hash: token, type: match[2] || 'invite' });
      if (result.error) { signIn('De uitnodiging is ongeldig of verlopen. Vraag je beheerder om een nieuwe uitnodiging.'); return; }
      await continueLogin();
    } else {
      const restored = await restoreRemembered();
      if (!restored) { signIn(); return; }
      enter(restored.profile, restored.expiresAt);
    }
  } catch {
    screen('Inloggen niet beschikbaar', 'De beveiligde accountdienst is nog niet volledig aangesloten. Er wordt geen toegang verleend. Probeer het later opnieuw.', [], 'Opnieuw proberen', () => location.reload());
  }
}
