# TSC-rapportage: kop zichtbaar, inhoud ontbreekt
Eigenaar huidige Codex-sessie. Branch task/tsc-report-render-20261110.
Onderzoek de renderer met echte TSC-responsestructuur en synthetische inhoud.
TSC-tijdschema heeft geen MOJO capturedAt; huidige caption formatteert undefined
als datum vóór de inhoud wordt toegevoegd. Bronbewuste caption, geen verzonnen
MOJO-ophaaldatum. Bestaande rapport-/telregels en importdata behouden. Gerichte
browserregressie inclusief TSC/MOJO, filters en mobiel, plus build en tests.
Versie blijft V1.99 vanwege bestaande grens op automatische verhoging naar V2.0.

Bewezen browserregressie vóór wijziging: TSC available zonder capturedAt geeft
Invalid time value en lege inhoud onder de kop. Bronbewuste caption herstelt dit.
Na wijziging slagen 16 browservarianten (4 bron/tijdgevallen × 2 breedtes × 2 thema's),
inclusief concrete broncijfers, incidentkaarten en filterbediening; 28 betrokken
Node-tests en build slagen. Geen wijziging/herimport van opgeslagen CSV's of tijden.
