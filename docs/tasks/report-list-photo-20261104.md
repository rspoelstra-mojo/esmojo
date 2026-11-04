# Rapportage: korte datum, prioriteit, lijstfilter en foto

Eigenaar Codex, branch task/report-list-photo-20261104. Gebruiker vraagt korte
Nederlandse maand in locatie/tijd, rood incidentblok bij High, verbergen in de
incidentenlijst wanneer type zelfzorg/kolven bevat of omschrijving pleister/pcm/
paracetamol/paracetemol bevat (hoofdletterongevoelig), en MOJO-artiestfoto rechts
in de rapportheader. Behoud de zes kaarten en alle oorspronkelijke berekeningen,
CSV/PDF en data-opslag. Alleen web-lijstfilter, geen verwijdering uit bronnen.

Hergebruik bestaande beveiligde MOJO-photo scraper; geen bron-URL uit browser.
Bron via bestaande concertmetadata verifiëren. Rapportages-module blijft vereist,
geen afhankelijkheid van Shows-toegang. Foto optioneel bij onbereikbare bron.
Scope renderer/filterhelpers, CSS, privé bronadapter/fotointegratie, tests/docs en
V1.34. Publiceren via bestaande PR/main-flow, geen mails of CSV-writes.

Aanvullend gevraagd: dubbele totaalregels uit beide lijstjes verwijderen (grote
headercijfers behouden). Web-incidenttypes houden alle types met meerdere meldingen
en vullen zo nodig aan tot vijf daadwerkelijke types, op aantal en bestaande
CSV-volgorde bij gelijke telling. Minder dan vijf bestaande types betekent alle
beschikbare; geen fictieve types. Caption aanpassen. Alleen webprojectie, geen
wijziging aan oorspronkelijke PDF-selectie/rekenlaag of bronrecords.

Bron gecontroleerd: bestaande catalogus vermeldt https://www.mojo.nl/concerten/jungle.
Bestaande getMojoPhoto levert de werkelijke MOJO-media-afbeelding; origineel lokaal
bekeken in de header (geen afbeeldingsasset of incidentdata in Git). Rapportendpoint
gebruikt dezelfde fotodienst als Shows, met testinjectie en optionele foutafhandeling.
Foto rechts, ronde hoeken, normale responsive terugval en veilige URL-validatie.

Validatie: 4 pure viewtests (alle maanden/filters/prioriteiten/foto-URLs), 4 webadapter-
tests (foto optioneel, vijf types/meer dan vijf, stabiele ties, bron onaangetast),
31 API-/modulecontroles en 2 bestaande MOJO-fototests geslaagd. Build/diffcheck.
Lokale originele Jungle-invoer: 25 bronincidenten, 16 zichtbare lijstregels; medische
13 en beveiliging 8 blijven intact, beide grafieken vijf echte types. Geen echte
gegevens in tests/CI. Chromium licht/donker op 700/900/1280/1440/1920/2560px: geen
overflow, foto rechts bij voldoende ruimte, verkorte datums, verwijderde totaalregels,
16 volledige zichtbare incidenten en hoog-prioriteitssimulatie met rode achtergrond,
XSS als tekst, fout/herlaadstatus en late responses gecontroleerd. Desktopthema’s
met oorspronkelijke MOJO-foto bekeken. Geen echte mails of bronwrites uitgevoerd.
