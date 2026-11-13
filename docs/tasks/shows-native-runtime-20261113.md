# Native Shows-runtime en gecontroleerde omschakeling

Eigenaar huidige Codex-sessie. Branch task/shows-native-runtime-20261113.
Vervolg op geautoriseerde eindvalidatie en Shows-cutover; validatieworkflow
43386398613 loopt. Geen productie-omschakeling vóór eindresultaat en volledige
native route-dekking. Dit is een nieuwe runtimeimplementatie, geen bestaande flag.
Verwachte scope: native Dataverse-repository/adapters, typed reads/writes,
reserveringen, revisies, bijlagen/PDF-jobs, bronfreeze/laatste delta, workers,
pariteits-/autorisatie-/concurrencytests en beheer-runbook. Originele bronnen behouden.
Andere modules en Supabase Auth niet ongericht omschakelen. Geen persoonsgegevens,
broninhoud of credentials in Git/logs. Geen stille terugval of dubbele schrijvers.
