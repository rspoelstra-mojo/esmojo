# Dataverse verbindingstest

Eigenaar Codex, task/dataverse-connection-test-20261110.
Gebruiker heeft stap voor stap vier DATAVERSE_TEST_* variabelen in Vercel
Production ingesteld en vraagt de verbinding te testen. Alleen tokenaanvraag
en GET WhoAmI, geen tabellen, echte records, migratie of opslagwijziging.
Scope: beperkte serverdienst, huidige account/MFA/admin-API, directe beheertest-
pagina, tests. Bestaande opslag en accountbeveiliging blijven behouden.
Geen Microsoft-token, clientgeheim, ruwe providerrespons of WhoAmI-ID in logs,
responses, browseropslag of Git. Alleen vaste diagnosecodes en stapstatussen.
Website blijft V1.99 zonder expliciete toestemming voor een hoofdversiesprong.
PR API ontbreekt; taakbranch als gedeelde registratie.
