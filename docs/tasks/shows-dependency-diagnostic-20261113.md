# Gerichte diagnose ontbrekende relatie bij Shows-eindvalidatie

Eigenaar huidige Codex-sessie. Branch task/shows-dependency-diagnostic-20261113.
Geautoriseerde productie-activering stopt veilig op MIGRATION_DEPENDENCY na 21
shows. Voeg uitsluitend vaste schematabel/fasenaam toe aan veilige diagnostiek;
geen inhoud, identifiers of credentials. Bepaal daarmee de ontbrekende relatie en
herstel binnen de bestaande gecontroleerde cutover zonder controles te verzwakken.
Bestanden: migration writer, source validation, cutover en gerichte tests.
Diensten: bestaande GitHub/Vercel, read-only Dataverse bron/doelvergelijking.
