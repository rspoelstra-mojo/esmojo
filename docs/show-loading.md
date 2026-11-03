# Eén laadmoment bij openen van een show

Op verzoek van de gebruiker (3 november 2026) toont ESMOJO een gekozen show pas
wanneer de bestaande gegevens voor de pagina en haar tabjes beschikbaar zijn.
Tijdens laden blijft de contentbox leeg en draait het bestaande rondje in de
gekozen Shows-submenulink. De menu's blijven bereikbaar. De bestaande vormgeving
van de show en haar onderdelen is behouden.

## Beveiligde gezamenlijke read

`show-open` in de account-API gebruikt dezelfde geactiveerde account-, sessie-
en MFA-controle als de bestaande leesroutes. Alleen concertId is clientinvoer;
de server bepaalt de actor. Het bestaande HMAC-transport geeft dit door aan
`google-apps-script/ShowOpen.gs`. De Apps Script-lock en noncecontrole beschermen
ook deze route. De Drive-parentketen en canonieke show/reeksmap worden één keer
bepaald en intern hergebruikt door bestaande handlers.

De response omvat showprofiel met elf onderzoeken, afrondstatussen, handmatige
bezoekersgegevens, barrier-/vloerdrukbeoordeling, actueel risico-overzicht en
indien toepasselijk de PDF-status. Vloerdruk wordt volgens de bestaande Seated-
logica gesynchroniseerd vóór het productieoverzicht wordt gelezen. Daarmee
komen productierevisies in dezelfde response overeen.

Geen nieuwe opslagstructuur, classificatie, AI-research, bewerkreserveringen of
PDF-generatie in deze laadroute. Geen bestandsbytes, volledige historie of leases
in de bundel. De bestaande classificatie en Drive-opslag blijven gelden;
de response blijft private/no-store. De servertransportlimiet voor deze read
is 90 seconden, gelijk aan bestaande uitvoerige analyse-/risicoverzoeken.

## Scherm pas na voorbereiding

`src/show-page.js` haalt de bundel op en laadt de bestaande openbare artiestfoto
parallel. De foto wordt vóór invoegen gedecodeerd; een mislukte afbeelding blijft
verborgen (decode heeft een bovengrens van tien seconden). De show wordt buiten
de zichtbare contentbox opgebouwd. Pas na de gereedmeldingen van showprofiel en
risicoanalyse wordt de complete pagina in één DOM-wisseling ingevoegd.

Een fout levert een duidelijke herlaadknop, geen gedeeltelijk werkende show.
Navigatie ruimt het rondje en de voorbereide controllers op. Late antwoorden
mogen een nieuw gekozen show of andere pagina niet overschrijven.

## Gegevens hergebruiken

`src/lib/show-data.js` bewaart uitsluitend tijdens deze showweergave de geladen
leesgegevens in geheugen. De bestaande modules krijgen dezelfde requestfunctie;
reads voor tabjes, AI-details, bezoekersdata en productieonderdelen gebruiken die
snapshots. Er is geen nieuwe localStorage/sessionStorage/analytics/log-opslag.
Navigatie of afmelden ruimt de context op.

Writes, veldreserveringen, bijlagepreviews, downloads en daadwerkelijke PDF-
generatie blijven beveiligde serveracties. Nieuwe bevestigde resultaten vervangen
de relevante snapshots. Afhankelijke gegevens worden ongeldig bij wijzigingen;
een gewijzigde barrierkeuze bijvoorbeeld vereist actuele vloerdrukgegevens.
Productierevisies komen met beoordelingen terug zodat terugnavigatie geen extra
Drive-read vereist. Een onzekere write verwijdert de betrokken snapshots zodat
bewust opnieuw laden werkelijk de server raadpleegt. Een gedeeltelijke afrond-
response wordt nooit als een volledig showprofiel met onderzoeksinhoud gecachet.
De bestaande conceptwachtrij wordt bij heropenen aan de nieuwe context gebonden,
met behoud van concepten en lopende writes.

Bestaande gereed zijnde PDF's gebruiken vooraf geladen status. Er worden geen
PDF-bestanden vooraf gedownload. Werkelijke generatie blijft voortgang tonen;
mutaties, reserveringen en downloads kunnen vanzelfsprekend serverwerk vereisen.

## Controles

- `server/show-open.test.js`: ondertekende bundel, één mapresolutie, strikte invoer,
  consistente revisies, fail-closed, snapshots, invalidatie, PDF-status/download
  en het opnieuw verbinden van conceptwachtrijen.
- `server/show-page.test.js`: nog geen pagina vóór alle gereedmeldingen,
  submenu-rondje, navigatieraces, fouten en opruimen.
- Bestaande accounttests controleren ook show-open zonder authenticatie/MFA en
  weigeren een door de client meegegeven actor.
- Chromium met fictieve Drive-fixtures controleert beide echte controllers,
  directe toegang tot tabjes/AI/tickets/barrier/vloerdruk zonder extra leesverzoeken,
  herhaald openen van details, late showwisseling en herstel na een laadfout.
