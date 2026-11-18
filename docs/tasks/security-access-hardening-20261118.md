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

De read-only npm-audit meldt één kwetsbare productieafhankelijkheid met hoge
ernst: sharp 0.34.5, inclusief kwetsbare libvips/libheif/librsvg-afhankelijkheden.
Gerichte update naar gepatchte sharp 0.35.5; geen brede automatische audit-fix.
Extra scope: package.json/package-lock.json, website-instellingen, private
referentiebeelden en bestaande beeldverwerkingstests. Geen nieuwe diensten.

## Uitgevoerde controles vóór publicatie

- Nieuwe automatische poorttest: 62 action-takken × 13 negatieve sessietoestanden
  × 4 HTTP-methoden = 3224 geweigerde combinaties, zonder bedrijfsreads.
- Bestaande autorisatiematrix: 648 module/rol/API-combinaties; gerichte tests voor
  sessies, MFA, accounts, native account-/replayopslag, private downloads,
  Showbeheer, preview, OIDC en afgesloten integraties slagen.
- Browsercontrole voor activering/MFA en eenmalige linkuitgifte geslaagd;
  beeld-/vloerdrukcontrole apart uitgevoerd met de nieuwe sharp-versie.
- Build, CSP-/headercontrole en git diff --check geslaagd.
- Productieafhankelijkheden na update: npm audit --omit=dev meldt 0 bekende
  kwetsbaarheden (voorheen 1 met hoge ernst).
- Live nulmeting: 90 gecontroleerde aanvragen zonder credentials/ongeldig token
  worden conform verwacht geweigerd of leveren voor afgesloten routes 410 en
  private bronbestanden 404 op. Geen bedrijfsdata/accounts aangemaakt of mails.

Publicatie en controle ná deployment volgen via PR271; geen claim van een echte
ingelogde productie-MFA-test zonder een beschikbare geldige gebruikerssessie.
De bestaande geheime Showbeheer-link+PIN blijft een bewuste externe uitzondering
zolang de gebruiker de afzonderlijk gevraagde beleidswijziging niet bevestigt.
Infrastructuurbeheerrechten kunnen niet met de website-MFA worden tegengehouden;
de concrete rechten van de testende beheerder zijn nog niet vastgesteld.
