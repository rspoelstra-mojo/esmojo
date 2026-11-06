# Show-open zonder dubbele Drive-laadrondes

Eigenaar Codex; vervolg op PR #106. Branch task/show-open-load-20261106.

Bevestigde regressie: nieuwe actieve show doet export, eigenaarschaps-export en
virtuele show-open achter elkaar; bestaande actieve show bouwt na de bundel nog
opnieuw een snapshot. Canonieke target wordt tweemaal opgehaald.

Combineer bij eerste opening de atomische overname en volledige bundel in één
signed Drive-call. Hergebruik de reeds geladen bundel bij snapshotprojectie en
cache filelookups/blobs uitsluitend gedurende dezelfde read. Iedere write wist
zijn readcache vóór verplichte echte readback. Geen nieuwe persistente cache,
geen toegang-/bron-/revisiecontrole overslaan. Geen ander uiterlijk of gedrag.

Scope server-adapter, Apps Script readpad, gerichte request-/readcounttests en
bestaande regressie-/browsertests. Geen SQL, mail of gegevensclassificatie wijzigen.

Aanvullend gebruikerssignaal: Afrondstatus laden-melding na opslaan showprofiel.
Statusreads uit gecommitteerde DB-snapshot nemen geen opslaglease. Alleen een
geaccepteerde echte serverbevestiging met volledige status wist de oudere fout;
lokale editor-sync of een achterhaalde respons doet dat niet. Browserfault-test
met Man/vrouw verhouding controleert dit zonder de echte leesfout te verbergen.
