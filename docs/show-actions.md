# Planning en acties op het showoverzicht (V1.195)

Sinds V1.195 zijn Planning en Actielijst één blok (src/show-planning.js; rekenlaag src/lib/show-actions.js, `showPlanActions`).
Elke planningsstap toont eronder de openstaande to-do's van dat onderdeel; een afgeronde stap toont er geen. De status staat als één
rustige tekst rechtsboven (Op schema, Achter op schema in subtiel rood, Afgerond in groen). Profiel en risico's houden de samenvattende
regel boven drie acties; bij beheersmaatregelen toont het blok er drie en "Toon alle N" klapt de rest open (niets valt weg).
Rood wordt uitsluitend gebruikt voor "te laat" (tekst). De diepe links hieronder gelden ongewijzigd.
De losse Actielijst-kaart (src/show-actions.js) bestaat niet meer; `showActions` blijft het model achter de tests en de sortering.

## Oorspronkelijke beschrijving van de losse Actielijst

Blok Actielijst toonde een status en maximaal drie to-do's.

**Status** volgt de planning (showPagePlanning): Afgerond als alle drie de planningsstappen af zijn (profiel verzonden,
risico's beoordeeld, beheersmaatregelen afgerond), Achter op schema als een stap zijn deadline heeft gemist, anders Op schema.

**To-do's** (alleen acties die nu uitvoerbaar zijn):
- Showprofiel: analyse-onderwerpen die niet Afgerond zijn, Aantallen en herkomst, Bezoekers-/Artiestanalyse afronden (zodra die klaar is om
  af te ronden) en Showprofiel verzenden (alleen Gashouder, PDF gereed, nog niet verzonden). Tot en met drie losse regels, anders één regel
  "Nog meerdere openstaande analyses" naar het tabblad Showprofiel.
- Risico's: productionele beoordelingen en onbeantwoorde Ja/Nee-keuzes, en operationele risico's zonder geldige beoordeling; dezelfde
  maximaal-drie-logica ("Nog meerdere openstaande risico's").
- Beheersmaatregelen: iedere aangemaakte maatregel die niet is geïmplementeerd, als "[titel] nog niet afgerond". Geen maximum per onderdeel.

Boven drie to-do's sorteert de lijst op de planningsdeadline (profiel 30, risico's 7, maatregelen 1 dag voor de eerste show) en toont de eerste drie.

**Diepe links:** elke to-do is een gewone link `/shows/<sleutel>?tab=…` met één bestemming (`analysis`, `tickets`, `finalize`, `risk`,
`production`, `measure`, `send`; zie shared/show-navigation.js). Een gewone klik opent de pagina binnen de open show; een link in een nieuw
tabblad opent dezelfde bestemming bij het laden. Alleen presentatie op de bestaande showcontext: geen nieuwe opslag, API of rechten.
