# Dataverse testtabel lezen

Eigenaar Codex, task/dataverse-table-read-20261110.
Gebruiker bevestigt lege testtabel ESMOJO_SHOWS, logische naam crf9f_tabel1.
Breid bestaande beheerder/MFA-verbindingstest uit met expliciete knop voor
metadata en minimaal leesverzoek ($top=1, uitsluitend primary-ID, niet bewaren).
Geen schrijven, records, rollen, migratie of echte show-/incidentgegevens wijzigen.
Bestaande verbindingstest behouden. Alleen vaste codes en stapstatussen terug.
Scope server/dataverse-test, accountaction-validatie, bestaande testpagina en tests.
GitHub PR API niet beschikbaar; taakbranch als registratie. Website blijft V1.99.

Uitgevoerd: extra knop Testtabel lezen op bestaande directe beheerroute. Eerst
WhoAmI, daarna vaste EntityDefinitions-lookup. EntitySetName en PrimaryIdAttribute
gevalideerd; geen geraden meervoud en geen vrije URL/tabel uit de browser.
GET uitsluitend $select primary-ID en $top=1; antwoord niet bewaren/teruggeven.
Zes servicetests, account/MFA/admin/veldvalidatie, browser singleflight en vijf
resultaatstappen, build en diff-controle geslaagd. Werkelijke Dataverse-leesrechten
worden pas vastgesteld bij de volgende bewuste klik van de gebruiker.
