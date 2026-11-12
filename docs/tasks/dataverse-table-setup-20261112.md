# Tabellen automatisch voorbereiden
Eigenaar Codex; branch task/dataverse-table-setup-20261112.
Gebruiker autoriseert op Datatransitie dezelfde setup als geslaagde keuzelijsten,
nu voor alle tabellen/kolommen/relaties/sleutels uit het vastgestelde Shows-schema.
29 nieuwe tabellen + behoud bestaande onderzoekstabel, alleen optionele lookup daar.
Vaste allowlist, admin/Shows/MFA, solution/prefix/taalcheck; alleen ontbrekende
metadata aanmaken. Geen wijzigingen aan afwijkende definities of bedrijfsrecords.
Asynchrone sleutelindexen pas bevestigd bij Active; hervatbare verwerking.

Gebouwd: zesde knop op Datatransitie met 564 vaste stappen, 29 nieuwe tabellen,
339 overige scalar-kolommen, 89 relaties, 30 gerichte publicaties, 52 sleutels.
Alle native typen inclusief File128MiB, DateOnly en decimal10; getaldefaults zijn
appstandaarden (schema verduidelijkt). Bestaande onderzoekstabel/inhoud beschermd.
Gedeelde metadata-verbinding geëxtraheerd; oude keuzelijstsetup blijft getest.
Validatie: 87 servertests, waaronder volledige aanmaak+herhaling en conflicten,
partial failure, geen businessendpointwrites, publicatie alleen na servervalidatie,
pending indexen. Chromium: zesde knop, onderbreking/hervatten, conflict-stop,
indexpolling en mobiel. Build/browserheaders. Geen live tabelsetup uitgevoerd.
