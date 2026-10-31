// Alleen handmatig door een bevoegde scriptbeheerder uitvoeren in de Google-editor.
// Geen publieke route, geen persoonsgegevens in Git of uitvoeringslogs.
function setupFirstAdministrator() {
  const properties = PropertiesService.getScriptProperties();
  const raw = properties.getProperty('ESMOJO_FIRST_ADMIN_PROFILE');
  const secret = properties.getProperty('ESMOJO_SHARED_SECRET');
  if (!raw || raw.length > 4096 || !secret || secret.length < 32) {
    throw new Error('Controleer ESMOJO_FIRST_ADMIN_PROFILE en de bestaande verbindingsinstelling.');
  }
  let profile;
  try { profile = JSON.parse(raw); } catch (_) { throw new Error('De profielinstelling bevat geen geldige JSON.'); }
  const body = JSON.stringify({ operation: 'bootstrap', actor: 'script-operator', profile: {
    id: profile.id, email: profile.email, firstName: profile.firstName,
    lastName: profile.lastName, jobTitle: profile.jobTitle, role: 'beheerder',
  } });
  const timestamp = Date.now();
  const nonce = Utilities.getUuid().replace(/-/g, '');
  const hex = bytes => bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
  const digest = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, body, Utilities.Charset.UTF_8));
  const signature = hex(Utilities.computeHmacSha256Signature('accounts\n' + timestamp + '\n' + nonce + '\n' + digest, secret, Utilities.Charset.UTF_8));
  const response = JSON.parse(esmojoAccounts_({ body, timestamp, nonce, signature }).getContent());
  if (!response.ok) {
    throw new Error(response.code === 'CONFLICT' ? 'Er bestaat al een accountregister. Er is niets overschreven.' : 'Profiel niet gekoppeld. Controleer profielvelden en Drive-schrijftoegang.');
  }
  properties.deleteProperty('ESMOJO_FIRST_ADMIN_PROFILE');
  console.log('Eerste beheerdersprofiel gekoppeld. Authenticator en wachtwoord moeten nog in de applicatie worden bevestigd.');
}
