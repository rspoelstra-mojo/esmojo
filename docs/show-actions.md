# Actielijst op het showoverzicht

Blok Actielijst (src/show-actions.js, rekenlaag src/lib/show-actions.js) toont een status en maximaal drie to-do's.

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
