# Toegang en MFA aanscherpen vóór externe beveiligingstest

Eigenaar: Codex (account B). Branch: `task/security-access-hardening-20261118`.

Gebruiker vraagt de website en gegevens te beschermen tegen toegang zonder
account of geldige tweede factor. Onderzoek actuele serverautorisatie, sessies,
MFA, publieke routes en downloads. Herstel bewezen zwaktes, voeg gerichte
negatieve regressietests toe en publiceer via de bestaande GitHub/Vercel-route.
Geen garantie van onhackbaarheid; lokale tests en live bewijs apart rapporteren.

Verwachte bestanden: `server/mfa-cookie.js`, `server/session-cookie.js`,
`server/accounts-api.js`, bijbehorende beveiligings-/sessietests,
`docs/mfa-beveiliging.md`, eventuele afzonderlijke beveiligingscheck onder
`tools/security/`, websiteversie en deze notitie. Diensten: bestaande Supabase
Auth en Dataverse behouden, geen schema-/sleutelwijziging of testmails.

Eerste bevinding: de bewaarde sessie verving het app-MFA-bewijs op alleen
account-ID. Bind nieuwe cookies aan de geverifieerde Auth-sessie. Oude cookies
mogen uitsluitend via echte refresh-verificatie worden opgewaardeerd; nooit als
algemeen bewijs voor een andere bearer-sessie. Behoud de absolute 72-uursgrens.

Andere open PR's raken showbewerkformulieren en CSV-concertkoppeling; geen
overlap met sessie-/MFA-bestanden vastgesteld bij start. De gebruiker is gevraagd
naar infrastructuurbeheerrechten en de bestaande externe Showbeheer-uitzondering.
