# ESMOJO-projectafspraken

## Uitvoering en publicatie

Werk in het Nederlands. Voer gevraagde wijzigingen zelfstandig uit met passende
controles en publiceer afgeronde wijzigingen via GitHub main, zodat Vercel esmojo.nl
bijwerkt. Bij gelijktijdig werk gebruiken beide accounts een eigen taakbranch en
volgen ze docs/samenwerken.md: actuele main integreren, opnieuw controleren en
zonder force push publiceren. Vraag voor normale bouw- en publicatiestappen niet opnieuw toestemming.
Werk Resend, Supabase en Google Drive bij wanneer de gevraagde functie die diensten
raakt; bestaande gegevensclassificatie en toegangsafspraken blijven van toepassing.

Op 3 november 2026 heeft de gebruiker opnieuw expliciet bevestigd: “Vanaf nu mag
je alles wat we aanpassen weer meteen in de live-omgeving zetten.” Dit geldt als
doorlopende toestemming om gevraagde, afgeronde en gecontroleerde wijzigingen via
main naar esmojo.nl te publiceren, zonder per wijziging opnieuw toestemming te
vragen. Dit omvat ook de klaarliggende risicokaarten en Entreeproces (V1.13).
Expliciete latere verzoeken om alleen een preview te maken blijven leidend;
bestaande gegevensclassificatie, beveiliging en technische controles blijven gelden.

## Officieel logo

De door de gebruiker op 31 oktober 2026 aangeleverde logoafbeelding is de
gezaghebbende bron: ES bovenaan, MO daaronder, JO onderaan; ESMO zwart en JO blauw.
Behoud in iedere toepassing exact de oorspronkelijke lettervormen, onderlinge
verhoudingen, positionering, afstanden en kleuren. Alleen proportioneel schalen
van het complete logo is toegestaan. Geen vervorming, uitsnede, herindeling,
losse lettervariant, benadering met een lettertype of opnieuw getekend logo.

Op uitdrukkelijk verzoek van de gebruiker op 1 november 2026 is het volledige
hoofdmenu-logo monochroom: alle letters inclusief JO krijgen via gerichte CSS
#404040 in de lichte modus, en wit in de bestaande donkere modus. Het originele
SVG-bronbestand, geometrie en bronkleuren blijven intact. Deze toestemming geldt
alleen voor het hoofdmenu; andere logotoepassingen behouden hun oorspronkelijke
kleuren tenzij afzonderlijk goedgekeurd. Geen algemeen filter of vervorming.

De originele aangeleverde SVG staat in src/assets/ESMOJO-logo.svg en de originele
transparante PNG in public/brand/ESMOJO-logo-transparant.png. Gebruik deze bronbestanden;
reconstrueer het logo niet. De SVG-geometrie en bronkleuren blijven ongewijzigd.

Uitsluitend op het inlogscherm is door de gebruiker ook toegestaan: alle letters
wit met 50% dekking, buiten de login-kaart op dezelfde positie en grootte als
het hoofdmenu-logo. Pas dit alleen met CSS toe; laat de originele SVG intact.

De gebruiker heeft afzonderlijk een faviconvariant goedgekeurd en aangeleverd:
alle zes letters wit op een achtergrond met het oorspronkelijke JO-blauw #002ff4.
Die bestanden staan in public/icons en zijn uitsluitend voor favicons en
site-iconen, niet als vervanging van het normale logo in het menu. In het menu
geldt de hierboven goedgekeurde monochrome variant, zonder blauw achtergrondvlak.

## Snelheid

Toon bij het laden van pagina-inhoud geen laadtekst in de contentbox. Plaats een
klein draaiend rondje rechts in de bijbehorende paginaknop in het submenu, zoals
bij Accounts. Hergebruik src/lib/submenu-loading.js; rond de laadstatus af in
finally en ruim die op bij navigatie, ook bij fouten of late reacties. Behoud
toegankelijke aria-busy-status en respecteer minder-bewegen-instellingen.

Lettertype en lettergroottes blijven gelijk bij verschillende schermbreedtes.
Gebruik geen viewport-afhankelijke fontgroottes of schaaltransformaties om inhoud
passend te maken. Laat onderdelen die niet naast elkaar passen onder elkaar
doorlopen; behoud vaste maten voor tekst, iconen en bedieningselementen.

Het menu met iconen heet het hoofdmenu. De tweede laag ernaast heet het submenu
en is bedoeld voor tekstmenu's en andere onderdelen, zonder iconen. Alle pagina's
behalve Homepage hebben een submenu. De contentbox staat gecentreerd tussen het
submenu en de rechter schermrand, bovenaan uitgelijnd met het logo. Op smalle
schermen staat het submenu boven de content om voldoende leesruimte te houden.

Beheerder, Shows en Artiest hebben een vergrootglas naast de submenu-titel. Het
zoekveld opent over de titel en filtert uitsluitend titels van submenu-items,
lokaal en direct; nooit de pagina-inhoud. Hergebruik src/submenu-search.js en
geef nieuwe links zo nodig data-submenu-title mee. Geen zoekopdrachten opslaan
of naar een zoekdienst sturen. Escape/sluiten maakt de volledige lijst zichtbaar.

Op 3 november 2026 heeft de gebruiker voor het openen van een show één gezamenlijke
laadronde gevraagd: rondje in de gekozen submenu-link en de showpagina pas tonen
wanneer showprofiel, onderzoeksinhoud, bezoekersgegevens, risico's, productie-
beoordelingen en toepasselijke PDF-status geladen zijn. Hergebruik deze gegevens
uitsluitend in tijdelijk sessiegeheugen; geen gedeeltelijk
bruikbare pagina of herhaalde initiële reads bij tab-/detailnavigatie. Writes,
reserveringen, downloads en echte PDF-generatie blijven beveiligde serveracties.

Op aanvullend verzoek op 3 november 2026 blijven maximaal vijf recente showcontexten
vijftien minuten na verlaten in browsergeheugen beschikbaar. Een actieve show of
lopende write niet tussentijds opruimen. Bij terugkeer dezelfde context hergebruiken,
lopende writes afwachten en alleen ongeldige gegevens herlezen. Geen localStorage,
sessionStorage, IndexedDB of serviceworker-cache voor deze gegevens. Wis bij
afmelden, account-/rolwissel, harde refresh, verlopen bewaartijd of verdringing.

Snelheid is het belangrijkste ontwerpuitgangspunt. De gebruiker accepteert een
langere eerste laadbeurt of refresh als navigatie en veelgebruikte acties daarna
direct werken. Laad passende veelgebruikte gegevens vooraf, hergebruik gegevens
en voer langdurige taken op de achtergrond uit. Laad niet zonder noodzaak alle
gegevens of vertrouwelijke informatie naar de browser.

Bij een verzoek dat de wachttijd aanzienlijk vergroot: onderzoek eerst een
snellere uitvoering. Als dat onvoldoende helpt, beschrijf gevolgen en alternatieven
en vraag goedkeuring voordat je de tragere uitvoering bouwt.

## Gegevensclassificatie

De gebruiker heeft artiestfoto’s van openbare MOJO-concertaankondigingen expliciet
Openbaar verklaard. Gebruik de foto van de betreffende concertpagina; laad die
op de achtergrond binnen de afgesproken contentbox. Geen logo-aanpassingen.

De gebruiker heeft op 1 november 2026 eigen Showprofiel-samenvattingen expliciet
Openbaar verklaard. Sla samenvatting, concept/afgerond-status en wijzigingsdatum
op in showprofiel.json in de bestaande algemene concert/reeksmap in Drive.
Bestaande account/MFA, servervalidatie en revisiecontrole blijven vereist.
Onderzoeksbestanden blijven afzonderlijk en worden hierdoor niet overschreven.

MOJO-concertgegevens (artiest, locatie, datum, concert-ID en openbare bronlink)
zijn expliciet Openbaar verklaard. Bewaar deze import in ESMOJO/Productie:
artiestmap / artiestnaam_Gashouder_DDMMYYYY. Spaties in het concert-ID worden
koppeltekens; de artiestmap behoudt de naam. Importeer vanaf vandaag 365 dagen
(einddatum exclusief), toon in Shows unieke artiesten binnen 90 dagen. Geen
nieuwe concertpagina's zonder verzoek. Alle concertdocumenten staan in hun
concertmap; alleen de technische routingindex staat in Productie zelf.
Algemene informatie staat één keer in algemeen.json bij de eerste datum van
een aaneengesloten reeks. concert.json verwijst daarnaar; analyses en incidenten
blijven bij de eigen showdatum. Historische mappen/documenten nooit opruimen
omdat een concert niet meer in de agenda voorkomt. Bij twijfel over opslag vragen.
De vaste workflow mojo-shows.yml controleert dagelijks rond 12.00 Nederlandse
tijd, automatisch met zomer-/wintertijd. GitHub kan geplande jobs vertragen.
Import alleen via de geverifieerde GitHub OIDC-identiteit op main, niet via een
anonieme schrijfroute. Het Shows-menu vereist de bestaande account- en MFA-check.

De gebruiker heeft verzocht maximaal 72 uur ingelogd te blijven, ook na
browserherstart. Alleen het noodzakelijke sessiegeheim mag versleuteld in een
HttpOnly/Secure/SameSite-cookie worden bewaard. Profielgegevens en tokens blijven
uit localStorage/sessionStorage. De termijn begint bij de wachtwoordaanmelding,
wordt niet verlengd door refresh en wordt ook op de server gecontroleerd.

Accountinstellingen zijn voor gebruikers alleen-lezen, behalve de eigen
profielfoto. Laat bij foto-upload altijd een ronde uitsnede kiezen met zoom en
verschuiving; bewaar alleen die bevestigde uitsnede in Drive. Werk daarna de
avatar in het hoofdmenu direct bij. Andere profielvelden en rollen mogen niet
via de eigen fotoroute worden aangepast.

Accountprofielen (voornaam, achternaam, e-mailadres, functie, optionele profielfoto
en rol) zijn door de gebruiker als Vertrouwelijk geclassificeerd. Opslag in
Google Drive. Als expliciete uitzondering mag Supabase Auth het e-mailadres,
wachtwoordbeveiliging en verplichte TOTP-tweestapsverificatie beheren. Bewaar geen
profielvelden of foto's in Supabase-gebruikersmetadata of persistente browseropslag.
De gebruiker staat Resend toe het e-mailadres en de eenmalige activatielink te
verwerken voor accountuitnodigingen. Op 3 november 2026 is expliciet ook de
betrouwbare afzonderlijke voornaam toegestaan voor de persoonlijke aanhef. Dit
wijzigt de vertrouwelijke Drive-opslag van het profiel niet; voeg overige
profielvelden niet aan e-mails toe.

Er zijn twee categorieën: Openbaar en Vertrouwelijk.
Vraag de gebruiker bij elke nieuwe gegevenssoort of nieuwe velden expliciet
welke categorie van toepassing is, voordat je opslag of verwerking bouwt.
Hergebruik eerder bevestigde classificaties; vraag opnieuw bij een wijziging van
betekenis of gebruik. Raad niet. Niet-geclassificeerde gegevens niet opslaan.

- Openbaar: opslag in Supabase is door de gebruiker toegestaan. Dit betekent
  niet automatisch anonieme lees- of schrijftoegang. Stel toegangsbeleid expliciet
  vast en gebruik Row Level Security voor tabellen die via een API bereikbaar zijn.
- Vertrouwelijk: opslag uitsluitend in de afgesproken Google Drive-map in Mijn
  Drive van een normaal Google-account met werkmail. Ga niet uit van Google
  Workspace of een Shared Drive. Google Cloud en Firebase zijn geen automatisch
  goedgekeurde vervangers.

Vertrouwelijke gegevens mogen niet ongemerkt via Supabase, Vercel-serverfuncties,
Resend, logs, analytics, builds of persistente browseropslag worden verwerkt.
Stel de toegestane verwerkingsroute vast voordat je die implementeert. Gebruik
geen openbare Drive-links als toegangsbeveiliging. Controleer toegang aan de
serverzijde; alleen verborgen knoppen bieden geen beveiliging.

De gebruiker heeft expliciet toegestaan dat Vercel vertrouwelijke gegevens
verwerkt, mits opslag plaatsvindt in Google Drive. Dit staat geen opslag in
Supabase, logs, analytics of persistente browseropslag toe. De zakelijke map is
1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk in Mijn Drive. De gebruiker heeft succesvolle
bereikbaarheid via ondertekend Apps Script bevestigd (1092 ms). Medewerkersrechten
zijn nog niet aangesloten. Publiceer geen Drive-endpoints
voordat authenticatie en autorisatie zijn geïmplementeerd.

De tijdelijke OAuth-instelroutes zijn op verzoek van de gebruiker verwijderd.
Herstel deze niet automatisch. De gedeelde Drive is niet beschikbaar gebleken;
de Apps Script-koppeling met ondertekende serververzoeken is op bereikbaarheid
getest. De tijdelijke verbindingstestpagina is daarna op verzoek verwijderd;
herstel deze niet automatisch. Behoud de Apps Script-webapp en haar huidige
verbindingsinstellingen. Bestandsimport en opslag moeten nog worden gebouwd.
De gebruiker heeft gemeld dat de oude OAuth-variabelen in Vercel zijn opgeruimd.

Automatische Apps Script-publicatie via GitHub Actions en clasp is voorbereid.
De workflow gebruikt de vaste Script-ID en bestaande deployment-ID in
tools/apps-script/deployment.json. Behoud manifest, webapp-URL en Script properties.
De eenmalige Google-autorisatie wordt als CLASPRC_JSON uitsluitend in GitHub
Actions-secrets bewaard, nooit in code of chat. De gebruiker heeft een succesvolle
automatische publicatierun bevestigd; claim nieuwe publicaties alleen op basis
van nieuwe runtime- of workflowresultaten.

Bewaar geen sleutels in broncode. Publiceer geen service-role-sleutel of
Google-credentials in frontendbundels. Een Google-login op zichzelf bewijst geen
toestemming tot vertrouwelijke gegevens.

## Onderzoeksbrug

Voor de OAuth MCP-koppeling heeft de gebruiker op 1 november 2026 expliciet
toestemming gegeven: technische clientregistraties, toestemmingscodes en
toegangstokens zijn Vertrouwelijk, uitsluitend Drive-opslag en Vercel-verwerking,
geen logs of onderzoeksbestanden. Bewaar alleen token-/codehashes in het aparte
rootregister _esmojo_mcp_oauth_v1.json. MCP-toestemming vereist een actieve
beheerder met MFA; controleer de rol bij ieder MCP-verzoek. Geen vrije Drive-
of accounttoegang. Zie docs/mcp-research.md voor scope, intrekken en tests.

De elf onderzoeksantwoorden, bronlinks en onderzoeksdatum zijn expliciet Openbaar.
De brug wordt voorbereid volgens docs/research-bridge.md; live activatie is nog
niet bevestigd. Gebruik .agents/skills/esmojo-onderzoek/SKILL.md bij onderzoek.
De elf echte prompts ontbreken nog; verzin ze niet. Eén JSON-bestand per vraag,
uitsluitend bij de eerste showdatum van de reeks. De server kiest de bestemming
via de bestaande index en valideert de Drive-parentketen. Alleen onderzoek_01.json
t/m onderzoek_11.json, geen overschrijven/verwijderen of accounttoegang. Bestaande
identieke uploads mogen veilig worden herhaald. Upload én teruglezen verifiëren.
De eigen onderzoekstoken hoort uitsluitend in Vercel en als secretvereiste voor
esmojo.nl in de uitvoeromgeving, nooit in code/chat/logs. Onderzoeks-JSON wordt
voorlopig als concept opgeslagen, niet automatisch op de website getoond.

De gebruiker heeft op 1 november 2026 gevraagd de elf bestaande onderzoeks-JSON’s
correct in het ingelogde Showprofiel te tonen. AI-samenvatting, volledige analyse,
bronnen en onderzoeksdatum zijn leesbaar per onderwerp. Dit wijzigt geen eigen
samenvattingen of concept/afgerond-status; onderzoek blijft afzonderlijk concept.

## Handmatige bezoekersdata

De gebruiker classificeert alle ingevoerde aantallen en herkomstgegevens expliciet
als Vertrouwelijk. Toon Aantallen en herkomst binnen Showprofiel onder de bestaande
tabjes met Terug naar overzicht; geen extra AI-veld of nieuwe paginaroute. Bewaar
workflow.visitors.fields.ticket_sales/visitor_origins/domestic_origins inclusief
content en completed_at in workflow_json in bezoekersdata.json in de canonieke
concert/reeksmap in Drive. Bewerkreserveringen en wijzigingshistorie staan uitsluitend
in hetzelfde vertrouwelijke bestand; account/MFA, servervalidatie, vervallende
veldreserveringen en versies beschermen iedere opslag. Tijdelijke concepten alleen
in browsergeheugen. Geen logs, analytics of persistente browseropslag van invoer.
De elf openbare AI-bestanden en eigen Showprofiel-samenvattingen blijven gescheiden.

## Definitieve analyseafronding

De gebruiker heeft eindcijfers (1–10) en toelichtingen van bezoekers- en
artiestanalyse expliciet Openbaar verklaard. Bewaar ze afzonderlijk in
analyseafronding.json in de canonieke reeksmap in Drive. Voor bezoekers zijn vier
afgeronde AI-onderwerpen én drie geldige bevestigde handmatige blokken vereist;
voor artiest zeven afgeronde AI-onderwerpen. De server controleert vereisten en
revisies vóór definitieve opslag. Wijziging/heropening van een onderliggende stap
maakt de betreffende categorieafronding ongeldig, met behoud van oude cijfers en
toelichtingen in historie. Kopieer geen vertrouwelijke ticketinhoud naar dit bestand.
De afrondoverlay beslaat alleen het inhoudsgebied, met formuliervelden binnen de
vaste contentbox; hoofdmenu en submenu blijven zichtbaar en bereikbaar.

## Definitief Showprofiel-PDF

Op 2 november 2026 heeft de gebruiker de risicoanalyse uit definitieve
showprofiel-PDF's expliciet Vertrouwelijk verklaard. Ieder potentieel risico
is een afzonderlijk onderbouwd item. Opslag uitsluitend als eigen versiegebonden
JSON in de canonieke Drive-showmap, naast de elf openbare onderzoeksbestanden.
Verwerking via bestaande Vercel-server en het gekoppelde ChatGPT-account;
geen inhoud in logs, Supabase, analytics of persistente browseropslag.
De extra OAuth-scope esmojo.showprofile_risks vereist nieuwe expliciete
toestemming; bestaande onderzoeksgrants krijgen geen extra rechten. Resultaten
blijven AI-concept voor ESM-beoordeling. Zie docs/showprofile-risks.md.

De gebruiker heeft op 2 november 2026 de handmatige Ja/Nee-keuzes voor
productionele risico's expliciet Vertrouwelijk verklaard en Drive-opslag per
show/reeks gevraagd. Bewaar keuzes, revisie en wijzigingshistorie uitsluitend
in productionele-risicos.json in de canonieke showmap. Account/MFA en
revisiecontrole blijven vereist. Detailpagina's voor voorwaardelijke onderwerpen
worden pas actief na bevestigde opslag van Ja; Nee schakelt ze weer uit.
De website toont afzonderlijke operationele risico's uit de opgeslagen analyse
van de actuele definitieve PDF; oudere versies nooit stilzwijgend als actueel.

Na beide definitieve categoriebeoordelingen genereert ESMOJO automatisch het
Showprofiel-PDF met uitsluitend bevestigde gebruikerssamenvattingen, handmatige
ticket-/herkomstgegevens en eigen eindcijfers/toelichtingen. Nooit AI-zijbalken,
onderzoeksantwoorden of onbevestigde voorstellen opnemen. De gecombineerde PDF
is Vertrouwelijk en staat met het revisieregister alleen in de Drive-showmap;
Vercel mag genereren en beveiligd doorgeven, zonder inhoud te loggen of bewaren.
Dezelfde invoerrevisie hergebruikt het bestaande bestand; oude versies blijven
behouden bij wijzigingen. Download blijft account-/MFA-/revisiegecontroleerd.
De originele generator en assets staan ongewijzigd in server/report-original;
het meegeleverde PDF-opmaakprotocol is normatief, inclusief fonts en voetafbeelding.
Deze aangeleverde PDF-assets vervangen geen logo in de site. Zie docs/showprofiel-pdf.md.

## Direct menu en sessie-opstart

Op verzoek van de gebruiker: hoofdmenu en submenu verschijnen na sessiecontrole
zonder eigen laadplaceholder. Shows gebruikt een meegeleverde openbare beginlijst
en een lokale cache van uitsluitend concert-ID, artiestnaam, datums, zaal en stad.
Geen profielen, tokens, rechten, analyses, ticketdata of foto's hierin bewaren.
Ververs maximaal één keer per Nederlands middagvenster (12.00 tot volgende 12.00),
op de achtergrond; behoud het bestaande menu en open concepten bij vernieuwing.
Datumgroepen worden lokaal voor vandaag berekend. Alleen pagina-inhoud toont een
laadrondje in de bijbehorende menuknop. Autorisatie blijft serverzijdig verplicht.
De initiële sessiecontrole toont het originele gecentreerde logo met vulanimatie
op een achtergrond die het systeemthema volgt; de oorspronkelijke vormen blijven
intact. De concertachtergrond verschijnt uitsluitend bij het echte inlogformulier.

## Websiteversie

De gebruiker wil vanaf deze publicatie V1.00 klein en horizontaal gecentreerd
onder de profielfoto in het hoofdmenu zien. Verhoog bij iedere volgende gepubliceerde
website-update het nummer met één honderdste: V1.01, V1.02 enzovoort. Werk de zichtbare
tekst en het toegankelijke versielabel in index.html samen bij. Niet bij losse
branch-/taaknotitiecommits verhogen. Een grote versiesprong naar V2.0 gebeurt
uitsluitend op expliciet verzoek van de gebruiker; nooit automatisch doortellen
naar een nieuw hoofdnummer. Dit is de websiteversie, niet de PDF-documentversie.

## Pagina-adressen

De gewone pagina's gebruiken paden zonder routinghekje, bijvoorbeeld /shows en
/beheerder/accounts. Gebruik src/lib/router.js voor interne navigatie en behoud
de gerichte Vercel-rewrites voor directe bezoeken en refresh. Oude #/bladwijzers
worden clientzijdig naar hun pad omgezet. De bestaande activatiegeheimen blijven
als afzonderlijke beveiligingsuitzondering in het fragment tot ze zijn verwerkt;
verplaats nooit een uitnodigingstoken naar query/pad en daarmee requestlogs.

De gebruiker heeft voor de batterij-laadanimatie expliciet toegestaan dat alle
letters van het originele logo blauw #002ff4 zijn. Pas dit uitsluitend met
gerichte .boot-mark-CSS toe; behoud bron-SVG en alle geometrie. Andere logo's
blijven hun bestaande kleurregels houden.

Het laadscherm en de hele website volgen automatisch prefers-color-scheme van het
apparaat, direct vóór de eerste paint en live bij systeemwijzigingen. Geen
handmatige thema-override of opgeslagen themakeuze; de oude menuschakelaar is
vervangen door automatisch systeemgedrag. Op het laadscherm staat geen themaknop.

Onderwerpen opslaan geeft direct het overzicht terug; de writes lopen na elkaar
in tijdelijk geheugen door met actuele serverrevisies. Toon pas na bevestiging
Concept opgeslagen/Afgerond. Bewaar invoer bij fouten/conflicten, stop volgende
writes na een onzekere opslag en lees bij een bewuste herpoging de huidige revisie.
SPA-navigatie onderbreekt writes niet; afmelden wist wachtrijen en conceptgeheugen.
Een bestaand definitief PDF toont direct gereed/download met stille statuscontrole;
zichtbare voortgang uitsluitend bij daadwerkelijke generatie, geen render op iedere
paginaopening. Download blijft aan de server gecontroleerd, zonder PDF-prefetch.

## Barrieropstelling en Vloerdruk

De gebruiker heeft op 2 november 2026 beide beoordelingen, toelichtingen,
beheersmaatregelen, publieksvakken, bezoekersaantallen en netto-oppervlakten
expliciet Vertrouwelijk verklaard, inclusief geüploade PNG/PDF-plattegronden.
Bewaar beoordelingen en historie in het bestaande productionele-risicos.json;
losse bijlagen uitsluitend als private bestanden in dezelfde canonieke Drive-showmap.
Account/MFA, servervalidatie en revisiecontrole blijven vereist. Alleen referenties
in beoordelingen; geen bestandsinhoud in JSON, logs of persistente browseropslag.
Standaard-PNG’s worden later aangeleverd in src/assets/barrier-layouts; geen
vervangende afbeeldingen zoeken of genereren. Zie docs/production-assessments.md.

## Fluid-designstandaard

Op 3 november 2026 heeft de gebruiker de fluid-layout met effen witte showheader
expliciet goedgekeurd voor de live website en als designstandaard voor alle
volgende pagina’s. Gebruik centraal src/layouts/fluid-layout.js en de bijbehorende
CSS: benut de beschikbare breedte rechts van de bestaande menu’s, herschik inhoud
met Grid/Flexbox en container queries, en behoud vaste lettergroottes en een
comfortabele tekstbreedte. Nieuwe en aangepaste pagina’s sluiten hierop aan; geen
nieuwe vaste 1000px-hoofdcontainer. Houd het ontwerp clean en minimalistisch, met
witte kaarten, subtiele randen en bestaande accenten. De showheader heeft geen
verloop; donkere modus gebruikt een effen donkere kaartkleur voor leesbaarheid.
Hoofdmenu, submenu, logo, functionaliteit en gegevensarchitectuur blijven intact.

## Productionele Ja/Nee-keuzes

Op 3 november 2026 heeft de gebruiker directe bediening gevraagd: Ja/Nee-keuzes
worden meteen geselecteerd en serieel op de achtergrond opgeslagen met de laatst
bevestigde revisie. Andere rijen blijven bedienbaar. Een voorwaardelijke detailknop
wordt pas actief na bevestigde Ja-opslag. Hergebruik de wachtrij in het tijdelijke
showgeheugen; behoud lopende writes bij SPA-navigatie en wis bij afmelden/rolwissel.
Bij onzekere opslag invoer behouden, vervolgwrites stoppen en uitsluitend na
expliciet Opnieuw proberen herlezen en hervatten. Geen persistente browseropslag.

## Entreeproces en visuele productieafspraken

Bij concertlocatie Gashouder is Entreeproces niet van toepassing: zichtbaar,
grijs en uitgeschakeld met een grijze statusbadge “NVT bij Gashouder”, in dezelfde
vorm als Afgerond. Geen kleine toelichting achter de titel. Dit is geen
verplichte afrondstap, ook niet bij toekomstige uitbreiding van die workflow.
Andere locaties behouden de actieve knop.
Standaard-barrierafbeeldingen staan in een aansluitend vierkant kader met afgeronde
afbeeldingshoeken; Schematische weergave lijnt links uit met dat kader.
In de vloerdruktabel staan bezoekers, netto m² en dichtheid op één lijn. De vaste
regel Zitplaatsen bevat automatisch de overgebleven verkochte tickets na aftrek
van de overige vakken (minimaal nul), zonder m²/dichtheid. Bij ontbrekende tickets
geen getal invullen. De afgeleide waarde gebruikt bestaande rijen/ticketreferentie,
zonder extra verplichte invoer of automatische risicobeoordeling.

## Herbruikbare risicobeoordeling

Gebruik src/risk-review-card.js voor het standaardblok “Risico beoordeling”: vier
gekleurde keuzes in twee kolommen. Geen risico vereist Toelichting; Laag heeft
geen tekstveld; Midden/Hoog vereisen Beheersmaatregel. Opslaan rondt de geldige
beoordeling af via de bestaande beveiligde revisie-/Drive-route. Momenteel wordt
dit blok uitsluitend rechts van Barrieropstelling gebruikt, op dezelfde breedte
als de Showprofiel-zijkaart. Vloerdruk behoudt de bestaande component.
De barrierbeoordeling bewaart riskNote afzonderlijk van notes voor een afwijkend
ontwerp, binnen dezelfde Vertrouwelijke beoordeling in Drive. Historische
afgeronde records zonder riskNote blijven leesbaar; nieuwe afrondingen volgen de
nieuwe verplichte velden, met de hierna vastgelegde uitzondering voor standaard-
barrieropstellingen.

Op aanvullend verzoek op 3 november 2026: de algemene Risico beoordeling-kaart
heeft standaard geen selectie. Uitsluitend na bewuste keuze voor Seated of één
van de vier standaard-barrieropstellingen wordt Geen risico automatisch afgerond
opgeslagen zonder toelichting. Afwijkend ontwerp blijft handmatig; Midden/Hoog
houden hun verplichte beheersmaatregel. Niet automatisch schrijven door openen
of verversen, en bestaande opgeslagen keuzes blijven leesbaar. De afbeelding
en het label Schematische weergave zijn rechts uitgelijnd in het barrierblok.

## Vaste e-mailstandaard

Gebruik voor alle uitgaande e-mails uitsluitend sendEmail uit server/email.js,
met gestructureerde inhoud; deze module rendert centraal via server/email-template.js
en server/email/template.html (de door de gebruiker aangeleverde vormgeving).
Geen vrije HTML/plaintext die het template omzeilt. Header #0046F2, transparant wit
ESMOJO-logo, vaste merkregel, witte inhoud, optionele grijze informatieblokken,
blauwe linkknop met 8px radius zonder gekleurde tabelcel en alleen de merkregel
in de footer. Logo komt van de beschikbare HTTPS-asset; geen data-URI of lokaal pad.
De originele logoasset blijft ongewijzigd; de witte proportionele PNG-export wordt
bij de build gemaakt. Geen voorbeeldteksten of voorbeeldlinks automatisch versturen.

Accountmails hebben als expliciet bevestigde regel onder de titel: Account activeren.
Voor andere niet-show-specifieke mailtypen eerst de regel aan de gebruiker vragen.
Showmails gebruiken uitsluitend het gekoppelde canonieke showobject (key, naam,
locatie, relevante datums); de renderer maakt de Nederlandse datumregel en weigert
ontbrekende gegevens. Geen willekeurige eerste datum uit een reeks.

Persoonlijke aanhef gebruikt alleen de betrouwbare afzonderlijke firstName van de
ontvanger, nooit de beheerder of een afleiding uit e-mailadres/volledige naam.
Ontbrekende naam, gedeelde mailbox of groep: Beste collega,. Iedere persoonlijke
mail heeft één ontvanger; toekomstige personalisatie verstuurt afzonderlijk.
Geen externe persoonsverrijking. Escape alle tekst en valideer linkdoelen.
Behoud accounttriggers, token/TTL, MFA, afzender en reply-to. Geen echte testmails;
gebruik tools/email/preview.mjs en de tests met fictieve fixtures/gemockte verzending.

## Email testen en templatedekking

Op verzoek van de gebruiker is Beheerder → Email de testpagina voor alle
huidige en toekomstige mailtemplates. Voeg ieder werkelijk mailtype toe als
`server/email-templates/<id>.js` met default `{id,label,requiresShow,build,buildTest}`;
het centrale register ontdekt de map automatisch. Geen tweede handmatige
templatelijst in UI/API. Testvarianten maken geen activatietokens of accounts.
Alleen een bewuste klik van een ingelogde actieve beheerder met MFA verstuurt
naar diens eigen serverzijdig opgehaalde accountadres via de bestaande Resend-
voorziening. Geen vrije ontvanger/HTML en geen automatische verzending bij openen.
Ontwikkelcontroles gebruiken uitsluitend fictieve gegevens en gemockte verzending.

Bezoekersanalyse en Artiestanalyse hebben gelijke kolombreedtes wanneer ze naast
elkaar staan; behoud de bestaande responsive herschikking en aparte zijbalk.

## OnTrack

Op 3 november 2026 heeft de gebruiker OnTrack als afzonderlijk systeem onder
Beheerder gevraagd. CSV’s, rapport-PDF’s, verwerkingsstatus en ontvangerinstellingen
zijn expliciet Vertrouwelijk; opslag in de opgegeven Drive-map
1V5lw-IicMW_bkphtjD4HIEejCpsOapps, verwerking via ESMOJO/Vercel en rapportverzending
via de bestaande Resend-voorziening zijn bevestigd. Eigen register
_esmojo_ontrack_v1.json, geen koppeling aan show-/risicodata of Supabase-opslag.
Beheer vereist actieve beheerder/MFA, ook controle in de ondertekende Drive-brug.
Ontvangerkeuze verwijst naar bestaande actieve accounts, met revisiecontrole.
Geen CSV-inhoud, rapportinhoud of ontvangers in logs/persistente browseropslag.

De gebruiker heeft ESMOJO_Codex_overdracht_showrapportage.md als volledige
specificatie aangeleverd. Gebruik de pure CSV-/rekenlaag en afzonderlijke
PDF-generator in server/ontrack-report. De bestaande showprofielgenerator blijft
intact. Exact 17 headers/volgorde, Affected Person enkelvoud, Resolution Note,
strenge lokale tijden in Europe/Amsterdam en uitsluitend de opgegeven filters.
Geen vervangende ON-logo’s of fonts. Origineel ON-icoon moet in
server/ontrack-report/assets/ontrack-icon.png staan; zonder dit asset blijft de
productie-worker geblokkeerd. Het originele ON-icoon is op 3 november 2026 als ZIP aangeleverd en ongewijzigd
geplaatst; alleen de goedgekeurde volledige SCOOTER-referentie-PDF ontbreekt nog. De bestaande gevalideerde productiefonts/MOJO-footer
worden ongewijzigd hergebruikt. Een expliciete lokale layoutproef zonder icoon
is duidelijk PROEF en wordt niet als productierapport opgeslagen/verzonden.
Vinkje uitsluitend bij bevestigde verzending; Showrapportage gebruikt de centrale
mailstandaard en de bevestigde artiest-/locatie-/datumregel.

De gebruiker heeft de show-specifieke mail Showrapportage toegevoegd, met tekst
“Hierbij ontvang je de showrapportage van [artiestnaam] op [showdatum] in de
[showlocatie].” Persoonlijke aanhef via eigen voornaam en afsluiting met
Event Safety Mobility Operations. Gebruik server/email-templates/show-report.js.
De echte mail vereist de werkelijk gegenereerde PDF als bijlage en gekoppelde
showmetadata. Geen mail zonder PDF of ontbrekende concertgegevens. De expliciete
mailtest gebruikt een duidelijk gemarkeerde test-PDF; geen echte rapportverwerking.
PDF-bijlagen gaan uitsluitend in servergeheugen naar Resend, maximaal 10 MB;
geen vrij URL/lokaal pad of bijlage-inhoud in records/logs/mailtestrequests.
Uitsluitend een bewuste beveiligde PDF-download mag bytes tijdelijk in het
browsergeheugen gebruiken; daarna de blob-URL opruimen.

## Extra MOJO-locaties uitsluitend voor OnTrack-mailings

Op 3 november 2026 heeft de gebruiker MOJO-concerten in Ziggo Dome, AFAS Live,
GelreDome, Johan Cruijff ArenA en Rotterdam Ahoy gevraagd voor Showrapportage.
Hergebruik de bestaande Openbaar-classificatie voor artiest, concert-ID, locatie,
stad, datum en MOJO-bron. Bewaar deze inventaris uitsluitend als
_esmojo_ontrack_concerts_v1.json in de OnTrack-Drive-map. Geen invoeging in de
Shows-/Productie-index, menuseed, artiestmappen, analyses of andere pagina’s.

De bestaande mojo-shows.yml controleert beide inventarissen dagelijks rond
12.00 uur Nederland, met dezelfde zomer-/wintertijdcontrole en 365-dagenhorizon.
Iedere import heeft een eigen vaste OIDC-audience en eigen signed Drive-domein.
Valideer de complete inventaris voordat die de vorige vervangt; behoud historie
voor reeds bekende concerten en bestaande gegevens bij fouten. Geen eigen
artist-/concertmappen aanmaken voor de extra locaties.

Alleen het mailtype show-report gebruikt concertCatalog ontrack in de centrale
mailcatalogus. Beheerder/MFA en extra Drive-profielcontrole blijven verplicht.
Andere mailtypen houden de gewone showbron. Extra concertgegevens uitsluitend
in beheerder-mailkeuzes tonen; niet in Shows of andere siteonderdelen. Gebruik
uitsluitend de exacte gekozen concertkoppeling voor de mailmetadata.

## Automatische OnTrack-rapportworkflow

De vaste ontrack-reports.yml controleert iedere 30 minuten de private CSV-map
via eigen OIDC-audience/workflow, zonder CSV/PDF, tellers of afleverdetails naar GitHub te kopiëren. Verwerking
vindt uitsluitend in Vercel-geheugen plaats; PDF en status staan in het bestaande
OnTrack-Drive-register/map. Eén unieke inhoud+concert+layout hergebruikt dezelfde
rapportidentiteit, ook bij dubbele Drive-bestanden. Nieuwe inhoud/layout/context
krijgt een nieuwe versie; leases, gedeelde generatiereservering en bronhashes
beschermen gelijktijdig werk. Oude rapporten/sourcebestanden blijven behouden.

Concertmetadata komt uitsluitend uit opgeslagen canonieke concertrecords. De
bestandsnaam mag alleen als unieke matchhint dienen; nooit artiest/zaal/datum
verzinnen of SCOOTER-voorbeelddata als productieconstant gebruiken. Bij ontbreken
of ambiguïteit kiest de beheerder een echte concertkoppeling; CSV-showdatum wordt
ook gecontroleerd. Historische shows van vóór de eerste inventaris worden niet
stilzwijgend verzonnen. De echte SCOOTER-CSV is uitsluitend lokaal getest, nooit
in Git/CI/artifacts/logs opnemen. Voorbeeldcijfers mogen alleen in acceptatietests.

Locatietellingen gebruiken voorlopig eerste voorkomen in de oorspronkelijke CSV
als beslisregel bij gelijke aantallen (door de overdracht toegestaan); dit wijkt
bij gedeelde plaatsen af van de genoemde voorbeeldlijst. De gebruiker is om de
voorkeur gevraagd. Tijdstippen in het dubbele wintertijduur gebruiken de vroegste
werkelijke occurrence en geven een waarschuwing; niet-bestaande zomertijdtijden
worden geweigerd. De grafiek gebruikt uitsluitend eerste datum >17:00 plus de
eerstvolgende datum. Latere datums blijven volledig in de incidenten en worden
als grafiekwaarschuwing geregistreerd.

Ontvangers worden per rapport vastgelegd vanuit de actuele actieve accounts.
Nieuwe selectie geldt voor nieuwe rapporten. Een rapport zonder ontvangers kan
na selectie bewust met Rapport mailen worden aangeboden; geen automatische
inhaalmail bij alleen een selectiewijziging. Iedere persoonlijke mail krijgt de
eigen betrouwbare voornaam en de PDF als verplichte bijlage. Resend-idempotentie,
ontvangerlease, bevroren mailinhoud en maximaal drie pogingen voorkomen dubbelen.
Na 23 uur onzekerheid uitsluitend controle/review, geen automatische nieuwe mail
na het 24-uursvenster. Markeer sent alleen na positieve providerbevestiging.

Technische grenzen: CSV maximaal 2 MB, gegenereerde PDF maximaal 3 MB vanwege de
bestaande Vercel/JSON-downloadroute; overschrijding of een onmogelijke opmaak geeft
een zichtbare fout met behoud van bron/eerdere rapporten. De legacy API-grenzen
blijven intact; alleen de nieuwe signed OnTrack-PDF-route heeft de grotere envelop.

Op 3 november 2026 verduidelijkte de gebruiker dat het concert-ID altijd in de
incidents-CSV-bestandsnaam staat. Gebruik incidents_<concert-ID>.csv tegen de
opgeslagen canonieke key; eerst letterlijk, daarna uitsluitend unieke match op
hoofdletters en spatie/koppelteken/underscore. Geen ID-reconstructie uit zichtbare
artiest-/zaallabels en geen gedeeltelijke/fuzzy ID-match. De gevraagde uitbreiding
tot één maand terug is vervolgens expliciet ingetrokken; venster en gewone Shows
blijven ongewijzigd. Het originele ON-icoon is daarna als ZIP aangeleverd en byte-identiek geplaatst
in server/ontrack-report/assets/ontrack-icon.png. Bron-SHA256:
a40789fde3886ed38cde64f02adff922909c340f6e12f00cb3707705ab4e9870.
Geen nabewerking, reconstructie of ander icoon gebruiken. De bestaande
assetblokkade vervalt door aanwezigheid van dit originele bestand; verwerking
blijft wel afhankelijk van een geldige CSV en opgeslagen concertkoppeling.

Op expliciet verzoek is de witte buitenrand van het ON-icoon op 3 november 2026
in de PDF-weergave verwijderd met een afgeronde uitsnede van de grijze tegel.
Deze toestemming geldt voor die presentatie; het oorspronkelijke PNG-bestand
blijft byte-identiek bewaard. De ON-lettervormen, kleur en klikbare link behouden.

Uitsluitend voor het serverzijdig geladen beheerdersaccount redacted@example.invalid
heeft de gebruiker een vaste extra testmailontvanger redacted@example.invalid
bevestigd. Iedere bewuste testverzending via Beheerder → Email stuurt hetzelfde
gekozen testtemplate afzonderlijk naar beide adressen, met aparte stabiele
idempotentiesleutels. Dit geldt niet voor andere accounts of productiemails.
De UI toont beide adressen; geen browserveld of template mag ontvangers wijzigen.

## Concertplanning op Overzicht

Ieder concert toont de vijfstappenplanning in licht/donker. Deadlines zijn 31,
14, 7 en 1 kalenderdag vóór de vroegste concertdatum, gevolgd door Showdag.
Gebruik de Nederlandse kalenderdag Europe/Amsterdam, ook rond zomertijd.
Showprofiel alleen afgerond als de actuele PDF-status ready is; productionele
risico’s alleen als alle toepasselijke beoordelingen afgerond zijn. Nee-keuzes
en Entreeproces bij Gashouder zijn NVT; ontbrekende beoordelingen blijven open.
Operationele risico’s en beheersmaatregelen blijven zichtbaar maar voorlopig
altijd onafgerond totdat hun echte afrondfunctionaliteit expliciet gebouwd is.
Geen handmatig afvinken of nieuwe statusopslag. De planning gebruikt uitsluitend
de bestaande gedeelde showcontext en reageert op bevestigde wijzigingen.

Op 4 november 2026 is de Overzicht-planning op twee derde van de contentbreedte
gezet, met één derde ruimte ernaast voor latere blokken. Onder 1000px beschikbare
content wordt het één kolom. Gebruik de show-overview-grid en de eigen container
van de planning; behoud lettergroottes en responsive herschikking.
Hoofdmenu Statistieken heet vanaf deze versie Rapportages met een documenticoon;
het bestaande interne pad blijft bereikbaar.

## Vertrouwelijke moduletoegang per account

Op 4 november 2026 heeft de gebruiker modulekeuzes Shows, Artiesten en Rapportages
expliciet als Vertrouwelijk bevestigd in het bestaande Drive-accountprofiel.
Bewaar modules uitsluitend daar, niet in Supabase/JWT, logs of browseropslag.
Shared account-modules.js en de gegenereerde Apps Script-versie bepalen de drie
onafhankelijke modules. Bestaande profielen zonder veld behouden hun toegang;
expliciet lege selectie betekent geen modules. Ongeldige waarden falen gesloten.
Alleen bestaande beheerdersroutes mogen de modules aanpassen; geen zelftoekenning
via accountinstellingen, foto of browservelden. Beheerderrol is geen modulebypass.

Verberg niet-toegekende menu-items en weiger directe pagina’s. Elke module-API
controleert het actuele Drive-profiel na MFA, vóór metadata, downloaden of muteren.
Rapportages omvat ook de bestaande beheerder-OnTrack-routes, private PDF-download,
showrapportage-testtemplate en extra concertcatalogus. De Drive-brug controleert
rapporttoegang opnieuw; geen openbare PDF-links. Rapportontvangers vereisen de
Reports-module, opnieuw gecontroleerd vóór reservering van verzending; intrekken
blokkeert nieuwe leveringen. OnTrack-beheer vereist daarnaast de beheerderrol.
Service-/cronintegraties behouden hun eigen getekende machineautorisatie.

Nieuwe module-eindpunten moeten de centrale modulecontrole toepassen. Houd geen
rol-/modulebeslissing uit clientdata of oude JWT-claims aan. Verversen van de
sessiecontrole bij focus, terugkeer en iedere minuut werkt menu en open pagina bij;
intrekken wist gedeeld showgeheugen. Serverweigeringen zijn direct leidend, ook
voordat die visuele verversing plaatsvindt. Bewaar de bestaande rol-/MFA-beveiliging.

## Super beheerder uitsluitend via code

Op 4 november 2026 heeft de gebruiker het bestaande account redacted@example.invalid
expliciet aangewezen als Super beheerder. Alleen de vaste code in de ondertekende
Drive-accountbrug kent die rol toe; bestaande profielcontrole promoveert dit
account eenmaal in hetzelfde register. Geen rolwijziging via websitekeuzes of
browserpayload. Gewone beheerders kunnen dit account niet degraderen, blokkeren
of verwijderen. Andere accounts krijgen deze rol niet.

Gebruik gedeelde isAdministrator/isSuperAdministrator/hasModule voor alle nieuwe
beheer- en modulecontroles. Super beheerder krijgt alle huidige en toekomstige
modules ongeacht selecties. MFA, activatie, sessiecontrole, gegevensvalidatie en
vertrouwelijke opslag blijven verplicht. De website toont de rol alleen-lezen;
geen toewijsbare optie, API weigert expliciete superroltoekenning. Eigen reguliere
profielwijzigingen behouden de rol serverzijdig. Codewaarden zijn superbeheerder,
zichtbare titel is Super beheerder. Identiteit/e-mailbinding blijft serverzijdig,
zet het vertrouwelijke adres niet in publieke frontend-bundels.

Op 4 november 2026 vroeg de gebruiker de planning compacter en weer horizontaal
zoals de oorspronkelijke referentie. Gebruik 14px staptitels, 12px datums/voetregel,
11px badges, kleinere punten en minder witruimte; geen tekstschaling per viewport.
De eigen planningscontainer gaat pas onder 680px over naar de compacte verticale
indeling. Behoud tweederdebreedte, thema’s, deadlines en echte afrondstatussen.

## Jungle-webrapportage onder Rapportages

Vanaf 4 november 2026 bestaat /rapportages/Jungle_Ziggo-Dome_03112026 met submenu Jungle. Het is een
vaste vormgevingsvoorbeeldpagina; automatische pagina’s voor nieuwe CSV’s volgen
later. De bestaande CSV in de private OnTrack-map is expliciet als bron bevestigd.
Geen echte CSV/PDF/incidentteksten in Git, builds of CI-fixtures opnemen. Vercel
rekent met de bestaande calculateReport-functie. De gedeelde web-renderer toont
zes fluid kaarten en alle incidenten, met normale 14px tekst en beide thema’s.
Geen iframe, nieuwe PDF, AI-research, showwijziging of mailactie voor deze weergave.

Actie report-web vereist de actuele Rapportages-module na MFA. De getekende
Drive-operatie web-preview controleert opnieuw actieve moduletoegang, ook voor
gewone gebruikers. Alleen vaste slug jungle; geen vrije bestands-ID, naam, actor,
URL of pad uit de browser. De Drive-leesoperatie accepteert uitsluitend de vaste
geverifieerde CSV, juiste map, MIME en grootte; rapportregister/CSV blijven intact.
Bronbytes blijven serverzijdig, de HTTP-response bevat alleen benodigde velden en
no-store. De browser bewaart niets persistent en ruimt weergave/observer op bij
verlaten/rechtenwijziging. Gebruik dezelfde renderer later voor echte koppelingen.
De incidenten zelf en PDF-kop zijn 3 november; de CSV-bestandsnaam heeft 2 november
maar wordt niet stilzwijgend hernoemd of als datumbron gebruikt.

Vanaf 4 november 2026 is het canonieke Rapportages-pad /rapportages/<concert-ID>.
Gebruik het werkelijke opgeslagen concert-ID, niet alleen de artiestnaam en niet
het mogelijk afwijkende CSV-bestandslabel. De huidige vaste voorbeeldroute is
Jungle_Ziggo-Dome_03112026, geverifieerd in het private rapportregister. Centrale
routeconfig staat in shared/report-routes.js; frontend en rapportmetadata delen
hetzelfde ID. Oude /statistieken-paden en /rapportages/jungle blijven via redirects
of History-normalisatie werken, inclusief oude hashbladwijzers. Beide rootnamen
blijven onder de Reports-modulecontrole vallen. Geen wijzigingen aan CSV-inhoud,
bronselectie, accountrechten of mail-/verwerkingsacties voor een routewijziging.

## Webrapportage: lijstfilter, types en headerfoto

Op 4 november 2026 heeft de gebruiker uitsluitend voor de rapportagewebsite de
volgende presentatie bevestigd. Locatie/tijd gebruikt korte Nederlandse maanden,
zoals 3 nov 2026. High (hoofdletterongevoelig) krijgt een rood incidentblok; behoud
ook bestaande Critical-markering. Verberg uit de individuele lijst types met
zelfzorg of kolven en omschrijvingen met pleister, pcm, paracetamol of paracetemol,
steeds hoofdletterongevoelig. Alleen de lijst en de zichtbare teller worden
gefilterd; nooit de bronrecords, oorspronkelijke KPI-berekeningen of PDF.

De grote medische/beveiligingstotalen blijven, dubbele totaalregels onderin niet.
Web-typegrafieken houden alle types met meerdere meldingen en vullen zo nodig
aan tot vijf daadwerkelijke types. Sorteer op aantal, dan eerste CSV-positie;
verzin geen types wanneer er minder bestaan. De webprojectie wijkt hiermee
bewust af van de ongewijzigde PDF-selectie (>1). Caption Meest gemelde incidenttypes.

Rapportheaderfoto rechts via bestaande getMojoPhoto en geverifieerde MOJO-bron.
De vaste Jungle-bron komt uit de bestaande concertcatalogus. Geen browser-URL
als scraperinput, geen Shows-moduletoegang vereisen voor een Reports-gebruiker.
Server en browser beperken foto’s tot MOJO; fout/onbereikbare foto mag het rapport
niet blokkeren. Standaard typography/thema’s en de canonieke URL blijven intact.


## Webrapportage: datumtabs, submenu en beveiligingsfilter

Op 4 november 2026: rapportheader heeft dezelfde tabvormgeving als Shows, één tab
per echte showdatum, datum alleen in de tab en tekst bovenaan gelijk met foto.
Header niet hoger maken. Gemeenschappelijke stijlen src/show-tabs.css; wissel per
showdatum de bijbehorende rapportdataset, nooit één rapport dupliceren of
nachtincidenten op kalenderdatum verkeerd scheiden. Onbeschikbare dag expliciet
melden. Automatische CSV-koppeling blijft een afzonderlijke toekomstige taak.

Rapportages-submenu gebruikt Shows-klassen en lokaal titelzoeken. Alleen
beschikbare rapporten, nieuwste eerst. Nederlandse kalenderdag: t/m zeven dagen
onder Afgelopen week, vanaf acht dagen onder Afgelopen periode; reeks groeperen
op recentste beschikbare rapportdatum, geen toekomstige agenda importeren.

Beveiligings-KPI's verbale/fysieke agressie, uitzettingen en aanhoudingen zijn
klikbare filters, met dropdown/reset naast Individuele incidenten. Criteria staan
centraal in shared/report-security.js en blijven gelijk aan bestaande tellingen.
Uitkomst-KPI's tellen personen, incidentlijst telt bronrecords; licht verschil toe.
Actieve filter doorzoekt alle originele incidenten, ook standaard verborgen
zelfzorgrecords. Wissen herstelt standaard lijstselectie. KPI's/grafieken/PDF
blijven ongewijzigd. Stuur uitsluitend afgeleide labels mee, geen extra ruwe
CSV-velden. Bestaande Rapportages-modulecontrole, MFA en private bron blijven.


Op 4 november 2026 zijn ook de vier medische KPI's aanklikbare incidentfilters:
Behandelingen, Zelfzorg, Onwelwordingen en Ambulancetransporten. De bestaande
medische criteria staan centraal in shared/report-medical.js. Medische afdeling
vereist voor behandeling/zelfzorg/onwel; ambulance volgt Resolved Status over
alle afdelingen en telt personen. Geen tellingen stilzwijgend wijzigen om bij
het algemene lijstfilter aan te sluiten. Projecteer alleen medicalFilters-labels,
geen extra ruwe CSV-velden. Alle acht KPI-rijen gebruiken dezelfde knopcomponent,
met gelijke hoogte en rijafstand voor Medisch/Beveiliging in beide thema's.
Eén actieve medische of beveiligingsfilter; dropdown/reset blijft bij Individuele
incidenten. Expliciete zelfzorgselectie toont bijbehorende standaard verborgen
records. Wissen herstelt het algemene lijstfilter. PDF/grafieken ongewijzigd.

Prioriteit in de individuele rapportagewebsite-incidenten gebruikt Nederlandse
labels: Low=Laag, Medium=Midden, High=Hoog, Critical=Kritisch. Vertaal uitsluitend
voor presentatie, hoofdletterongevoelig; behoud bronwaarden en High/Critical-rood.
Ontbrekende prioriteit Niet opgegeven, onbekende waarde leesbaar behouden.
