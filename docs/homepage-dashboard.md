# Homepage planningdashboard

## Bronnen en afbakening

De aangeleverde overdracht bepaalt functionaliteit, de HTML bepaalt het uiterlijk.
De homepage `/` heeft uitsluitend het bestaande hoofdmenu en geen submenu.
De eigen `.home-*` componenten volgen het bestaande systeemthema: het lichte
schema uit de referentie en een donker schema in dezelfde kleuren als de site. De expliciet
gevraagde cqw-tekstverhoudingen zijn alleen op de linker concertkaarten toegepast.
Andere pagina's, lettergroottes en het hoofdmenu blijven ongewijzigd.

`_esmojo_shows_v1.json` in de bestaande Drive-map Productie is de bron. Het
canonieke Gashouder-ID is `gashouder` uit server/mojo-venues.js. Bestaande records
hebben geen apart zaal-ID: importvalidatie vereist exact Gashouder/Amsterdam.
De dashboardprojectie controleert diezelfde canonieke combinatie en geeft het
code-ID mee. OnTrack-concerten en hun aparte register worden nooit gebruikt.

De bestaande shows zijn reeksen, met generalConcertId als sleutel. Alle
reeksdatums blijven de deadlinebasis bepalen; active bepaalt welke groepen nog
actueel in de geïmporteerde catalogus staan. Verdwenen groepen worden niet als
actieve planning verzonnen. Onderliggende historie wordt niet gewijzigd.

De vijf linkerkaarten gebruiken canonieke reeksen, chronologisch op eerstvolgende
showdag, bekende tijd en stabiel reeks-ID. Alle echte dagen staan samen op één
kaart, bijvoorbeeld 6, 7, 8 november 2026. Mijn shows toont maximaal zes gekoppelde
reeksen met een resterende showdag; de teller telt alle toekomstige gekoppelde
reeksen. Beide lijsten linken naar dezelfde bestaande reeksroute. Geen samenvoegen
van losse reeksen op alleen artiestnaam. Historische catalogusgroepen blijven
beschikbaar voor de kalender; alleen Gashouder, ook buiten het 90-dagenmenu.

## Bestaande planning hergebruiken

shared/home-planning.js hergebruikt src/lib/show-planning.js: 31/14/7/1
kalenderdagen vóór de eerste reeksdatum plus Showdag. Geen vijf fictieve
records per concertdatum en geen eigen deadline-intervallen.

Showprofiel is alleen af als de huidige PDF-revisie via de bestaande
report-status klaar en downloadbaar is. Productionele afronding gebruikt de
bestaande choices en bevestigde barrier/floor-statussen, inclusief NVT/Nee.
Operationeel en maatregelen blijven voorlopig open, conform bestaande planning.
Showdag is een mijlpaal; hij wordt niet meegenomen in de voorbereidingsstatus.

Achterstallige vereiste voorbereiding betekent Aandacht nodig. Zonder achterstand
betekent Op schema; ontbrekende/onleesbare bron betekent Planning ontbreekt,
met waarschuwing dat de betreffende deadlines niet kunnen worden meegeteld.
Er bestaat geen bevestigde voorsprongregel of algemene showafronding.
Op 5 november 2026 bevestigd: geen Voor op schema en Afgerond als — met uitleg.
Account-showkoppelingen zijn bevestigd Vertrouwelijk in Drive, via de bestaande Vercel-route.
Geen verlopen datum automatisch als afgeronde show behandelen.

Lijstgroepen: verlopen, vandaag en resterend tot zondag; oudere achterstand telt
in totaal maar alleen maandag–zondag telt als deze week. De lijst bevat alleen open mijlpalen van reeksen waarvan de laatste showdag
nog niet voorbij is. Afgeronde taken verdwijnen direct uit deze lijst. De kalender
heeft vorige/volgende maand en behoudt alle mijlpalen, inclusief afgeronde taken
en deadlines van afgelopen shows; afgeronde taken krijgen hun eigen markering. Nederlandse kalenderdagen gebruiken
Europe/Amsterdam; geen datumverschuiving door UTC/zomertijd. Maandraster start
maandag. Deadline-items wijzigen geen afrondstatus.

## Snelle beveiligde projectie en cache

`home-dashboard` vereist actuele Shows-module, activatie, MFA en sessie; de
Drive-brug controleert de module opnieuw. In Productie staat de apart Openbaar
geclassificeerde `_esmojo_home_planning_v1.json`: uitsluitend canonieke reeks-ID's,
vier afrondbooleans en een controletijd. Geen keuzes, teksten, account-ID's,
bezoekersdata of PDF-bytes. HomeCompletion.gs is exact uit de bestaande
productionComplete-bron gegenereerd. HomeProjection.gs werkt na bronwijzigingen
precies de betrokken reeks bij, onder dezelfde Drive UserLock. PDF-commit is
onderdeel hiervan. De bestaande OIDC-middagworkflow bouwt de projectie ook op
na de catalogusimport, via de eigen audience /api/home-planning-sync. Langdurige
broncontroles houden geen globaal schrijfslot vast; uitsluitend de korte eindmerge
wordt vergrendeld en leest de actuele Drive-projectie buiten de leescache om.
Ondertussen bevestigde bronwijzigingen blijven daarbij leidend. Geen vrije
browser-, preview- of client-data-schrijfroute. Supabase is toegestaan maar voor
deze uitvoering niet nodig: geen nieuw databaseschema of persoonsgegevenscache.

Een homepage-read opent geen onderliggende analyse-, ticket-, productie- of
PDF-bronnen meer. Openbare metadata en statusprojectie mogen maximaal zes uur
in Apps Script CacheService staan; nooit de persoonlijke koppelingen of profielen.
Die blijven in het vertrouwelijke Drive-register. Session/restore vraagt de
home-projectie in dezelfde getekende Drive-aanroep mee als de actuele profiel-
controle. Dat voorkomt de vroegere tweede browserlaadronde na het aanmelden.
Andere modules krijgen deze dashboardgegevens niet. Fout in een optionele
projectie mag de aanmelding niet blokkeren.

Op 5 november heeft de gebruiker expliciet openbare homepagegegevens in de browser
toegestaan. src/lib/home-cache.js whitelists metadata, geverifieerde MOJO-foto-URL's
en afrondbooleans naar `esmojo-public-home-v1` (maximaal zeven dagen). Er staat geen
account-ID, assigned-vlag, relatie, token, recht, keuze of broninhoud in deze opslag.
Persoonlijke relaties worden pas in geheugen toegevoegd vanuit de geverifieerde
sessieresponse. Zonder die bevestiging kan een bewaarde openbare cache niet als
persoonlijk dashboard worden getoond. Wis persoonlijke toestand en negeer late
reacties bij afmelden/account-/rol-/modulewissel; bestaande serverrechten blijven
leidend. Geblokkeerde/corrupte opslag is optioneel en blokkeert de applicatie niet.

Navigatie en geverifieerde sessie-opstart tekenen meteen uit dit geheugen. De
normale globale sessiecontrole ververst op focus/zichtbaarheid en iedere minuut
op de achtergrond; de homepage doet geen tweede periodieke Drive-read. Na een
geslaagde bronwijziging bevat het antwoord de bevestigde nieuwe reeksstatus en
werkt de cache/list direct bij. Een bevestigde PDF-status werkt dezelfde vlag bij.
Openbare cachewijzigingen worden tussen tabbladen doorgegeven, zonder relaties.
Bij een lopende of mislukte controle blijft de laatst bevestigde status zichtbaar;
geen skeleton of leeg dashboard bij verversing. Alleen bij een allereerste bezoek
zonder bruikbare geverifieerde gegevens is een initiële read nodig. De beveiligde
aanmelding en het ophalen van nog niet gecachte afbeeldingen blijven netwerkwerk.

Nederlandse middernacht wordt exact gepland, ook op een dag van 23/25 uur. Dan
worden datums, vijf/zes lijsten en deadlines opnieuw berekend zonder serverread.
Kalender-/lijstkeuze en de gekozen maand blijven bij updates behouden.
De middagworker haalt geverifieerde MOJO-foto-URL's vooraf op en bewaart ze
Openbaar in Productie/_esmojo_home_photos_v1.json. De bootstrap levert deze URLs
direct mee; het beeld zelf laadt via normale browsercache. Er is alleen bij een
ontbrekende foto een extra achtergrondlookup nodig; ook die URL wordt gecachet. Geen tijdelijke foto. Ook een reeks
waarvan de eerste dag al voorbij is krijgt via de beveiligde metadatafallback
de juiste foto en bestaande showpagina.

## Verificatie en status

Echte index, exacte accountmatch en bestaande statusdocumenten via de toegestane
Drive-koppeling gelezen. Alleen lokaal buiten Git verwerkt. De nieuwe readprojectie
is lokaal met die echte documenten en officiële MOJO-foto's uitgevoerd. De backfill is op 5 november uitgevoerd in het aparte vertrouwelijke register
_esmojo_show_assignments_v1.json in Productie en via Drive teruggelezen. Geen
manager-ID of relatie wordt in de openbare concertindex opgeslagen.

Unit-/integratiecontroles voor scope, volledige versus vijfshowsselectie,
reeksidentiteit, echte afrondingen, ontbrekende data, kalender-/weekgrenzen,
MFA/moduleweigering op server en Drive, directe showroutes en late reacties.
Browsercontrole op 320, 700, 900, 1100, 1280, 1440, 1920 en 2560 px, met beide
systeemthema's: bijpassend licht/donker dashboard, 1/2/3 kolommen, 320:213-fotoverhouding,
uitlijning, rechter cijferblok gelijk aan eerste kaart, geen paginaoverflow,
kalendernavigatie/refreshbehoud en lege/fout/herlaadstatus.

De centrale tijdelijke regel staat in google-apps-script/ShowAssignments.gs.
Zij zoekt het bestaande account op exacte mail, gebruikt diens stabiele ID en
voegt ontbrekende concert/user/rol-combinaties toe. Bestaande relaties/rollen
blijven behouden. Herhaling schrijft niets; ontbrekend/ambigu account blokkeert
uitsluitend toewijzing en geeft een veilige importstatus. De normale getekende
shows-import gebruikt dezelfde regel voor alle bestaande en nieuwe showdagen.
Uitschakelen/vervangen van die beleidsfunctie bereidt echte managerkeuzes voor.
Alle overige accounts blijven zonder persoonlijke toewijzing tenzij er een echte
relatie bestaat; beheerder/superrol maakt iemand niet automatisch eigenaar.

De gepubliceerde versie en workflowresultaten staan in de taaknotitie.


## Kalenderjaartellingen (V1.47)

Mijn shows dit jaar en Afgerond tellen unieke aan de actuele gebruiker
gekoppelde concertdagen met een datum binnen 1 januari t/m 31 december van het
huidige Nederlandse kalenderjaar. Afgerond volgt alle vier bevestigde
voorbereidingsstappen, zonder te wachten op Showdag. De voltooiingsdatum bepaalt
niet het teljaar. Gedeeltelijke dagkoppelingen en reeksen over een jaargrens
worden per werkelijk gekoppelde showdatum geteld; kaarten/deadlines behouden
hun canonieke groepering en bestaande selectielimieten.

Afgelopen dagen blijven meetellen, toekomstig verdwenen shows niet. Geannuleerde
/verwijderde shows en andere zalen blijven buiten het dashboard. Geen verzonnen
afronding bij ontbrekende planning. Een bevestigde heropening verandert de teller
direct; de bestaande middernachttimer verzorgt ook de Nederlandse jaarwisseling.
Geen extra opslag of netwerkread: homePlanning leidt de cijfers af uit de
bestaande geautoriseerde gegevens en laatst bevestigde openbare planningsstatus.

Getest: shared/home-planning.test.js voor jaargrenzen, Nieuwjaarsdag, historie,
gekoppelde dagen, de vier verplichte stappen en heropening; browsercontrole van
de cijfers/statussen, beide thema’s en 1920/1440/900/700/390px.


## Deadline-links (V1.49)

Een klik op de volledige deadline-rij opent direct het juiste bestaande showtabblad:
Showprofiel afronden → Showprofiel; operationele/productionele risico’s →
Risicoanalyse; beheersmaatregelen → Maatregelen; Showdag → Overzicht. De canonieke
reeks-/show-ID blijft de routebasis; ?tab= kiest alleen een gewhitelist tabnaam.
De kalender gebruikt dezelfde links. Er is geen nieuwe API of extra tussennavigatie.

De expliciete tab wordt vóór de eerste zichtbare render geselecteerd, ook wanneer
het showgeheugen een andere tab onthield. Zonder expliciete geldige tab-query
blijft die herinnering behouden. De bestaande History-router bewaart de query bij
klik en terug/vooruit; normale ankerelementen ondersteunen ook nieuw tabblad en
toetsenbord. Bestaande Shows-module-/MFA-controles blijven ongewijzigd.

Controle: show-page.test.js (eerste zichtbare selectie incl. onthouden tab),
home-planning.test.js (bestemming per deadline), router.test.js (veilige tabnamen/
legacy-URLs), bestaande directe-show- en geheugentests. Browser met synthetische
inhoud: BUNT./Overmono, één klik, onthouden tab, refresh, terug en licht/donker mobiel.
