# Risico-overzicht en achtergrondopslag

Eigenaar: Codex, deze chat. Branch: task/risk-choice-queue-20261103.

Volgorde kaarten Zaalindeling, Operationele risico’s, Special effects zodat Special
effects op desktop onder Zaalindeling staat. Entreeproces eerst, gevolgd door
Barrieropstelling, Vloerdruk en Vluchtweg beperkingen. Exact gevraagde 24-uursmelding
bij ontbrekende operationele risico’s. Ja/Nee direct bedienbaar met seriële
achtergrondopslag, optimistische selectie, revisiecontrole, foutbehoud en veilige
herpoging. Wachtrij blijft in tijdelijk showgeheugen bij SPA-navigatie, wordt gewist
bij afmelden en gebruikt bestaande vertrouwelijke Drive-opslag. Geen nieuwe gegevens.

Verwachte bestanden: risico-UI, gedeelde configuratie plus gegenereerde kopie,
showcontext/wachtrij, relevante tests/workflow en websiteversie (V1.14).

Uitvoering: createProductionChoiceQueue in de bestaande showcontext; DOM-knoppen
blijven staan tijdens opslag, focus wordt niet verplaatst. Detailtoegang wacht
alleen op bevestiging van de eigen rij. Showcache wacht op de volledige wachtrij
bij terugkeer; afmelden annuleert resterende writes. De 24-uursmelding is een
UI-tekstwijziging, geen wijziging aan het analyseproces.

Verificatie: nieuwe wachtrijtests (snel klikken, revisies, fout/herpoging, verloren
antwoord, annuleren), showgeheugen- en UI-tests, productiebuild en browsercontrole
op 1280/1440/1920/2560/700/390px. Drie Ja/Nee-keuzes tijdens SPA-navigatie opgeslagen
met maximaal één gelijktijdige write; geen tweede show-open, geen overflow.
