# Gecontroleerde Shows-omschakeling

Eigenaar huidige Codex-sessie. Branch task/shows-dataverse-cutover-20261113.
Gebruiker autoriseert expliciet publicatie én activering van de volledige Shows-
omgeving op Dataverse. Andere modules en Supabase Auth behouden hun bestaande
rechten-/authenticatiebron; geen concertbronnen verwijderen. PR148 wordt eerst
uitgerold; daarna native runtimebewijs, bronfreeze, eindvalidatie/laatste delta,
planning/catalogusinitialisatie en één gedeelde bronautoriteit voor alle Shows-
lees-/schrijfpaden. Geen fictieve zakelijke testgegevens of mails.

Verwachte scope: cutovercoördinator en beperkte main/OIDC-workflow, legacy-
schrijfstop/drain, technische checkpoints en daadwerkelijke validatiestatus,
provideractivering voor API/MCP/workers, relevante tests en beheerhandleiding.
Geen productiesleutels, gegevensinhoud of persoonlijke accountinformatie in Git/logs.
