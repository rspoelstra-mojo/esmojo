# ESMOJO-projectafspraken

## Uitvoering en publicatie

Werk in het Nederlands. Voer gevraagde wijzigingen zelfstandig uit met passende
controles en publiceer afgeronde wijzigingen via GitHub main, zodat Vercel esmojo.nl
bijwerkt. Bij gelijktijdig werk gebruiken beide accounts een eigen taakbranch en
volgen ze docs/samenwerken.md: actuele main integreren, opnieuw controleren en
zonder force push publiceren. Vraag voor normale bouw- en publicatiestappen niet opnieuw toestemming.
Werk Resend, Supabase en Google Drive bij wanneer de gevraagde functie die diensten
raakt; bestaande gegevensclassificatie en toegangsafspraken blijven van toepassing.

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
verwerken voor accountuitnodigingen. Voeg geen profielvelden toe aan die mails.

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
