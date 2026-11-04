# Maximaal vijf rapportdatumtabs

Eigenaar Codex, branch task/report-five-date-tabs-20261104. Rapportdatumtabs van
nieuwste naar oudste; maximaal vijf echte unieke showdatums. Bij minder shows
alleen beschikbare datums. Standaard nieuwste selecteren, zesde/oudere niet
bereikbaar via tabbediening en geen extra archiefbediening. Bestaande per-datum
rapportselectie, compacte header, modulebeveiliging en submenu behouden.
Scope web-tabselectie, gerichte tests/docs, V1.37. Geen diensten/dataopslagwijziging.

Uitgevoerd: reportTabDates selecteert unieke datums aflopend en neemt er maximaal
vijf. Renderer opent de nieuwste datum; bestaande tabcomponent krijgt uitsluitend
de zichtbare datums, zodat ook toetsenbordselectie geen zesde datum bereikt.
Controles: acht report-view tests incl. 0/1/2/6 unieke datums, duplicaten,
jaarovergang, oud archief en onveranderde invoer; build en diff-check geslaagd.
Chromium licht/donker 700/1440/1920 px: 1/2/6 shows, nieuwste default, correcte
per-datum dataset, End/ArrowRight begrensd tot vijf, oude datum rechts als die
binnen de vijf valt, geen opvulling/extra knop, gelijke headerhoogte/geen overflow.
Geen bron-/rechten-/opslagwijzigingen. Private browserfixture buiten Git.

Aanvullend verzoek: label Notitie in de individuele incidentenlijst wordt
Afhandeling. Alleen labelwijziging, bronveld Resolution Note/note blijft intact.
