# Opslag: voorbereid, nog niet aangesloten

## Openbaar — Supabase

Maak een ESMOJO-project aan in een Europese regio dicht bij de uiteindelijke
applicatieserver. Deel geen databasewachtwoorden of geheime sleutels in chat.
Bewaar de project-URL en benodigde publieke projectkey via de omgevingsinstellingen
zodra de eerste concrete aansluiting wordt gebouwd. Een publieke projectkey maakt
gegevens niet vanzelf openbaar: toegangsbeleid en RLS blijven noodzakelijk.

Er zijn nog geen tabellen, categorieën van concrete velden, gebruikersrollen of
lees-/schrijfrechten bepaald. Maak geen vrij toegankelijke tabellen als tijdelijke
oplossing. Bepaal authenticatie en rechten voordat werkelijke gegevens worden
toegevoegd.

## Vertrouwelijk — zakelijke Google Workspace

Controleer beschikbaarheid van een gedeelde Drive en Apps Script bij de
Workspace-beheerder. Gebruik bedrijfsbeheer in plaats van een persoonlijke Drive
voor continuïteit, en beperkte groepsrechten in plaats van openbare deel-links.

Een gedeelde Drive kan documenten en JSON-bestanden bevatten; Sheets kan geschikt
zijn voor beperkte gestructureerde datasets, maar is niet zonder meer een database
voor complexe relaties en veel gelijktijdige wijzigingen. De definitieve keuze
hangt af van de gegevensstructuur en het verwachte gebruik.

Apps Script is een mogelijke verwerkingslaag binnen Workspace; beschikbaarheid,
quota en authenticatie vanuit de op Vercel gehoste website moeten eerst worden
getest. Publiceer geen anoniem toegankelijk endpoint en maak geen endpoint dat met
eigenaarsrechten onbeperkt alle bestanden ontsluit.

Google-login en medewerkersrollen zijn nog niet aangesloten. Stel vast of
vertrouwelijke informatie via Vercel mag lopen. Zo niet, dan is een door Workspace
beveiligde aparte interface een optie. Beweren dat gegevens binnen Workspace blijven
vereist dat ook deze verwerkingsroute klopt, niet alleen de uiteindelijke opslag.

## Eerstvolgende stappen

1. Bevestig of het Supabase-project bestaat en Workspace-beheer beschikbaar is.
2. Definieer de eerste gegevensvelden en vraag hun classificatie.
3. Bepaal bedrijfslogin, rollen en toegestane gegevensroutes.
4. Sluit beide opslagroutes aan en test met fictieve gegevens, inclusief weigering
   van onbevoegde toegang en reactietijden.

Er zijn nog geen externe projecten, Drive-mappen, credentials of werkende
databaseverbindingen aangemaakt vanuit deze repository.
