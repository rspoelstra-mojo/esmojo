# Showpagina's uit Dataverse

De bestaande Gashouder-showlijst blijft beschikbaar. Aanvullend leest de website
alleen de show-sleutels uit esmojo_onderzoeksresultaat voor de afgesproken
bronbibliotheek. Dit is een gegroepeerde metadataquery, zonder Markdown-inhoud.
Andere MOJO-concerten krijgen hierdoor niet automatisch een showpagina.

Een nieuwe show gebruikt /shows/dataverse_<artiest>_<zaal>_<jjjjmmdd>.
Voorbeeld van de bevestigde tweede proef:
/shows/dataverse_westlife_ziggodome_20261123?tab=showprofiel.
De bestaande Hatsune Miku-URL blijft geldig. Geldige show-sleutels worden
getrimd, datums gevalideerd en artiest/zaal/datum gescheiden gekoppeld. Er wordt
geen identiteit uit de onderzoekstekst afgeleid. De bestaande openbare
concertcatalogus levert de volledige artiest-/zaalnaam wanneer de sleutel exact
overeenkomt. Zonder match blijft de compacte bronnaam behouden; onbekende steden
worden niet aangenomen. Dit kan later met expliciete showmetadata worden verrijkt.

Het Shows-menu hercontroleert bij openen/verversen binnen dezelfde dag en houdt
de bestaande openbare menucache zichtbaar tijdens laden. Het submenu toont
Komende week en Komende periode, samen vandaag tot45 dagen vooruit. Geen
periodieke menuverversing; buiten dit venster blijft de directe showpagina bestaan. Alleen
publieke menuvelden blijven lokaal bewaard; geen AI-inhoud, rechten of tokens.
De server houdt alleen openbare identiteitsmetadata maximaal15 seconden bij;
een menuread ververst de Dataverse-bronlijst altijd.

Bij openen wordt de gewone showstructuur idempotent klaargezet, onder de
bestaande account/MFA/Shows-controles. Bestaande shows met dezelfde artiest,
zaal en datum worden hergebruikt; analyses/beoordelingen nooit overschreven.
Nieuwe niet-Gashouder-shows gaan buiten het Gashouder-specifieke actieve
Supabase-model om en behouden voor eigen analyses/bestanden de huidige Drive-
route. Dit is geen algemene migratie van de rest van de showgegevens.

Dezelfde pagina bevat overzicht, showprofiel, risicoanalyse, maatregelen en
documenten. PDF-validatie/opmaak ondersteunt de Dataverse-shows met hun eigen
zaal/stad. Showbeheer blijft de apart afgesproken Gashouder-functie.
Alle elf AI-concepten worden samen met de showlanding voorbereid. Tab- en
onderwerpwissels hergebruiken de bestaande tijdelijke showcontext.

Onderzoek wordt per show gefilterd, met dezelfde bronbibliotheek en oorspronkelijke
bronpadcontrole. Randspaties in show-sleutels zijn toegestaan; een gedeeltelijke
substringmatch koppelt nooit een andere show. Numerieke bronversies worden binnen
hetzelfde bestand vergeleken; een opnieuw aangeleverd bestand volgt zijn latere
importdatum. Gelijke tijdstippen met conflicterende bronbestanden blijven ambigu.
Opruimstatus is geen inhoudsfilter: verwijderde SharePoint-bronnen blijven leesbaar
uit Dataverse. Bestaande ESM-samenvattingen en definitieve scores blijven eigen data.

De bestaande vier DATAVERSE_TEST_*-variabelen worden hergebruikt. Geen nieuwe
omgevingsvariabelen, Graph-rechten of aanpassing van de15-minutenflow nodig.
De catalogusgrens is5000 gegroepeerde bronnen; Dataverse-aggregatielimieten blijven
van toepassing. Per geopende show maximaal500 historische bronrijen en2MiB tekst.
Dit zijn technische grenzen, geen gemeten laadtijdgarantie.
