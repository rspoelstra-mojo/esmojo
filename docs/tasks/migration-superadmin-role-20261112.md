# Herstel migratie van de vaste superbeheerder
Eigenaar Codex; branch task/migration-superadmin-role-20261112.
Gebruiker meldt MIGRATION_MAPPING direct na bevestigde schemafase, vóór records.
Codeoorzaak: bronrol superbeheerder wordt direct vertaald via medewerkerrol, die
volgens afgesproken schema alleen gebruiker/beheerder kent. Vertaal uitsluitend
de vaste register-superbeheerder naar de gewone Dataverse-rol beheerder. Bewaar
bronrol in Historie, behoud bestaande superbeleid/Auth/rollen/keuzelijsten.
Geen automatische live migratie. Gerichte regressietests en veilige diagnose.

Gevonden en hersteld: directe choice('medewerkerrol','superbeheerder') faalde vóór
alle writes. Export bevat nu ook de vaste superAdminId (uitsluitend server-side).
Alleen een overeenkomende bronrol wordt naar beheerder vertaald; afwijkende of
ontbrekende vaste identiteit blokkeert. Historie bewaart oorspronkelijke rol en
beleidsherkomst. Geen aanpassing van bronregister, rechten, Auth of keuzes.
Regressie bevat precies deze bronrol, onbekende vaste ID, bronbehoud en export
zonder registersecrets. Bestaande migratie-/API-/accountbeleidtests, browser,
ES2020-/publicatiecontroles, build en headers gecontroleerd. Live native import
blijft door gebruiker gestart; status van laatste vier indexen bevestigd door
gebruikersscreenshot ('Schema bevestigd').
