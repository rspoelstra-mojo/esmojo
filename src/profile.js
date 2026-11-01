import { access, logout } from './auth.js';
import { cropPhoto } from './photo-crop.js';

export function renderAvatar(container, profile) {
  container.replaceChildren();
  if (profile.photo) {
    const image = document.createElement('img'); image.src = profile.photo; image.alt = ''; image.width = 96; image.height = 96; container.append(image);
  } else container.textContent = profile.firstName.charAt(0).toUpperCase();
}

export function createProfileView(container, profile, onChange) {
  let disposed = false;
  const controller = new AbortController();
  const view = document.createElement('section'); view.className = 'profile-view';
  const title = document.createElement('h1'); title.textContent = 'Accountinstellingen';
  const photoRow = document.createElement('div'); photoRow.className = 'profile-photo-row';
  const preview = document.createElement('div'); preview.className = 'profile-photo'; preview.setAttribute('aria-label', 'Huidige profielfoto'); renderAvatar(preview, profile);
  const choose = document.createElement('label'); choose.className = 'secondary-button photo-picker';
  const label = document.createElement('span'); label.textContent = profile.photo ? 'Profielfoto wijzigen' : 'Profielfoto toevoegen';
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.className = 'visually-hidden';
  choose.append(label, input); photoRow.append(preview, choose);
  const details = document.createElement('dl'); details.className = 'profile-details';
  for (const [caption, text] of [['Voornaam', profile.firstName], ['Achternaam', profile.lastName], ['E-mailadres', profile.email], ['Functie', profile.jobTitle], ['Rol', profile.role === 'beheerder' ? 'Beheerder' : 'Gebruiker']]) {
    const item = document.createElement('div'), term = document.createElement('dt'), value = document.createElement('dd');
    term.textContent = caption; value.textContent = text; item.append(term, value); details.append(item);
  }
  const note = document.createElement('p'); note.className = 'account-notice'; note.textContent = 'Je kunt deze gegevens hier bekijken. Neem voor wijzigingen contact op met een beheerder.';
  const message = document.createElement('p'); message.setAttribute('role', 'status'); message.className = 'account-notice';
  const signout = document.createElement('button'); signout.className = 'secondary-button'; signout.textContent = 'Uitloggen'; signout.addEventListener('click', () => logout());
  view.append(title, photoRow, message, details, note, signout); container.replaceChildren(view);
  input.addEventListener('change', async () => {
    const file = input.files[0]; if (!file) return;
    input.disabled = true; message.textContent = '';
    try {
      const photo = await cropPhoto(file, { signal: controller.signal });
      if (!photo || disposed) return;
      message.textContent = 'Profielfoto opslaan…';
      const result = await access('photo', { method: 'PATCH', body: { photo } });
      onChange(result.profile);
      if (disposed) return;
      profile = result.profile; renderAvatar(preview, profile);
      label.textContent = 'Profielfoto wijzigen'; message.textContent = 'Je profielfoto is opgeslagen.';
    } catch (error) { if (!disposed) message.textContent = error.message; }
    finally { input.value = ''; input.disabled = false; }
  });
  return () => { disposed = true; controller.abort(); view.replaceChildren(); };
}
