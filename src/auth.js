import { getSupabase } from './lib/supabase.js';
import './accounts.css';

let client;
let onReady;
let onSignedOut;
let running = false;
const panel = () => document.querySelector('#auth-panel');

export async function access(action, { method = 'GET', body } = {}) {
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error('Log opnieuw in.');
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

function screen(title, description, fields, submitText, submit) {
  panel().hidden = false;
  panel().replaceChildren();
  const form = document.createElement('form');
  form.className = 'auth-card';
  const heading = document.createElement('h1'); heading.textContent = title;
  const intro = document.createElement('p'); intro.textContent = description;
  const message = document.createElement('p'); message.setAttribute('role', 'alert'); message.className = 'form-message';
  form.append(heading, intro);
  for (const field of fields) {
    const label = document.createElement('label'); label.textContent = field.label;
    const input = document.createElement('input');
    for (const [name, value] of Object.entries(field)) if (name !== 'label') input.setAttribute(name, value);
    label.append(input); form.append(label);
  }
  const button = document.createElement('button'); button.className = 'primary-button'; button.textContent = submitText;
  form.append(message, button); panel().append(form);
  form.addEventListener('submit', async event => {
    event.preventDefault(); button.disabled = true; message.textContent = '';
    try { await submit(new FormData(form), form); }
    catch (error) { message.textContent = error.message || 'Probeer het opnieuw.'; }
    finally { button.disabled = false; }
  });
  return form;
}

function signIn(message = '') {
  screen('Inloggen', message || 'Log in met je ESMOJO-account. Daarna bevestig je de code uit je authenticator.', [
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
      panel().hidden = true; panel().replaceChildren();
      onReady(profile); return;
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
  onSignedOut();
  await client.auth.signOut({ scope: 'local' });
  signIn(message);
}

export async function startAuth(callbacks) {
  ({ onReady, onSignedOut } = callbacks);
  try {
    client = await getSupabase();
    const match = /^#\/activeren\?token=([^&]+)(?:&type=(invite|recovery))?$/.exec(location.hash);
    if (match) {
      const token = decodeURIComponent(match[1]);
      history.replaceState(null, '', location.pathname + location.search);
      const result = await client.auth.verifyOtp({ token_hash: token, type: match[2] || 'invite' });
      if (result.error) { signIn('De uitnodiging is ongeldig of verlopen. Vraag je beheerder om een nieuwe uitnodiging.'); return; }
      await continueLogin();
    } else signIn();
    // Refresh blijft in geheugen. Geen tokens of profielen in localStorage/sessionStorage.
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { onSignedOut(); signIn(); }
    });
  } catch {
    screen('Inloggen niet beschikbaar', 'De beveiligde accountdienst is nog niet volledig aangesloten. Er wordt geen toegang verleend. Probeer het later opnieuw.', [], 'Opnieuw proberen', () => location.reload());
  }
}
