# Native Reports-schrijflaag en operationele integratie

Eigenaar huidige Codex-sessie, branch task/reports-native-writes-20261115 vanaf
actuele main d1d459c. Vervolg op #172–#176 binnen de expliciet geautoriseerde
Rapportages-omschakeling. Andere uitvoering is door gebruiker gestopt.

Scope: Reports-only conditionele schrijftoegang, geverifieerde terugleescontrole,
mail/PDF/ontvangers en eerste openingsmomenten, native runtime en expliciete
CSV-aanlevergrens; gecontroleerde schrijfstop/activering alleen na volledige
dekking/eindvalidatie. Bestaande Shows-schema en authenticatie blijven gelijk.
Bestanden server/dataverse-reports, bestaande Reports-stores/workers, eventueel
Google Apps Script-brug plus afzonderlijke publicatie naar bestaande deployment.
Geen echte testmails/fictieve bedrijfsgegevens; originelen behouden.

Read-only productievalidatie is complete: 221 rapportages, 8517 records, 226 files,
bevestigd in achtergrondrun 43681649105. Dat is nog geen laatste controle onder
schrijfstop en geen runtime-omschakeling. Gebruiker doet de gebruikerstest later.

Implementatie in uitvoering: Reports-only CAS met volledige terugleescontrole,
private PDF/mailarchiefreads, eerste opening, ontvangerselectie inclusief leeg,
versleuteld technisch schrijfslot met blijvende onzekerheidsfence, bestaande
mailreserveringen/bevestigingen zonder verzending en hervatbare datasetpublicatie.
Nog geen providerrouter of Apps Script-aanlevergrens/stop; dus geen activering.

De gebruikersinstructie van 15 november beperkt extra werk aan tijdelijke Google-
koppelingen; er zijn geen andere sitegebruikers/wijzigingen tijdens deze taak.
De brug blijft daarom uitsluitend CSV- en gedeelde MOJO-tijdschema-aanlevering,
naast de noodzakelijke schrijfstop. Accountprofielen/Auth en andere modules
houden hun bestaande autoriteit. De volledige Reports-router heeft geen Drive-
fallback na native activering. Artiesten krijgt uitsluitend KPI's/tijden, geen CSV.

Getest: 150 native/migratie/achtergrond-/OIDC-tests en 174 bestaande gerelateerde
tests lokaal geslaagd; rapport- en artiestweergave in Chrome op 390/1440 px,
licht/donker. Geen echte mails. V1.118 is de voorbereide publicatie; de aparte
cutoverworkflow heeft voorlopig alleen workflow_dispatch. Na Vercel én bestaande
Apps Script-deploymentcontrole volgt de daadwerkelijke vaste main-activatie.
