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
