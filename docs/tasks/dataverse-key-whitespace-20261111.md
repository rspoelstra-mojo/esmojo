# Randspaties in geïmporteerde show-sleutel

Eigenaar Codex. Branch task/dataverse-key-whitespace-20261111.
Live diagnose bevestigt11 zichtbare rijen,11 exacte bibliotheekmatches,0 exacte
showmatches en11 matches na trimmen. Geen rechtenprobleem.
Leesadapter accepteert uitsluitend de exacte pilotsleutel na verwijderen van
randspaties. Vaste bibliotheekfilter blijft verplicht; contains is een beperkte
servervoorselectie, nooit de uiteindelijke showkoppeling. Geen Dataverse-writes,
herimport of aanpassing van bronbestanden. Test ook gelijkende andere shows.

Controle:57 servertests groen, inclusief elf resultaten met tab/spatie/CRLF en
uitsluiting van gelijkende shows. Chromium-controle en productiebuild groen.
Geen opgeslagen gegevens gewijzigd. Diagnose van live gebruikersproef staat los
van de offline regressietests; vernieuw na uitrol de showcontext volledig.
