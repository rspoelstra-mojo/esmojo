# Risico-PDF per beheersmaatregel

Op de maatregelpagina staat onder Meenemen in briefing een blok Exporteren met de knop PDF exporteren.

**Inhoud (één PDF per risico)**: blauwe kop met de risicotitel en daaronder `artiest - datum(s) - zaal, stad`; kaarten Risico (omschrijving, gewone tekst), Mogelijk
gevolg (alleen operationele risico's), Beheersmaatregel; twee kleurvakken Risicoklasse vóór en na de maatregel (na = Nog niet
beoordeeld zolang de maatregel niet is geïmplementeerd). Voet en watermerk volgen het Showprofiel-PDF, inclusief de
vertrouwelijkheidsregel. Lange teksten lopen door naar een volgende pagina, zonder inkorten.

**Techniek**: browser -> `measure-pdf` (Shows-module, MFA) -> `risk-measure-export` (native regels, alleen lezen) ->
`server/risk-pdf/render.js` (pdf-lib, fonts/watermerk uit server/report-original/assets) -> base64 naar de browser, daar
tijdelijke blob-download. Niets wordt opgeslagen. Maximaal 2 MiB. Opmaakversie `risico-v1`.

**Beperkingen**: alleen risico's met een beheersmaatregel (Midden/Hoog); geen bewaarde versies; de PDF toont de actuele
bevestigde gegevens op het moment van exporteren.

Opsommingen in de beheersmaatregel (regels die met •, -, * of – beginnen) worden als opsomming met ingesprongen regels getoond.

Opgemaakte tekst (vet, onderstreept, opsomming, nummering) uit de rich text editor wordt in de PDF getoond: vet in het kopfont, onderstreping als lijn, opsommingen met blauwe punten en genummerde stappen met ingesprongen vervolgregels. Een maatregel zonder uitgewerkte tekst toont Nog niet uitgewerkt.
