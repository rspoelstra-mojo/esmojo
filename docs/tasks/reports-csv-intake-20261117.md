# CSV-rapportageontvangst via Power Automate

Eigenaar: Codex. Branch: task/reports-csv-intake-20261117.

De gebruiker levert CSV's uit een SharePoint-map met Power Automate aan in een nieuwe Dataverse-ontvangsttabel. ESMOJO moet de oorspronkelijke bytes met de bestaande parser verwerken naar de bestaande rapportagetabellen en de centrale concertcatalogus gebruiken. Bestandsnaam: incidents_<artiest>_<locatie>_DDMMYYYY[_s1|_s2].csv; bij ontbrekende of dubbelzinnige match niet publiceren. Bestaande rapportages/weergave, bronversies, lees- en toegangsgrenzen behouden.

Onderzoeken en bouwen: beveiligde Datatransitie-inrichtingsknop voor ontvangsttabel/File en minimale rechten voor de flow; contract voor upload, gecontroleerde gereedmelding, identiteits- en versiecontrole, herstel en idempotentie; veilige verwerking met bestaande native rapportagewriter/parser en atomische publicatie; geen dubbele mails of fictieve productiedata. Daarbij exacte Power Automate-stappen documenteren. Geen wijzigingen aan authenticatie, andere modules of Google-integraties.

Voor implementatie actuele AGENTS.md, samenwerking, schema, Reports-runtime, achtergrondtaken, taaknotities en open PR's controleren. Scope raakt Dataverse-schema/setup, Reports-runtime, workers en Datatransitie; controleer overlap vlak voor wijzigingen. Pas na tests, gecontroleerde uitrol en daadwerkelijke verificatie als voltooid melden.
