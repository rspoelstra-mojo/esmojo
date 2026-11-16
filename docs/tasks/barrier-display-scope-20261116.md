# Voorbereide afbeeldingen: bestaande unieke scope-index respecteren

Eigenaar account B. Branch task/barrier-display-scope-20261116 vanaf actuele main.
PR198 productievoorbereiding gestopt DATAVERSE_SHOWS_CONFLICT bij production-prepare. Diagnose actueel schema: bestaande alternatekey (integratiecode,scopecode) laat slechts1deel per scope toe. Geen schemawijziging of bronreparatie. Geef elk afgeleid deel/root eigen scope met vaste groepsprefix; hervat door bestaande geverifieerde delen idempotent te hergebruiken. Test echte alternatekeyconflicten in fixture. Publiceer, bereid alle5beelden voor en verifieer koude snelle reads onafhankelijk. Originelen behouden, geen zakelijke writes/mails.
