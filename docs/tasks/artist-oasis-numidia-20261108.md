# Oasis en Numidia: leesbare artiestnamen

Eigenaar: Codex. Branch: task/artist-oasis-numidia-20261108.
Corrigeer Oasis LIVE '17/'27 en Numidia - Muziekfeest van het Jaar in de gedeelde
naamweergave. Behoud brongegevens, technische IDs/klikretries en statistieken.
Behoud ook bestaande leesbare links met de oude toevoeging wanneer ondubbelzinnig.
Scope: shared/artist-names.js, gerichte regressies, documentatie en websiteversie.
Geen nieuwe gegevens, diensten, afhankelijkheden of opslagroute.

Uitvoering: gedeelde herkenning voor LIVE + twee-/viercijferig jaartal, met rechte
of typografische apostrof. Oasis krijgt de bevestigde schrijfwijze; de specifieke
Numidia-evenementtitel wordt via een bevestigde naamregel verwijderd. Echte
artiestnamen en onduidelijke toevoegingen blijven behouden.
Oude technische IDs en ondubbelzinnige oude naamroutes blijven resolveerbaar;
canonieke routes van bestaande andere artiesten krijgen voorrang.

Validatie: build en diff-check; 17 naam-/route-, service- en cachetests slagen.
Browserfixtures op 390/1440px in licht/donker controleren onmiddellijk opgeschoonde
cached namen, /oasis en /numidia, oude naamroutes naar nieuwe URL zonder extra
klikpunten, bestaand retrygedrag, laadstatus en cachewhitelist. Geen productiekliks.
