# ESMOJO-projectafspraken

## Snelheid

Snelheid is het belangrijkste ontwerpuitgangspunt. De gebruiker accepteert een
langere eerste laadbeurt of refresh als navigatie en veelgebruikte acties daarna
direct werken. Laad passende veelgebruikte gegevens vooraf, hergebruik gegevens
en voer langdurige taken op de achtergrond uit. Laad niet zonder noodzaak alle
gegevens of vertrouwelijke informatie naar de browser.

Bij een verzoek dat de wachttijd aanzienlijk vergroot: onderzoek eerst een
snellere uitvoering. Als dat onvoldoende helpt, beschrijf gevolgen en alternatieven
en vraag goedkeuring voordat je de tragere uitvoering bouwt.

## Gegevensclassificatie

Er zijn twee categorieën: Openbaar en Vertrouwelijk.
Vraag de gebruiker bij elke nieuwe gegevenssoort of nieuwe velden expliciet
welke categorie van toepassing is, voordat je opslag of verwerking bouwt.
Hergebruik eerder bevestigde classificaties; vraag opnieuw bij een wijziging van
betekenis of gebruik. Raad niet. Niet-geclassificeerde gegevens niet opslaan.

- Openbaar: opslag in Supabase is door de gebruiker toegestaan. Dit betekent
  niet automatisch anonieme lees- of schrijftoegang. Stel toegangsbeleid expliciet
  vast en gebruik Row Level Security voor tabellen die via een API bereikbaar zijn.
- Vertrouwelijk: opslag in de zakelijke Google Workspace. Google Cloud en
  Firebase zijn geen automatisch goedgekeurde vervangers voor Workspace.
  Kies de precieze Workspace-opslag pas na inventarisatie van gegevens en beheer.

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
Actions-secrets bewaard, nooit in code of chat. De eerste echte automatische
publicatie moet nog worden bevestigd; alleen lokale mocks zijn uitgevoerd.

Bewaar geen sleutels in broncode. Publiceer geen service-role-sleutel of
Google-credentials in frontendbundels. Een Google-login op zichzelf bewijst geen
toestemming tot vertrouwelijke gegevens.

## Onderzoeksimport (later te bouwen)

Beoogde route: ChatGPT-onderzoek naar een JSON-bestand in Google Drive, vervolgens
import in ESMOJO als concept voor controle. Bepaal de JSON-structuur samen met de
gebruiker en controleer de beschikbare Drive-schrijfmogelijkheid voordat de
koppeling wordt gebouwd. Classificeer de velden vóór import en splits opslag
volgens categorie. Er is nog geen importkoppeling geïmplementeerd.
