# Verplichte login en accountbeheer

Eigenaar: account A. Branch: task/account-a-auth-accounts-20261031.
Status: in uitvoering.

Scope: verplichte login met TOTP, alleen beheerders mogen accounts beheren,
Accounts-submenu met tabel en aanmaken/bewerken/verwijderen. Raakt src/main.js,
index.html, nieuwe auth/accountmodules, serverfuncties en Apps Script.
Geen werk aan de afzonderlijke Homepage-inhoud van account B.

Gebruiker heeft bevestigd: accountprofielen zijn vertrouwelijk en blijven in
Google Drive. Supabase Auth mag als expliciete uitzondering e-mailadres,
wachtwoordbeveiliging en tweede factor beheren. Geen profielgegevens of foto's
in Supabase, logs of persistente browseropslag.

Nog te controleren: beschikbare Vercel-serverconfiguratie, Supabase Auth-beheer,
eerste beheerder en echte integratietest. Geen actieve loginclaim zonder bewijs.
