# Verplichte login en accountbeheer

Eigenaar: account A. Branch: task/account-a-auth-accounts-20261031.
Status: implementatie op draft PR #3; live activering geblokkeerd door ontbrekende
beheerconfiguratie en nog uit te voeren eerste-beheerder-/integratietest.

Scope: verplichte login met TOTP, alleen beheerders mogen accounts beheren,
Accounts-submenu met tabel en aanmaken/bewerken/verwijderen. Raakt src/main.js,
index.html, nieuwe auth/accountmodules, serverfuncties en Apps Script.
Geen werk aan de afzonderlijke Homepage-inhoud van account B.

Gebruiker heeft bevestigd: accountprofielen zijn vertrouwelijk en blijven in
Google Drive. Supabase Auth mag als expliciete uitzondering e-mailadres,
wachtwoordbeveiliging en tweede factor beheren. Geen profielgegevens of foto's
in Supabase, logs of persistente browseropslag.

Gebouwd: loginpoort, TOTP-inschrijving en controle, eenmalige uitnodiging met
verplicht eigen wachtwoord, Accounts-tabel en aanmaken/bewerken/verwijderen,
servercontrole op Supabase-token én TOTP, Drive-rollen en profielregister,
bescherming tegen zelfverwijdering, herhaalde schrijfverzoeken en accounttoegang
na blokkering. Profielen blijven uit Supabase en persistente browseropslag.

Controles: productiebuild en 37 lokale tests geslaagd. Twee Chromium-flows met
nagebootste externe diensten controleren login, foutieve TOTP, accountaanmaak,
mobiel, activering/QR/wachtwoord en uitloggen. Dit bewijst geen live koppelingen.

Openstaand: SUPABASE_SECRET_KEY server-side beschikbaar maken, Supabase Auth
instellen, nieuwe Apps Script-accountopslag publiceren/autoriseren, eerste
beheerder aanmaken en live testen. Zie docs/accounts-inrichten.md. Niet naar
productie mergen zolang de verplichte login de bestaande site zou afsluiten
zonder bruikbaar beheerdersaccount. Er is geen echte uitnodigingsmail verzonden.
