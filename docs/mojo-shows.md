# MOJO → ESMOJO Shows

De openbare MOJO-agenda wordt dagelijks rond 12.00 Europe/Amsterdam gecontroleerd.
GitHub Actions start op 10:00 en 11:00 UTC; alleen de run in het Nederlandse
12-uur draait de import. Daardoor worden zomer- en wintertijd automatisch gevolgd.
GitHub garandeert geen uitvoering op de seconde: drukte kan de start vertragen.
`workflow_dispatch` biedt een handmatige eerste import of herstelrun.

De workflow vraagt een kortlevend GitHub OIDC-token aan. Vercel accepteert alleen
een geldig RS256-token van GitHub voor de vaste repository, main, workflow en
audience. Er is geen nieuwe gedeelde sleutel. Daarna haalt Vercel zelf de vaste
MOJO-agenda op; de aanroeper kan geen bron-URL's of gegevens aanbieden. Alle
paginering bij `query=Gashouder` wordt gevolgd. De lokale locatiefilter vereist
Gashouder én Amsterdam, ongeacht interpunctie. De agenda-h3 bevat de artiest;
de aparte tourbeschrijving van de concertpagina wordt niet als naam gebruikt.

Vandaag telt mee, einddatum niet: [vandaag, vandaag+365 dagen) voor import en
[vandaag, vandaag+90 dagen) voor het menu. Datums worden als Nederlandse
kalenderdagen behandeld, niet als blokken van 24 uur rond een zomertijdwissel.

## Drive-opslag

```text
ESMOJO/
  Productie/
    _esmojo_shows_v1.json     technische index, historie en laatste succesvolle import
    Artiestnaam/
      Artiestnaam_Gashouder_04112026/
        algemeen.json        één keer per reeks
        concert.json         eigen datum + verwijzing naar algemene map
      Artiestnaam_Gashouder_05112026/
        concert.json         eigen datum + dezelfde algemene verwijzing
```

Artiestnamen worden behouden, inclusief leestekens/diakritiek; spaties en
pad-/scheidingstekens worden alleen in concert-ID's koppeltekens. Bijvoorbeeld
`Jean-Michel-Jarre_Gashouder_06102027`. Bestaande artiestmappen worden
hoofdletterongevoelig hergebruikt. Ambigue dubbele mappen leiden tot een fout,
niet tot willekeurig kiezen. Concerten worden per artiest/datum ontdubbeld;
twee aparte sessies op dezelfde datum hebben in deze eerste opzet hetzelfde ID.

Apps Script controleert HMAC, tijdvenster, payload, replay en een script-lock.
Het behoudt alle bestaande mappen en andere documenten, ook bij afgelasting of
verwijdering uit MOJO. Alleen de actieve menu-index verandert. Herhalen maakt
geen dubbele mappen en ongewijzigde JSON-bestanden worden niet opnieuw geschreven.
Bij een storing blijft de laatst volledig gepubliceerde index beschikbaar;
gedeeltelijk gemaakte mappen worden bij herstel hergebruikt. Algemene informatie
blijft bij de eerste datum van de reeks nadat die datum voorbij is. Een later
toegevoegde eerdere datum verplaatst uitsluitend ons eigen algemeen.json.
Het automatisch samenvoegen van twee al bestaande reeksen wordt geweigerd:
voor de opslag van andere algemene documenten moet de gebruiker dan kiezen.

Nieuwe documentfuncties moeten de concertmap uit de index gebruiken voor
datumgebonden documenten, en generalFolderId voor algemene documenten. Vraag bij
twijfel over de bestemming. Vertrouwelijke toekomstige rapporten vallen niet
automatisch onder de classificatie Openbaar van deze openbare agendagegevens.

## Website en toegang

`GET /api/access?action=shows` geeft alleen artiestnamen binnen 90 dagen terug,
na dezelfde actieve-account-, sessie- en MFA-controle als andere gebruikersroutes.
Er is geen anonieme Drive-lees- of schrijfroute. Het submenu is alfabetisch,
zoekbaar via de bestaande zoekfunctie en bevat geen nieuwe pagina's. De browser
hergebruikt namen maximaal één minuut in geheugen, nooit in persistente opslag.
Laden gebruikt het bestaande submenu-rondje; de contentbox blijft leeg.

Controleer een import met de workflow `Import MOJO shows`; de response vermeldt
aantallen concerten, artiesten en nieuw aangemaakte mappen. Logs bevatten geen
profielen, tokens, Drive-ID's of documentinhoud. Een falende import maakt de
workflow rood; inspecteer de bronstructuur voordat je een parser aanpast.
