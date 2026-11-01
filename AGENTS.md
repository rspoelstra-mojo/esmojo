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

In het lichte menu mogen de letters ESMO via gerichte CSS #404040 worden;
het originele SVG-bronbestand blijft intact. Voor de donkere websitevariant mogen de letters ESMO wit worden.
JO behoudt exact het oorspronkelijke blauw; verder niets wijzigen. Geen algemeen
CSS-filter toepassen dat ook JO verandert. Nieuwe afwijkingen vereisen expliciete
toestemming van de gebruiker.

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
blijft JO altijd blauw en heeft het logo geen eigen blauw achtergrondvlak.

## Snelheid

Lettertype en lettergroottes blijven gelijk bij verschillende schermbreedtes.
Gebruik geen viewport-afhankelijke fontgroottes of schaaltransformaties om inhoud
passend te maken. Laat onderdelen die niet naast elkaar passen onder elkaar
doorlopen; behoud vaste maten voor tekst, iconen en bedieningselementen.

Het menu met iconen heet het hoofdmenu. De tweede laag ernaast heet het submenu
en is bedoeld voor tekstmenu's en andere onderdelen, zonder iconen. Alle pagina's
behalve Homepage hebben een submenu. De contentbox staat gecentreerd tussen het
submenu en de rechter schermrand, bovenaan uitgelijnd met het logo. Op smalle
schermen staat het submenu boven de content om voldoende leesruimte te houden.

Snelheid is het belangrijkste ontwerpuitgangspunt. De gebruiker accepteert een
langere eerste laadbeurt of refresh als navigatie en veelgebruikte acties daarna
direct werken. Laad passende veelgebruikte gegevens vooraf, hergebruik gegevens
en voer langdurige taken op de achtergrond uit. Laad niet zonder noodzaak alle
gegevens of vertrouwelijke informatie naar de browser.

Bij een verzoek dat de wachttijd aanzienlijk vergroot: onderzoek eerst een
snellere uitvoering. Als dat onvoldoende helpt, beschrijf gevolgen en alternatieven
en vraag goedkeuring voordat je de tragere uitvoering bouwt.

## Gegevensclassificatie

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

## Onderzoeksimport (later te bouwen)

Beoogde route: ChatGPT-onderzoek naar een JSON-bestand in Google Drive, vervolgens
import in ESMOJO als concept voor controle. Bepaal de JSON-structuur samen met de
gebruiker en controleer de beschikbare Drive-schrijfmogelijkheid voordat de
koppeling wordt gebouwd. Classificeer de velden vóór import en splits opslag
volgens categorie. Er is nog geen importkoppeling geïmplementeerd.
