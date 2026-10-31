import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { createProfiles, validateProfile } from '../server/account-profiles.js';
import { sendEmail } from '../server/email.js';

// Eenmalig in een vertrouwde beheeromgeving uitvoeren. Geen publieke bootstraproute.
async function main() {
  for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'GOOGLE_DRIVE_SCRIPT_URL', 'GOOGLE_DRIVE_SHARED_SECRET', 'RESEND_API_KEY']) {
    if (!process.env[name]) throw new Error(`Configuratie ontbreekt: ${name}`);
  }
  const prompt = createInterface({ input: stdin, output: stdout });
  let profile, email;
  try {
    email = (await prompt.question('E-mailadres eerste beheerder: ')).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ongeldig e-mailadres.');
    profile = validateProfile({ firstName: await prompt.question('Voornaam: '), lastName: await prompt.question('Achternaam: '), jobTitle: await prompt.question('Functie: '), role: 'beheerder' });
  } finally { prompt.close(); }
  await createProfiles()('bootstrap-check', 'operator');
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const created = await client.auth.admin.createUser({ email, email_confirm: false });
  if (created.error || !created.data?.user?.id) throw new Error('E-mailadres bestaat al of account aanmaken mislukt.');
  const id = created.data.user.id;
  const generated = await client.auth.admin.generateLink({ type: 'invite', email });
  if (generated.error || generated.data?.user?.id !== id || !generated.data?.properties?.hashed_token) {
    await client.auth.admin.deleteUser(id);
    throw new Error('Uitnodiging kon niet worden voorbereid.');
  }
  // Bootstrap weigert zodra er ook maar één profiel bestaat. Niet herhalen als resetmethode.
  await createProfiles()('bootstrap', id, { profile: { ...profile, id, email } });
  const link = `https://esmojo.nl/#/activeren?token=${encodeURIComponent(generated.data.properties.hashed_token)}`;
  await sendEmail({ to: email, subject: 'Stel je ESMOJO-beheerdersaccount in', text: `Stel via deze eenmalige link je wachtwoord en authenticator in:\n\n${link}` });
  console.log('Eerste beheerder geregistreerd en uitnodiging verzonden. Rond de activatie af via de e-mail.');
}
main().catch(() => { console.error('Bootstrap niet voltooid. Controleer configuratie en of er al een beheerder bestaat. Er zijn geen geheimen of persoonsgegevens gelogd.'); process.exitCode = 1; });
