# Show volledig gereed tonen

Eigenaar: Codex. Branch: task/show-loading-20261103.

De gebruiker wil één laadmoment bij het kiezen van een show, met het bestaande
rondje in het submenu. Toon de show pas wanneer de gegevens voor showprofiel,
onderzoeken, tickets, risico's en productieonderdelen beschikbaar zijn. Hergebruik
gegevens tijdens navigatie binnen de geopende show, uitsluitend in geheugen.
Onderzoek en verminder dubbele Drive-verzoeken via de bestaande beveiligde route.
Behoud bestaande opslag, autorisatie, revisies en writes. Verwachte bestanden:
showpagina, showprofiel, risico-/detailmodules, PDF-widget, account-API, Apps Script,
laadcontroles en gerichte tests. Websiteversie V1.10.

## Uitvoering en controles

Eén HMAC-ondertekende show-open read met gedeelde mapresolutie; de bestaande
controllers bouwen buiten beeld en melden gereed vóór de DOM-wisseling. Eén
geheugencontext verzorgt hergebruik/invalidation van reads, zonder opslagwijziging.
De bestaande conceptwachtrij wordt bij heropenen opnieuw verbonden.

Tests: volledige bestaande suite geslaagd; negen gerichte nieuwe tests voor
bundel, cache, wachtrij en schermvoorbereiding. Chromium controleerde de echte
showpagina: één rondje, geen gedeeltelijke inhoud, alle tabjes/details zonder
extra initiële reads, late showwisseling en fout/herpoging. Geen productiedata
voor deze tests gebruikt. Technische beschrijving: docs/show-loading.md.
