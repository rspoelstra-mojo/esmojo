# Artiest: gezamenlijke landing, stille rapporten en hele punten
Eigenaar huidige sessie; branch task/artist-loading-rounding-20261110.
Profiel en score parallel ophalen en samen publiceren, daarna rapportqueue starten.
Achtergrond geen zichtbare status/rondje op concertdatum; bij aangeklikt, niet klaar
rapport uitsluitend bestaande submenu-rondje bij actieve artiest. Behoud nieuwste-
eerst, klikprioriteit, annulering en foutafhandeling. Loader volgt menu-herbouw.
Rond getoonde componentpunten met Math.round; batterij en totaal zijn de som van
die getoonde punten. Berekening en classificatie blijven ongerond. Hele punten
hebben alleen betrekking op scorepresentatie; referenties houden drie decimalen.
Scope artiestpagina, profielstatus, beperkte CSS, presentatiehelper en tests.
Versie blijft V1.99.

40 gerichte Node-controles slagen. Nieuwe echte browserregressie bevestigt beide
volgordes van profiel/score, geen tussenlanding, gevulde afgeronde batterij bij
verschijnen, stille nieuwste-eerstqueue, klikprioriteit, submenu-only spinner,
cache/keuzewissel, retry, abort en late resultaten. Bestaande artiestbrowser en
build slagen. Score-refreshfout wist eerder geladen cijfers niet. Betrouwbaarheids-
informatie wordt uit de bestaande risicoservice doorgegeven. Geen formulewijziging.
