# Keuzelijsten automatisch aanmaken
Eigenaar Codex; branch task/dataverse-choice-setup-20261112.
Gebruiker autoriseert setupknop op bestaande Beheerder > Datatransitie.
Uitsluitend 24 vaste globale keuzes uit het vastgestelde Shows-schema.
Bestaande lokale Opruimstatus, tabellen en bedrijfsgegevens blijven ongemoeid.
Bestaande opties exact vergelijken; geen updates/deletes van afwijkende lijsten.
Oplossing ESMOJO/publisher esmojo controleren; smalle metadata-aanmaak/publicatie,
terugleescontrole en hervatbare verwerking achter huidige admin/Shows/MFA.

Gebouwd: vijfde knop op Datatransitie, begrensde serverroute, 24 vaste definities,
solution-/taalcontrole, exacte match, smalle publicatie en bevestigde readback.
77 servertests geslaagd, waaronder alle 24 creaties/herhaling, conflicten,
403/500, races, gedeeltelijke publicatie en admin/Shows/MFA. Chromium test
knop, dubbelklikken, alle 24 resultaten, conflict, fout/hervatten en mobiel.
Productiebuild/browserheaders/diffcheck geslaagd. Geen live metadata-setup uitgevoerd.
