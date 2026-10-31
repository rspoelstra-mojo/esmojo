# Verplichte login en accountbeheer

Eigenaar: account A. Branch: task/account-a-auth-accounts-20261031.
Status: gereed voor de eerste live login en TOTP-activering via PR #3.
Gebruiker heeft de Supabase-instellingen uitgevoerd en de eerste identiteit
aangemaakt. Drive-schrijven en koppelen van het eerste beheerdersprofiel zijn
door de gebruiker met succesvolle uitvoeringsresultaten bevestigd.

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

Controles: productiebuild en 43 lokale tests geslaagd. Twee Chromium-flows met
nagebootste externe diensten controleren login, foutieve TOTP, accountaanmaak,
mobiel, activering/QR/wachtwoord en uitloggen. Dit bewijst geen live koppelingen.

Openstaand: eerste echte login met TOTP en accountaanmaak via de website testen.
De gebruiker meldt SUPABASE_SECRET_KEY in Vercel te hebben ingesteld; de
serverconfiguratie wordt na deployment met een ongeauthenticeerd verzoek
gecontroleerd. Zie docs/accounts-inrichten.md. Er is nog geen echte
uitnodigingsmail vanuit accountbeheer verzonden.
