# Rapportages met concert-ID in URL

Eigenaar Codex, branch task/report-concert-urls-20261104. Gebruiker vraagt
/rapportages in plaats van /statistieken en het echte concert-ID in plaats van
alleen jungle. Bestaand privé rapportregister gelezen: Jungle_Ziggo-Dome_03112026.
Geen ID afleiden uit de CSV-bestandsnaam (die wijkt qua dag af). Canonieke route
/rapportages/Jungle_Ziggo-Dome_03112026; oude paden/bladwijzers doorverwijzen.

Scope: centrale routeconfig, router/navigatie, Vercel redirects/rewrites, module-
routecontrole met equivalente Drive-definitie, servermetadata, tests/docs en V1.33.
Behoud echte inhoud, vaste private bronadapter en alle Rapportages/MFA-controles.
Geen wijzigingen aan rapporten, accounts, CSV-worker of e-mailverzending.
Publiceren via bestaande PR/main/Apps Script-flow na gerichte checks.

Geïmplementeerd: gedeelde route-identiteit in shared/report-routes.js, navigatie
naar /rapportages/<concert-ID>, servermetadata met dezelfde key. History-router
normaliseert root, oude slugs/paden en hashbladwijzers met behoud van query’s.
Vercel stuurt oude directe URL’s permanent door en serveert nieuwe deep links via
de bestaande SPA. Beide oude/nieuwe rootnamen blijven beschermd door Reports.

Controles geslaagd: 4 routertests (init, klikken, geschiedenis, legacy/hash/query,
hostingregels), 3 module-/pariteitstests, 2 rapportadaptertests, 31 account-/module-
API-tests, 6 Apps Script-tests en 4 publicatietests. Build en diffcontrole geslaagd.
Geen rapportinhoud/bronbestand gewijzigd en geen mails verstuurd. Versie V1.33.
