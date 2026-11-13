# Rapportages: Dataverse-schema en één beveiligde setupknop

Eigenaar huidige Codex-sessie. Branch task/reports-dataverse-schema-20261113.
Gebruiker vraagt de huidige Rapportages-module zorgvuldig naar een uitbreidbaar
Dataverse-model te vertalen en één beheerknop te bouwen die keuzelijsten,
tabellen, kolommen, relaties en sleutels voorbereidt en controleert. Nog geen
rapportimport, geen gegevenskopie, geen provideromschakeling of verzending.

Inventariseer de bestaande web-/PDF-bronnen, CSV-contracten, historische TSC- en
OnTrack-gegevens, datum/uitvoering, bronvalidatie, context en afhankelijke mail-
registraties. Hergebruik bestaande concert-/artiest-/locatie-/Document File- en
technische tabellen zonder het actieve Shows-schemacontract te veranderen.
Nieuw schema onder docs/dataverse/reports-schema.json; serverallowlist, beveiligde
setupactie en fluid beheerkaart. Bestaande classificaties blijven behouden;
alleen metadata-setup op bewuste beheerderklik. Geen productie-CSV/incidenten in
Git, logs, fixtures of browseropslag. Bouw/test/publiceer via normale PR/CI.
