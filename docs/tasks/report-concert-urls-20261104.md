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
