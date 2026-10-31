# Accounts, login en verplichte TOTP

## Gegevens en toegang

Gebruiker heeft bevestigd: profielvelden en foto zijn vertrouwelijk en blijven
in Google Drive. Supabase Auth mag e-mailadres, wachtwoordbeveiliging en TOTP
beheren. Resend mag e-mailadres en activatielink verwerken voor uitnodigingen.
Wachtwoorden en TOTP-secrets komen niet in Drive of profielen terecht.

De browser bewaart de Supabase-sessie alleen in geheugen. Opnieuw laden vraagt
opnieuw inloggen. Er is geen openbare registratie. Een uitnodiging geeft eerst
alleen toegang tot het instellen van de authenticator en het eigen wachtwoord.
Pas een geactiveerd profiel plus een door Supabase geverifieerd `aal2`-token
geeft applicatietoegang. Iedere beschermde API-aanroep controleert dit opnieuw.
Drive controleert de actuele rol; Supabase-gebruikersmetadata verleent geen rechten.
Een beheerder kan zichzelf niet verwijderen of degraderen. Verwijderen blokkeert
eerst het profiel en verwijdert daarna de Supabase-identiteit.

## Benodigde configuratie, zonder geheimen te delen

In Vercel Production en een aparte testomgeving:

- Bestaande `VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY` behouden.
- **Nieuw:** `SUPABASE_SECRET_KEY`, uitsluitend server-side: Supabase-project
  → Settings → API Keys → Secret key (nooit `VITE_` of in chat/code).
- Bestaande `GOOGLE_DRIVE_SCRIPT_URL`, `GOOGLE_DRIVE_SHARED_SECRET` en
  `RESEND_API_KEY` behouden.
- Optioneel `APP_ORIGIN` voor de exacte HTTPS-origin van een testdeployment.
  Productie-uitnodigingen gebruiken altijd https://esmojo.nl.

Supabase Auth-instellingen: publieke registratie uitschakelen, TOTP inschakelen
(6 cijfers, 30 seconden), Site URL https://esmojo.nl. Behoud rate limiting en
passende wachtwoordbeveiliging; minimaal 12 tekens in de ESMOJO-activering.
Er zijn geen Supabase-profieltabellen of Storage-buckets nodig.
Voeg voor latere Supabase-datatoegang RLS toe die minstens `aal2` afdwingt;
deze implementatie geeft geen anonieme toegang tot tabellen.

Apps Script moet de nieuwe `Accounts.gs` en bijgewerkte `Code.gs` bevatten.
Publicatie via de bestaande GitHub Actions-workflow behoudt manifest,
deployment-ID, URL en Script Properties. Controleer of de bestaande OAuth-scopes
Drive-schrijven toestaan: zo nodig moet de eigenaar de nieuwe scope autoriseren.
De bestaande statuscheck alleen bewijst dit niet. Ondertekende accountverzoeken
binden ook de payload aan de HMAC. Schrijfoperaties gebruiken een lock en
opgeslagen nonces tegen herhaling. Het profielregister wordt als
`_esmojo_accounts_v1.json` in de bestaande beperkte map aangemaakt, nooit openbaar.
Foto's worden klein opgeslagen in dit register; dit is bedoeld voor een beperkt
intern accountbestand en geen algemene Drive-bestandsinterface.

## Eerste beheerder

Het e-mailadres is door de gebruiker opgegeven in de chat; bewaar het niet in Git.
Voer in een vertrouwde beheeromgeving met bovenstaande servervariabelen uit:

```sh
npm ci
node tools/bootstrap-account.mjs
```

Het script vraagt alleen e-mailadres, voornaam, achternaam en functie via stdin,
nooit een wachtwoord of secrets. Het maakt uitsluitend de eerste beheerder aan
wanneer het Drive-register nog leeg is. Er is geen publieke bootstraproute.
De beheerder ontvangt een uitnodiging, koppelt een authenticator, bevestigt een
code en kiest een eigen wachtwoord. Daarna opnieuw inloggen met wachtwoord en TOTP.
Vanaf Beheerder → Accounts kunnen volgende accounts worden aangemaakt.

Als een uitnodiging niet wordt verzonden, blijft het account zichtbaar als
uitgenodigd; een bestaande beheerder kan opnieuw uitnodigen. Bij een mislukte
allereerste uitnodiging moet een bevoegde operator via Supabase Auth een nieuwe
invite-link laten genereren en die via de goedgekeurde mailroute verzenden.
Gebruik bootstrap nooit om bestaande accounts te overschrijven.

Bij verlies van een authenticator is nog geen geautomatiseerde herstelroute
gebouwd. Laat een bevoegde beheerder eerst de identiteit langs een afgesproken
route bevestigen en herstel via Supabase-beheer. Ontgrendel nooit op basis van
alleen een e-mailadres of maak een tijdelijke MFA-bypass.

## Verplichte live acceptatie vóór productieactivering

1. Apps Script-publicatie slaagt en het privéregister kan gelezen/geschreven worden.
2. Eerste beheerder ontvangt de echte uitnodigingsmail en activeert met TOTP.
3. Zonder sessie, met alleen wachtwoord of als nog niet geactiveerde gebruiker
   worden accountgegevens geweigerd. Een gewone gebruiker krijgt geen beheertoegang.
4. Accounts aanmaken, bewerken en verwijderen testen met een daarvoor bedoeld
   testaccount, inclusief onjuiste/verlopen TOTP-code en opnieuw inloggen.
5. Zelfverwijdering, laatste beheerder, herhaalde of gewijzigde Drive-verzoeken,
   verlopen sessies en een geblokkeerd account controleren.
6. Profielgegevens, mail-links en secrets ontbreken in logs en browseropslag.

Mocktests en een build bewijzen de live configuratie niet. Merge de verplichte
login niet ongecontroleerd naar productie: bij ontbrekende configuratie sluit
de login af en zou de website onbruikbaar worden. Laat de implementatie in de
draft PR totdat configuratie, bootstrap en live acceptatie mogelijk zijn.
