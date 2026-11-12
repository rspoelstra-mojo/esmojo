# Herstel migratie van de vaste superbeheerder
Eigenaar Codex; branch task/migration-superadmin-role-20261112.
Gebruiker meldt MIGRATION_MAPPING direct na bevestigde schemafase, vóór records.
Codeoorzaak: bronrol superbeheerder wordt direct vertaald via medewerkerrol, die
volgens afgesproken schema alleen gebruiker/beheerder kent. Vertaal uitsluitend
de vaste register-superbeheerder naar de gewone Dataverse-rol beheerder. Bewaar
bronrol in Historie, behoud bestaande superbeleid/Auth/rollen/keuzelijsten.
Geen automatische live migratie. Gerichte regressietests en veilige diagnose.
