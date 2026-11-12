## Geautoriseerde Shows-kopie naar Dataverse (12 november 2026)

Gebruiker autoriseert de volledige migratieknop op de beheer-datatransitiepagina.
Kopieer bestaande Shows-bronnen en benodigde gedeelde accounts/rechten/documenten
naar het vaste schema, inclusief PDFs naar Dataverse File. Dit vervangt oude
uitsluitend-Drive/Supabase-opslagbeperkingen voor deze gerichte kopie. Bronnen en
bestaande applicatieroutes behouden; geen cutover, bronopruiming of mails.
Gebruiker zegt gedurende de komende 24 uur geen handmatige Shows-wijzigingen;
bronversies/automatische processen blijven gecontroleerd. Eerst alle 52 indexen
Actief en volledige schema-readback; vooral de vier nog lopende indexen bewaken.
Bewuste klik, actuele admin/Shows/activatie/MFA, productie-only; geen vrije tabel,
Drive-ID, veldmapping of metadata vanuit browser. Create-only + terugleescontrole,
conflictstop, blokgewijze File-terugleescontrole en veilig hervatten. Geen inhoud
of native uploadtokens in browseropslag/logs. Details en scope:
docs/dataverse/shows-migratieknop.md. Een codepublicatie voert de migratie niet uit.
De vaste register-superbeheerder wordt voor de gewone Dataverse-medewerkerrol
naar Beheerder vertaald, met bronrol in Historie en controle op superAdminId.
De bestaande superbeheerderpolicy en bronrechten blijven ongewijzigd.

## Automatisch hervatten van metadata-setup (12 november 2026)

Tabelsetup herhaalt alleen de huidige idempotente stap bij bekende tijdelijke
metadata-uitkomsten, netwerkfouten of throttling. Maximaal zes pogingen met
zichtbare wachttijd; Retry-After respecteren, boven 300 seconden stoppen.
Conflicten, configuratiefouten en rechtenfouten stoppen direct; Pending is nooit
bevestigd. Native create maximaal 60s, primaire-naam-PUT 45s, gerichte publicatie
90s. Elke herhaling leest eerst bestaande metadata; geen duplicaten of bredere
reparaties. De browser hoeft niet na elke tabel te worden ververst.

## Gerichte correctie primaire Naam-standaard (12 november 2026)

Gebruiker meldt COLUMN_REQUIRED bij Artiest en toont Naam als Optioneel,
850 tekens. De setup mag deze herkenbare standaard bij een lege nieuwe schematabel
normaliseren naar het overeengekomen Bedrijfsvereist/200. Alleen esmojo_naam,
IsPrimaryName=true, type String/Text, optioneel/850, organisatie-eigendom,
onbeheerde tabel uit de vaste allowlist; nooit de bestaande onderzoekstabel.
Bevestig leegte met $top=1/$select primaire ID uit de echte EntitySetName; geen
recordinhoud naar browser/log. Bij aanwezige records of andere afwijkingen stoppen.
Uitzondering op oude no-PUT-regel: alleen deze volledige actuele kolommetadata via
PUT, met uitsluitend MaxLength/RequiredLevel.Value gewijzigd en labels behouden,
gerichte publicatie en Strong-readback. Geen andere metadatareparaties of datawrites.
Systeemvereist mag voor een echte primaire naam als sterkere verplichting worden
geaccepteerd. Gewone kolommen blijven exact gecontroleerd. Veilige enumdiagnostiek
bij mismatch; Consistency: Strong voor setup-reads tegen verouderde metadatacache.

## Geautoriseerde tabelsetup (12 november 2026)

Na geslaagde setup van 24 globale keuzelijsten autoriseert gebruiker dezelfde
beheerknop voor alle tabellen uit het Shows-schema. Op /beheerder/datatransitie,
achter actuele admin/Shows/activatie/MFA: 29 ontbrekende tabellen met kolommen,
89 N:1-relaties en unieke sleutels aanmaken; bestaande onderzoekstabel behouden.
Alleen schema uit docs/dataverse/shows-schema.json; geen vrije metadata in requests.
Bestaande verkeerde definities niet aanpassen; stop op conflict. Onderzoekstabel
krijgt alleen optionele Concertreeks-lookup; bestaande kolommen/inhoud/sleutel behouden.
Geen PUT/PATCH/DELETE of bedrijfsrecord-writes, geen gegevensmigratie/cutover.
Publiceer alleen de 30 toegestane tabellen na servervalidatie van hun schema;
geen PublishAll. Sleutelindex pas bevestigd bij Active; Pending niet als succes.
Integer-standaarden uit schema zijn appstandaarden, geen ondersteunde native
IntegerAttributeMetadata.DefaultValue. Latere CRUD-code moet die expliciet zetten.
Gedeelde setupverbinding behoudt vaste omgeving/ESMOJO/publisher-/taalcontrole.
Inventaris-WIP uit andere taakbranch blijft geparkeerd; niet mee samenvoegen.

## Geautoriseerde keuzelijstsetup (12 november 2026)

Gebruiker vraagt setupknop op /beheerder/datatransitie. Achter actuele admin,
Shows-module, activatie en bestaande MFA mag de server de 24 vaste globale
keuzelijsten uit docs/dataverse/shows-schema.json aanmaken en controleren.
Server allowlist in server/dataverse-choice-definitions.js moet exact met dit
schema overeenkomen; test bewaakt synchronisatie. Geen vrije metadata/body/URL.
Alleen oplossing ESMOJO, onbeheerd en publisherprefix esmojo; taal uit omgeving.
Bestaande afwijkende/managed lijsten niet wijzigen; geen PATCH/PUT/DELETE.
Overeenkomende/nieuwe lijsten koppelen aan ESMOJO en alleen die exacte keuzes
via PublishXml publiceren, geen PublishAll. Daarna namen, opties, labels/waarden
teruglezen. Veilige herhaling na gedeeltelijke uitkomst; geen secrets/providerbody.
Geen tabelaanmaak, bedrijfsrecords of bestaande lokale Opruimstatus aanpassen.
Een publicatie van code betekent niet dat de live metadata-setup al is uitgevoerd.

## Definitief PDF-besluit en Shows-schema (12 november 2026)

Nieuwste gebruikerbesluit: PDF’s worden canoniek opgeslagen in Dataverse File,
net als overige applicatiebestanden. ESMOJO Bibliotheek/SharePoint dient uitsluitend
ChatGPT-uitwisseling, geen permanente hoofdopslag van ESMOJO-PDF’s. Dit vervangt
alle oudere PDF-naar-SharePoint-ontwerpinstructies in deze repository.
Gebruiker wil eerst tabellen/kolommen aanmaken en vraagt een concreet schema.
Actueel contract: docs/dataverse/shows-schema.md en shows-schema.json, 30 tabellen
voor Shows en benodigde gedeelde afhankelijkheden: 29 nieuw + bestaand Onderzoek.
Onderzoeksresultaat behouden: één Markdown-kolom met bronnen, geen onderzoeksdatum
of aparte bronnenkolom. Alleen optionele lookup naar Concertreeks voorbereiden.
Geen schema-aanmaak, dataoverdracht of routeomschakeling door documentoplevering.
Inventarisatie van stap 1 is tijdelijk geparkeerd op task/show-inventory-20261112;
WIP daarvan niet naar main samenvoegen als onderdeel van deze schema-opdracht.

## Eénknopsimport alle AI-analyses (12 november 2026)

Gebruiker autoriseert een knop om alle bestaande openbare Drive AI-analyses naar
Dataverse over te zetten. Dit vervangt de beperking tot handmatige showselectie
voor deze beheerpagina. Knop start bewust; geen automatische import bij laden.
Alle primaire shows uit bestaande Drive-index, onafhankelijk van zoekfilter.
Per show inventariseren, alleen bestaande vragen verwerken, create-only en
teruglezen. Conflicten melden en overslaan; onzekere writes stoppen en veilig
hervatten. Tabblad openhouden; herladen herkent bestaande Dataverse-inhoud opnieuw.
Geen bronverwijdering, eigen analyses, nieuwe onderzoeken of opruimvrijgave.
Bestaande beheerder/Shows/MFA-controles en Drive-bronnamespace blijven gelden.

## Beheerder datatransitie Drive → Dataverse (12 november 2026)

Gebruiker vraagt expliciet een beheerpagina voor de komende migratiedagen en
heeft Antoon als eerste proef aangewezen. Route /beheerder/datatransitie vereist
actuele beheerderrol, Shows-module, geactiveerd account en bestaande MFA.
Alleen openbaar ESMOJO/Research-v1-onderzoek uit de bestaande Productie-index;
geen eigen samenvattingen/beoordelingen, privégegevens of vrije Drive-paden.
Preview per vraag, bewuste importklik, server leest de bron opnieuw en controleert
previewchecksum. Geen bronverwijdering; geen automatische bulkoverdracht.
Import in bestaande Markdown-kolom inclusief bronnen, zonder onderzoeksdatum.
Drive-imports hebben aparte logische bronnamespace 8d4b3512-7f82-4d51-a98a-a0c67d629184,
logisch importnummer en drive-research/<show-sleutel>/onderzoek_NN.md.
Dit zijn expliciet geen native Drive/SharePoint-bestandsidentificaties.
Opruimstatus blijft Nog niet vrijgegeven; geen ETag. SharePoint-opruiming mag
uitsluitend de eigen oorspronkelijke bibliotheek blijven gebruiken.
Create-only met stabiele record-ID; afwijkende bestaande inhoud blokkeert;
terugleescontrole vóór succes. Bestaande Dataverse-weergave leest beide bekende
bronnamespace-waarden. Geen secrets, onderzoekinhoud of providerfouten loggen.

## Algemene Dataverse-showkoppeling (12 november 2026)

Nieuwste gebruikersopdracht vervangt de beperking tot Hatsune Miku: iedere show
met onderzoeksresultaten in de afgesproken Dataverse-tabel/bibliotheek krijgt
automatisch een showpagina. Correctie gebruiker: geen algemene ontsluiting van
andere MOJO-zalen; bestaande Gashouder-shows behouden. De broncatalogus leest
uitsluitend gegroepeerde show-sleutels, geen onderzoektekst. Nieuwe showroutes
zijn dataverse_<show-sleutel>; de bestaande Hatsune Miku-route blijft geldig.
Menuverversing leest nieuwe imports opnieuw en bevat geen onderzoek-/accountdata.
Nieuwste menucorrectie: geen periodieke verversing, geen extra Dataverse-groep.
Komende week en Komende periode tonen samen vandaag tot45 dagen vooruit;
andere Dataverse-shows houden wel een oplosbare directe pagina.

Gebruik bestaande publieke MOJO-identiteiten voor naam/zaal/datum als die exact
overeenkomen. Zonder match blijft de compacte bronnaam zichtbaar; geen identiteit
uit AI-proza raden. Zaalnamen/stad van de vaste locaties blijven canoniek.
Showstructuur wordt idempotent aangemaakt bij openen en hergebruikt bestaande
shows bij dezelfde artiest/zaal/datum; eigen analyses nooit overschrijven.
Andere zalen blijven buiten het uitsluitend-Gashouder actieve Supabase-model;
de Dataverse-onderzoekstekst blijft in Dataverse. Geen algemene datamigratie.
Alle routes behouden account/MFA/Shows-controles. Showbeheer blijft uitsluitend
Gashouder zoals apart afgesproken; geen nieuwe toegang zonder account.
De gebruiker heeft de automatische Power Automate-import inmiddels getest:
elke15 minuten, bronopruiming na terugleescontrole, resultaten blijven in Dataverse.
De website leest resultaten onafhankelijk van opruimstatus of SharePoint-bestaan.

## Dataverse onderzoeksproef (11 november 2026)

Op expliciet verzoek gebruikt Hatsune Miku, AFAS Live, 15 november 2026 dezelfde
showpagina als Gashouder. Alleen deze exacte uitzondering; geen andere zaalshows.
De bestaande Shows-account/MFA/modulecontrole blijft verplicht. Bij expliciet
openen wordt eenmalig de gewone showmap/indexkoppeling aangemaakt; overige
showvelden en functionaliteit blijven de bestaande opslagroute gebruiken.
De AFAS-proef gaat rechtstreeks naar Drive en wordt niet in het bestaande
uitsluitend-Gashouder actieve Supabase-model gezet.

De elf Markdown-resultaten uit esmojo_onderzoeksresultaat worden server-side uit
de bestaande Dataverse-omgeving gelezen, met de bestaande DATAVERSE_TEST_*
credentials. Alleen de exact gekoppelde show-sleutel en bronbibliotheek.
Dit vervangt de AI-inhoud in de weergave, zonder Drive-onderzoeksbestanden,
zelfgeschreven analyses of beoordelingen te overschrijven. Toon AI-concept,
bronversie en importdatum; importdatum is geen onderzoeksdatum. Geen automatische
goedkeuring, Dataverse-writes, Graph-toegang of geplande imports. Geen inhoud,
providerantwoorden of tokens in logs/persistente caches. Bestaande Power Automate
handmatige import blijft los staan. Dit is geen algemene datamigratie.

## Dataverse verbindingstest (10 november 2026)

De gebruiker vraagt een stapsgewijze, afzonderlijke proef; geen migratie.
Vier DATAVERSE_TEST_* variabelen door gebruiker in Vercel Production gezet.
Alleen op bewuste beheerderklik achter actuele account/MFA/admin-controles:
client_credentials naar Microsoft en GET WhoAmI op de bevestigde Dataverse-host.
Volgende expliciet gevraagde stap: uitsluitend de door gebruiker aangemaakte
lege testtabel crf9f_tabel1: metadata plus GET $top=1 met alleen primary-ID.
Gebruiker geeft daarna expliciet opdracht één fictief testrecord aan te maken,
terug te lezen, te wijzigen en te controleren. Alleen vaste test-ID en vaste
herkenbare testtekst, create-only en ETag; herhalen maakt geen duplicaat. Geen
verwijderen, migratie, bestaande gegevens of rollen wijzigen. Geen record-ID
teruggeven/loggen; alleen de fictieve test-ID staat in de testtabel. Geen andere tabellen of bedrijfsgegevens lezen. Alleen vaste diagnosecodes/booleans teruggeven. Providerantwoorden,
identiteitsvelden, clientgeheim en toegangstoken niet loggen, opslaan of tonen.
De eerste proef bewijst geen lees-/schrijfrechten op toekomstige eigen tabellen.
Een werkende proef is geen toestemming voor migratie of productiegebruik.

## Showbeheer Gashouder (10 november 2026)

De gebruiker classificeert Showbeheer (link, pincode en invulstatus) als Openbaar
en staat Supabase-opslag en Vercel-verwerking toe. Alleen Showbeheer krijgt op
expliciet verzoek toegang zonder account, via een geheime showlink plus zescijferige
pincode. Andere modules behouden account/MFA/actuele modulerechten. Geen gegevens
van bestaande rapporten, analyses of accounts via deze externe route vrijgeven.
Aanmaak en uitlezen van de toegang blijven achter de bestaande Shows-autorisatie.
Gebruik een aparte Supabase-tabel met RLS en uitsluitend service-role-toegang;
Openbaar is geen toestemming om pincodes/tokens publiek uit te lezen. Credentials
versleutelen, PIN-verificatie server-side, atomaire pogingslimiet per showlink,
HttpOnly/Secure scoped sessie. Geen secrets in logs of browseropslag; linksecret
in URL-fragment. De knop Verzenden blijft uitgeschakeld, geen e-mails versturen.
Showbeheer blijft optioneel en telt nergens mee voor afronding. Alleen Gashouder,
onder Projectteam; vijf externe lege kaarten A–E en vier Gashouder-statusvakken.

# ESMOJO-projectafspraken

## MOJO-artiestbeschrijving (8 november 2026)

De gebruiker heeft algemene MOJO-artiesttekst, bronlink en ophaaldatum expliciet
Openbaar verklaard. Bewaar de oorspronkelijke algemene tekst duurzaam in de
bestaande Drive-root. Vanaf 45 Nederlandse kalenderdagen vóór de eerste show van
een aaneengesloten reeks vernieuwen, één opname per reeks. Laat de laatste goede
tekst na de show staan tot de volgende verschuldigde reeks. Een verdwenen pagina
of parse-/netwerkfout wist niets. Gebruik alleen de zes bestaande MOJO-zalen.
De artiestkop vervangt Laatste keer in Nederland en Populariteit door deze tekst.

De gebruiker staat op 9 november ook een eenmalige Nederlandse redactionele
AI-beschrijving van 60–70 woorden toe voor bestaande artiesten zonder tekst.
Dit hergebruikt de openbare artiestbeschrijving; registreer de redactionele
herkomst, suggereer geen MOJO-bron. Bewaar bestaande MOJO-teksten en laat de normale
45-dagenopname later voorgaan. Toon maximaal 65 woorden met ...; volledige tekst
blijft in Drive. Foto verwijst naar MOJO. Bij showselectie verdwijnen risicokaart
en artiestinformatie tijdelijk; artiestkop en concerthistorie blijven staan.

## Artiestenrisicoscore en incidentreferenties (8 november 2026)

De gebruiker heeft afgeleide artiestenrisicoscores, historische incidentreferenties,
totalen en actualisatiedatum expliciet Vertrouwelijk verklaard: verwerking via
Vercel, opslag uitsluitend in Drive. Zijn aanvullende opdracht vervangt de
handmatige bezoekers-/volledigheidsbevestigingen: nieuwe concerten gebruiken exact
97,5% van verkochte tickets als bezoekersrekenbasis; historische CSV-concerten vóór
1 november 2026 gebruiken hun geïmporteerde ticket_sales als bezoekersaantal.
Een geüploade CSV geldt als volledig voor beveiliging en medisch. Geen handmatige
bevestiging meer; technische bronvalidatie blijft nodig. Verkoopbron niet
overschrijven en ontbrekende verkoop/CSV niet als nul behandelen. Reken zonder
tussentijdse afronding. Nulreferenties volgen de nieuwste rekenafspraak hieronder.

De gebruiker vraagt aanvullend een vaste incidentdagstand: dagelijks rond 00.00
Nederlandse tijd atomair publiceren en de rest van die kalenderdag niet wijzigen.
Beheerpagina leest uitsluitend de vertrouwelijke opgeslagen Drive-dagstand, zonder
inventarisatie of berekening bij openen. Eenmalige eerste initialisatie mag direct.
Behoud vorige complete dagstand bij fouten; geen herbouw iedere vijf minuten.

Nieuwste opdracht 10 november vervangt de eerdere gedeeltelijke score en nulregel:
25 beveiligingspunten / 10 medische punten, samen35. Beveiliging=max(basisscore,
uitschieterscore), begrensd25. Vijf specifieke categorieën gelijkwaardig:
19 × min(1, procentuele afwijking/300) × min(1, aantal/7). Alleen hoogste bijdrage
plus overige specifieke reguliere punten, nooit totaal als bonus; gelijke bijdragen
volgen vaste categorievolgorde. Medisch blijft proportioneel10/15 zonder uitschieter.
De gebruiker heeft daarna expliciet de gedeeltelijke score hersteld: ontbreken
volledige analyses, toon betrouwbare incidentpunten als incomplete (max35 van100),
geel label, geen risicoklasse en ontbrekende onderdelen null. Volledig: groen label.
Ontbreken ook betrouwbare incidentregistraties, toon:
‘Nog geen risicoscore beschikbaar’. Nul/nul=0; positief/nul is expliciet onbetrouwbaar,
geen schatting/volledige punten en geen totaalscore. Centrale configuratie in
shared/artist-risk-model.js; bezoekersbasis en vaste dagreferenties blijven gelijk.

## Activeringslink kopiëren (10 november 2026)

Op verzoek staat bij ongeactiveerde, niet-geblokkeerde accounts een kopieericoon.
De bestaande beveiligde account-API maakt met Supabase een nieuwe eenmalige link
(invite of recovery), zonder e-mail. Alleen actuele beheerder met MFA; nooit voor
actieve/geblokkeerde accounts. Het geheim blijft in het URL-fragment en tijdelijk
browsergeheugen; uitsluitend na expliciete gebruikersklik naar het klembord.
Geen link/token in Drive, Redis, browseropslag of logs. Activeringslanding
verbruikt geen link vóór expliciete klik. Verifieer token_hash via type=email
(Supabase kiest confirmation/recovery op de hash); één lopende verificatie,
geaccepteerde sessie tijdelijk hergebruiken als vervolgstap mislukt. Houd
netwerkfouten apart van otp_expired. Vergrendel linkuitgifte per account buiten
herbouwde knoppen om, voor zowel mail als kopiëren. Een nieuw activeringsfragment
in hetzelfde tabblad start de authpagina opnieuw; MFA blijft verplicht. Bij klembordweigering kan
de beheerder dezelfde link tijdelijk handmatig kopiëren. Mailuitnodigen blijft apart.

## Artiestpagina: gezamenlijke landing en stille rapporten (10 november 2026)

Nieuwste laadopdracht: profiel en risicoscore parallel ophalen en samen tonen;
de aanvankelijke submenu-laadstatus eindigt pas daarna. Vervolgens rapporten
stil op de achtergrond nieuwste-eerst, zonder laadstatus bij concertdatums.
Alleen bij expliciet openen van een niet geladen show het bestaande submenu-
rondje naast de actieve artiest. Klikprioriteit, cache, annulering en errors behouden.
Getoonde risicocomponenten ronden elk naar hele punten (.5 naar boven); batterij
plus zichtbaar totaal gebruiken die getoonde punten. Rekenwaarden en risicoklasse
blijven ongerond; referenties op Beheerder/Incidenten houden drie decimalen.

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
Standaard-PNG’s zijn oorspronkelijk aangeleverd via src/assets/barrier-layouts;
sinds V1.72 alleen private Drive-referenties. Geen vervangende afbeeldingen zoeken
of genereren. Zie docs/production-assessments.md.

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
dit blok rechts van Barrieropstelling en bij ieder operationeel risico gebruikt, op dezelfde breedte
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

Uitsluitend voor het serverzijdig geladen beheerdersaccount super-admin@example.invalid
heeft de gebruiker een vaste extra testmailontvanger test-copy@example.invalid
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
Operationele risico’s volgen vanaf V1.43 de actuele brongebonden individuele
beoordelingen; beheersmaatregelen blijven voorlopig onafgerond.
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

Op 4 november 2026 heeft de gebruiker het vaste bestaande beheerdersaccount
expliciet aangewezen als Super beheerder; de identiteit staat uitsluitend in Drive. De vaste private identiteit in de ondertekende
Drive-accountbrug behoudt die rol; bestaande profielcontrole promoveert dit
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

Vanaf 4 november 2026 bestaat /rapportages/Jungle_Ziggo-Dome_03112026 met submenu Jungle. Het begon als vaste vormgevingsvoorbeeldpagina; vanaf V1.41 werkt de
rapportagewebsite dynamisch volgens docs/dynamic-web-reports.md. De bestaande CSV in de private OnTrack-map is expliciet als bron bevestigd.
Geen echte CSV/PDF/incidentteksten in Git, builds of CI-fixtures opnemen. Vercel
rekent met de bestaande calculateReport-functie. De gedeelde web-renderer toont
zes fluid kaarten en alle incidenten, met normale 14px tekst en beide thema’s.
Geen iframe, nieuwe PDF, AI-research, showwijziging of mailactie voor deze weergave.

Actie report-web vereist de actuele Rapportages-module na MFA. De getekende
Drive-operatie web-preview controleert opnieuw actieve moduletoegang, ook voor
gewone gebruikers. Vanaf V1.41 uitsluitend bekende canonieke concert-ID’s; geen vrije bestands-ID,
naam, actor, URL of pad uit de browser. Oude Jungle-slug alleen als alias. De Drive-leesoperatie accepteert uitsluitend de bij dat concert gevalideerde CSV,
juiste map, MIME, grootte en bronhash; rapportregister/CSV blijven intact.
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
melden. Automatische CSV-webkoppeling is vanaf V1.41 geïmplementeerd volgens
docs/dynamic-web-reports.md, onafhankelijk van PDF/mail.

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

Op aanvullend verzoek 4 november 2026 tonen rapportdatumtabs maximaal vijf unieke
showdatums, nieuwste links en oudste rechts; standaard de nieuwste actief.
Bij minder beschikbare datums geen tabs aanvullen. Zesde/oudere show geen tab of
extra archiefbediening geven. Gebruik reportTabDates in src/lib/report-view.js;
behoud per-datum datasets en de bestaande compacte header. Submenu ongewijzigd.

In de individuele rapportagewebsite-incidenten heet het bestaande note-veld
Afhandeling (voorheen Notitie); bronveld en inhoud blijven ongewijzigd.


## Homepage planningdashboard

De op 4 november 2026 aangeleverde overdracht/HTML bepalen de homepage: uitsluitend
hoofdmenu, geen submenu, fluid 1/2/1-kolommen en lichte dashboardstijl. Bestaand
hoofdmenu blijft ongewijzigd. Foto's exact 320:213, alleen echte MOJO-foto's;
ontbrekende tijden/foto's niet invullen met demo's. De expliciete referentie-
clamps/cqw-typografie zijn uitsluitend voor de linker concertkaarten toegestaan.
Gebruik alleen de canonieke Gashouder-catalogus, nooit het OnTrack-locatieregister.
Hergebruik bestaande reeksidentiteit en src/lib/show-planning.js; geen alternatieve
intervallen of fictieve afrondingen. Zie docs/homepage-dashboard.md voor de
minimale beveiligde readroute en statusbronnen.

Op 5 november 2026 heeft de gebruiker de account-showkoppeling expliciet
Vertrouwelijk in Drive bevestigd, plus Afgerond als — en geen Voor op schema
zolang algemene afrond-/voorsprongregels ontbreken. Bewaar relaties uitsluitend
in Productie/_esmojo_show_assignments_v1.json, nooit in de openbare concertindex.
ShowAssignments.gs bevat één vervangbare tijdelijke regel voor Richards bestaande
exacte account. Backfill en nieuwe import gebruiken dezelfde idempotente regel;
bestaande rollen/relaties blijven behouden, geen nieuw account. Alle gewone
module-/MFA-controles blijven gelden; een managerrelatie verleent geen modules.
Showlijsten en Mijn shows tellen werkelijke gekoppelde concertdagen, met de
canonieke reeksroute als bestemming. Gedeelde reeksdeadlines tellen één keer.


## MOJO-tijdschema's in rapportages

Op 5 november 2026 heeft de gebruiker de online geplande showtijden Openbaar
verklaard. Alleen canonieke mojo.nl-concertpagina's; vastleggen op de eigen
showdag om 12:00 Nederland via de bestaande middagworkflow, nooit een vroegere
of latere opname als 12:00 presenteren. Bewaar werkelijke capturedAt en bron.
GitHub-vertraging wordt niet verborgen. Beschikbare opnamen blijven immutable
in OnTrack/Tijdschemas, ook na verdwijnen van de bron. Geen retroactieve tijden
verzinnen voor historische rapporten zonder opname. Meerdere acts, surprise,
pauzes en nachtelijke tijden krijgen eigen chronologische tussenkoppen in de
incidentenlijst; geen incident/KPI/grafiek/PDF-wijziging. Houd filtering en alle
Reports/MFA-/Drive-controles intact. Zie docs/report-timetables.md.


## Homepage: openbare cache en achtergrondstatus

Op 5 november 2026 heeft de gebruiker expliciet openbare homepagegegevens in
lokale browseropslag toegestaan: concertmetadata, MOJO-foto-URL's en openbare
plannings-/afrondstatussen. Accountgegevens, rechten en persoonlijke showkoppelingen
nooit mee opslaan. home-cache.js whitelists deze gegevens en voegt privérelaties
pas na de bestaande beveiligde sessie toe in geheugen. Bij hercontrole altijd de
laatst bevestigde status laten staan totdat een nieuwe status bevestigd is; geen
zichtbare laadbeurt bij navigatie/verversen. Oude/late accountreacties negeren.
Een openbare statusprojectie in Drive en CacheService vervangt N bronlezingen;
bronwijzigingen werken de betreffende reeks bij. Session/restore levert de
projectie mee, met alle actuele module-/MFA-controles. Supabase is toegestaan voor
openbare planning maar niet vereist en hiervoor niet toegevoegd.

Homepage volgt nu ook donker systeemthema. Groepeer kaarten per canonieke reeks,
toon alle showdatums samen, maximaal vijf aankomende en zes Mijn shows, eerstvolgende
bovenaan. Teller telt alle toekomstige eigen reeksen. Haal afgeronde taken en
volledig afgelopen reeksen uit de deadline-lijst, behoud ze in de kalender.
Bereken daggroepen opnieuw om Nederlandse middernacht. Nog niet gebouwde
operationele/maatregelafrondingen blijven open. Zie docs/homepage-dashboard.md.


## Automatische CSV-webrapportages

Op 5 november 2026 heeft de gebruiker gevraagd iedere geldige gekoppelde CSV in
OnTrack automatisch als webrapportage te tonen, met één submenu-item per artiest
en maximaal vijf nieuwste eigen datumdatasets in de header. Reeds opgeslagen
concertkoppeling vóór exacte/unieke concert-ID-bestandsnaammatch. De gebruiker heeft historische fallback expliciet bevestigd: artiest, bekende
zaal en geldige datum uit het concert-ID, mits CSV-datums aansluiten. Alleen
webmetadata, geen nieuw Shows-/mailconcert. Gebruik mooie zaalnamen, zoals Ziggo
Dome, AFAS Live en Johan Cruijff Arena. Ambigue bestaande matches niet omzeilen.

WebReports.gs bewaart uitsluitend validatiemetadata in het aparte Vertrouwelijke
_esmojo_web_reports_v1.json in dezelfde private Drive-map. Geen wijziging aan het
bestaande PDF-/mailregister, bronbestanden, ontvangers of verzendtriggers. De aparte
vijfminutenworker en controle bij openen/herladen starten geen PDF of mail.
Nieuwe API's vallen onder actuele Reports/MFA- en signed Drive-controle; geen
anonieme rapport-/CSV-links. Menu en incidentdatasets uitsluitend sessiegeheugen,
geen homepage-localStorage-toestemming overnemen voor vertrouwelijke rapporten.
Datumtabs lezen lui de eigen gevalideerde bron, eigen metadata/foto/tijdschema;
late reacties negeren. Zie docs/dynamic-web-reports.md.

Historische webfoto's mogen alleen van een echte MOJO-pagina waarvan artiest,
exacte datum en zaal/stad overeenkomen. report-source.js doet dat uitsluitend op
de achtergrond; geen gegokte bron-URL tonen of bewaren en geen tijdschema achteraf
als showdagopname presenteren. De afzonderlijke webindex bewaart openbare foto-
URL's naast validatiemetadata; de incident-/CSV-inhoud blijft eigen Drive-bestand.


Rapportagekoppeling V1.42: concert-ID's vergelijken hoofdletterongevoelig met
spaties, underscores en koppeltekens als equivalente scheidingstekens, plus de
centrale zaalaliassen. Een exacte of unieke match behoudt het bestaande concert;
ambiguïteit wordt niet als nieuwe filenamefallback omzeild. Bij filenamefallback
wordt ook buiten de catalogus het bestaande Tijdschemas-archief gelezen: dezelfde
artiest, canonieke zaal en datum, unieke match en ongewijzigde noonvalidatie.
Geen archief herschrijven of ontbrekende tijden reconstrueren. Alleen de webflow;
PDF-/mailregister, ontvangers en verzendmomenten blijven ongewijzigd.



## Operationele risicobeoordeling

Vanaf V1.43 gebruikt ieder operationeel risico de bestaande Risico beoordeling-
kaart zonder standaardselectie. Geen risico vereist Toelichting; Laag bewaart
geen tekst; Midden/Hoog vereisen Beheersmaatregel. Status is Nog te beoordelen
of de bevestigde risicoklasse. Bewerken verandert pas na bevestigde Opslaan.
Deze beoordelingen/toelichtingen/maatregelen vallen onder de bestaande
Vertrouwelijke risicobeoordelingen: Vercel-verwerking, uitsluitend Drive-opslag.
Bewaar operationalReviews per PDF-bronrevisie in productionele-risicos.json,
met eigen revisie per risico, historie en readback. Geen AI-bron overschrijven.
Nieuwe actuele PDF/analyses nemen oude beoordelingen nooit over. Een beschikbare
analyse zonder geïdentificeerde risico’s heeft geen open beoordelingen; een
ontbrekende of verouderde analyse blijft open. Planning en openbare homeprojectie
ronden alleen af als alle actuele risico’s geldig beoordeeld zijn. Projecteer
uitsluitend de afrondvlag; geen risicoklasse/tekst/historie in openbare cache.
Maatregelen worden hier alleen bewaard; hun implementatiestap blijft open.

Vanaf V1.45 keert Opslaan bij een operationeel risico direct terug naar het
Risicoanalyse-overzicht. Toon de gekozen klasse direct; rond de planning pas af
na bevestigde serveropslag. Operational-review-memory bewaart tijdelijke invoer,
wachtrij en fouten in het bestaande showgeheugen, ook bij SPA-navigatie. Geen
persistente browseropslag. Eén verzoek tegelijk; overige risico's blijven
bedienbaar. Toon een fout bij het betreffende risico, behoud invoer en vereis
een bewuste herpoging. Afmelden/rolwissel wist het geheugen en start geen nog
niet begonnen schrijfacties meer. De bron-/revisiecontroles blijven behouden.


## Beheersmaatregelen op het showtabblad

Vanaf V1.46 bundelt Maatregelen alle expliciete Midden/Hoog-notities uit de
productie- en actuele operationele beoordelingen. Gebruik showMeasures uit
src/lib/show-planning.js ook voor de server/homeprojectie. Barrier gebruikt
riskNote (geen ontwerpnotities), Vloerdruk note; Geen risico/Laag-toelichtingen
zijn geen maatregel. Operationele maatregelen alleen uit de actuele analyse,
nooit een oude PDF-bron of een niet meer geïdentificeerd risico.

De kaart Beheersmaatregelen gebruikt bestaande showkaarten in licht/donker.
Iedere maatregel heeft een eigen leesbare detailweergave en de status Nog niet
geïmplementeerd; de renderer kent ook Geïmplementeerd voor de latere workflow.
Voeg nu geen implementatieformulier of afvinkknop toe. Er is geen implementatie-
status opgeslagen of verzonnen. Het betreft bestaande Vertrouwelijke inhoud;
alleen de al toegestane afrondvlag mag in de openbare homeprojectie/cache staan.

Alleen als alle toepasselijke productiebeoordelingen én alle huidige operationele
risico’s zijn afgerond en er geen maatregelen bestaan, toon exact “Geen
beheersmaatregelen voor deze show” en rond de implementatieplanning automatisch
af. Onbekende/onvolledige/historische Midden/Hoog-notities nooit als maatregelenvrij
behandelen. Met maatregelen blijft de planning open tot de latere implementatie-
workflow echt is gebouwd. Geen nieuwe opslag of API; hergebruik beveiligde
showcontext en bestaande beoordelingsresponses; lees niets extra bij tabwissels.


## Jaartellers homepage

Vanaf V1.47 heten de cijfers Mijn shows dit jaar en Afgerond. Gebruik
het Nederlandse huidige kalenderjaar, 1 januari t/m 31 december, op basis van
de daadwerkelijke showdatum (niet de datum waarop het voorbereidingswerk af is).
Tel gekoppelde werkelijke concertdagen, ook verleden in hetzelfde jaar; reeksen
blijven één kaart maar meerdere showdatums tellen apart. Gebruik de bestaande
persoonlijke dagkoppelingen, geen rechten afleiden uit de openbare catalogus.
Geannuleerd/verwijderd/andere zaal en verdwenen toekomstige dagen tellen niet.

Een show is direct Afgerond zodra alle vier bevestigde voorbereidingsstappen
af zijn: showprofiel, operationeel, productie en maatregelen. Wacht niet op de
showdag; die blijft een datum, geen fictieve afvinkstatus. Heropening trekt de
afrondtelling direct terug. Onbekende planning telt niet als afgerond. Beide
cijfers gebruiken uitsluitend de bestaande beveiligde homepagegegevens/cache,
zonder nieuwe opslag of extra reads, en wisselen op Nederlandse Nieuwjaarsdag.


## Directe navigatie vanuit deadlines

Vanaf V1.49 is iedere deadline-rij een echte interne link naar de canonieke show
met een gewhitelist tab-query: profile → showprofiel, operational/production →
risicoanalyse, measures → maatregelen, show → overzicht. Kalenderlinks gebruiken
dezelfde bestemming. Lees ?tab= via shared/show-navigation.js en kies het expliciete
tabblad vóór de eerste zichtbare showweergave; dit gaat vóór de onthouden tab in
showgeheugen. Zonder geldige tab-query blijft bestaande tabherinnering werken.
Geen tussenpagina, programmatische tweede klik of extra nieuwe API/leesronde.
Bestaande module-/MFA-controle, canonieke reeksroute en SPA-router blijven gelden;
gewone links ondersteunen toetsenbord, nieuw tabblad en terug-/vooruitnavigatie.


## Beheersmaatregel implementeren (V1.50)

Op 6 november 2026 heeft de gebruiker de afzonderlijke beoordeling na implementatie,
de briefingkeuze en RI&E-/plandocumenten expliciet Vertrouwelijk verklaard met
opslag in de bestaande Drive-showmap en verwerking via de beveiligde ESMOJO/Vercel-route.
De eerdere leesweergave V1.46 is hiermee uitgebreid. Bewaar implementatierecords,
revisies en historie in productionele-risicos.json; oorspronkelijke riskLevel blijft
ongewijzigd. Een maatregel heeft status Nog te implementeren totdat expliciet
Beheersmaatregel afronden is bevestigd met een gekozen na-implementatieklasse.
Briefing is alleen een opgeslagen keuze. Bronwijzigingen maken eerdere implementatie
ongeldig; kopieer nooit scores tussen PDF-revisies. Alle actuele maatregelen moeten
geïmplementeerd zijn voordat de planning afrondt; de bestaande maatregelenvrije
afrondregel blijft behouden. Alleen de afrondvlag gaat naar de openbare homeprojectie.

Gebruik gedeelde shared/measure-workflow.js voor definities/validatie/projectie en
houd de Apps Script-spiegel MeasureValidators.gs exact gelijk. Bestanden alleen
PDF/PNG/JPG tot 2 MiB, private canonieke parent en geregistreerde UUID/hash; download
via dezelfde actuele account-/MFA-/Shows-controle. Geen openbare Drive-links of
persistente browseropslag. Suggesties zijn algemene procesaandachtspunten, zonder
nieuwe AI-dienst of verzonnen showspecifieke veiligheidsinstructies. Zie
docs/measure-implementation.md.

## Showrapportagemail met online rapportagelink (V1.51)

Op 6 november 2026 heeft de gebruiker de bestaande showrapportagemail aangepast:
onderwerp én titel Showrapportage [artiestnaam] - [Nederlandse showdatum], blauwe
knop met exact Showprofiel openen naar https://esmojo.nl/rapportages/<canoniek-ID>,
in nieuw tabblad. Behoud persoonlijke ontvangersaanhef, PDF-bijlage, bestaande
verzendtrigger, ontvangers, afzender/reply-to en module-/MFA-beveiliging. De URL
blijft bij sessieherstel en na wachtwoord/TOTP-aanmelding behouden.

De gebruiker vraagt expliciet de naam van de werkelijk gekoppelde event safety
manager als ondertekening te verwerken via dezelfde vertrouwelijke Drive/Vercel/
Resend-route. Gebruik uitsluitend de exacte bestaande event-safety-manager-relatie
uit _esmojo_show_assignments_v1.json en het bestaande actieve accountprofiel,
geen nieuwe relatie/account of afleiding uit ontvanger/beheerder. Zonder unieke
bruikbare manager heeft de gebruiker Event Safety Mobility Operations als fallback
bevestigd. Snapshot de gekozen naam en templateversie in de bestaande private
levering vóór de eerste mailpoging, zodat herpogingen dezelfde inhoud behouden.
Reeds verzonden mails niet opnieuw versturen; onzekere oude templatepogingen gaan
naar review, nooit met gewijzigde inhoud op dezelfde provider-sleutel herhalen.

Alleen de showrapportagemail gebruikt als footer exact: Alle informatie in deze
mail, en in ESMOJO, is strikt vertrouwelijk en mag niet verspreid worden zonder
nadrukkelijke toestemming van MOJO Concerts. De gedeelde renderer escape't deze
footer ook in HTML en neemt dezelfde tekst op in plain text. Accountmails houden
hun bestaande footer. Veilige previews/tests versturen geen echte e-mails.

Vanaf V1.52 gebruikt show-report (ook de bewuste mailtest) de vaste afzender
ESMOJO <showrapportage@esmojo.nl>. Gebruik senderId show-report en de centrale
server/email-senders.js; accepteer geen vrij afzenderadres uit requests. De gewone
accountmail behoudt no-reply@esmojo.nl. Nieuwe OnTrack-afleveringen bewaren deze
senderId in hun private mail-snapshot; reeds gestarte oude afleveringen zonder
senderId behouden de oorspronkelijke default-afzender bij herpoging, zodat dezelfde
Resend-idempotentiesleutel nooit een gewijzigde afzender krijgt. Ondertekening in
de inhoud, overige mailinhoud, ontvangers en verzendmomenten blijven hetzelfde.

## Documentkaart en verplichte briefingkeuze (V1.53)

Op 6 november 2026: Document uploaden staat buiten Suggesties, naast Voorgestelde
beheersmaatregel. Beide kaarten altijd gelijk hoog, ook wanneer ze op smalle
schermen onder elkaar komen. Suggesties bevat alleen informatieve suggesties.
Meenemen in briefing krijgt een eigen kaart zoals risicobeoordeling, met Ja/Nee-
radio's zonder standaardkeuze. Beide neutraal grijs, uitsluitend gekozen Ja groen.
Afronden vereist een geldige na-implementatieklasse én expliciete briefingkeuze,
ook in API, Drive-validatie en gedeelde planning. Briefing blijft uitsluitend een
keuze, zonder nieuwe briefingfunctie. Bewaar briefing null/boolean en technische
briefingChosen-bevestiging binnen dezelfde reeds goedgekeurde vertrouwelijke route.
Oude true behouden; oude false zonder briefingChosen was impliciet en wordt als
onbeantwoord weergegeven. Geen historische bron of originele beoordeling wissen.

## Achtergrondopslag en detailbediening (V1.54)

De gebruiker heeft op 6 november 2026 achtergrondopslag als websitebrede standaard
gevraagd. Opslaan/afronden valideert lokaal, start de serveractie en geeft de
navigatie direct vrij. Alleen serverbevestiging maakt iets definitief/afgerond;
geen optimistische planning of verlies van revisie-/bron-/module-/MFA-controles.
Gebruik auth.access voor alle mutaties en src/lib/background-saves.js voor
verwerking/afsluitwaarschuwing. Registreer ook nog wachtende/debounced taken via
watch, zodat de melding vóór het eerste netwerkverzoek werkt. Houd dezelfde
record tijdens opslag tegen dubbele writes beschermd, laat andere onderdelen vrij.

Risico-/maatregelafronding keert direct terug naar het eigen overzicht. Lange
analyseafronding sluit de overlay meteen; accounts keren meteen naar de lijst.
Bezoekersvelden bewaren hun lease tot hun eigen write klaar is; andere velden
blijven bruikbaar. Wachtrijen stoppen vervolgacties na een onzekere write en
starten na afmelden/rol-/accountwissel geen nieuwe actie meer. Fouten blijven
zichtbaar in een centrale melding met link naar het betreffende onderdeel.
Formulier-/herstelgegevens alleen tijdelijk sessiegeheugen, nooit localStorage,
IndexedDB, logs of een nieuwe service. Afmelden/rechtenwissel wist dit geheugen.
Authenticatie en veiligheidscontroles blijven daadwerkelijk bevestigd vóór toegang.

Afsluittekst: ESMOJO is nog gegevens aan het verwerken, weet je zeker dat je wilt
afsluiten? Gebruik native beforeunload; browsers kiezen doorgaans hun eigen tekst.
Bij bewust afmelden met open taken dezelfde tekst als bevestigingsvraag gebruiken.
Geen sendBeacon met vertrouwelijke payload of automatische herpoging na een fout.

Beheersmaatregel heet nu Beheersmaatregel en bevat direct een tekstvak, zonder
Bewerken/Opslaan-knoppen. Bewaar na 600ms typpauze en flush bij blur/navigatie;
serialiseer met beoordelingen/afronding en behoud verder getypte tekst tijdens een
lopende write. Na afronden alleen-lezen; edit-text wordt ook serverzijdig geweigerd
tot expliciet heropenen. Geen normale statustekst onder de afrondknop. Briefing:
Nee links, Ja rechts. Beide keuzes blijven verplicht en zonder standaardselectie.

Gebruik detailBackButton uit src/detail-back.js voor alle bestaande detailpagina's
van Showprofiel, Risicoanalyse, Maatregelen en bezoekers-/productiedetails: alleen
een linkerpijl, 40×40px, in de titelregel links van het bestaande icoon. Behoud
aria-label/title Terug naar overzicht en de bestaande terugbestemming.

Rapportagewebsite: incidenttypekaarten tonen maximaal vijf echte types, op aantal
en oorspronkelijke CSV-positie bij gelijke aantallen. Caption blijft Meest gemelde
incidenttypes. Showverloop toont alleen een kloktijd (21.00) in een tooltip zoals
het hoofdmenu. Gebruik opgeslagen, gevalideerde MOJO-grenzen alleen wanneer zowel
eenduidig deuren open als gepland einde beschikbaar zijn. Anders exact de oude
periode. Ook over middernacht; geen tijden raden of achteraf ophalen. Webvenster
rekent kalenderhalfuurvakken binnen die grenzen, met eventueel gedeeltelijke
randvakken. PDF-/CSV-/KPI-/incidentlijst- en mailrekenregels blijven ongewijzigd.

Vanaf V1.55 zijn gewone opslagvoortgang en opslagsucces stil: toon geen Concept
wordt opgeslagen, Concept opgeslagen of Opgeslagen in detailkaarten. Behoud
workflowstatussen zoals Concept/Afgerond op basis van bevestigde gegevens,
foutmeldingen en de centrale afsluitwaarschuwing. Verberg lege statusregels zodat
ze geen ruimte innemen. Ook tijdens een write de laatst bevestigde status tonen.

Showrapportagemail V1.55: zichtbare blauwe header uitsluitend Showrapportage;
onderwerp blijft Showrapportage [artiest] - [showdatum]. Nieuwe afleveringen
leggen mailversie online-report-v2 vast. Herpogingen van online-report-v1 behouden
de lange header voor ongewijzigde inhoud op dezelfde idempotentiesleutel.

## Centrale foutmeldingen en bewuste productieopslag (V1.56)

Opslag-/actieproblemen in de show-, account- en beheerformulieren gaan via
src/lib/page-feedback.js naar save-notice rechtsonder; geen dubbele rode
paginamelding. Bekijken en herstelacties zijn gelijk vormgegeven tekstacties.
Gebruik bestaande expliciete herstelroutes, behoud invoer en bron-/revisiechecks;
geen generieke blinde retryknop. Bind callbacks aan de geopende pagina/sessie en
ruim ze bij verlaten/afmelden op. Vaste gebruikerscopy, geen ruwe serverfoutinhoud.

De gebruiker vraagt één stille tweede opslagpoging vóór een foutmelding.
retrySave in auth.access probeert tijdelijke transport-/dienstfouten maximaal
één keer opnieuw voor expliciet toegestane versiegebonden showmutaties.
Verzoekinhoud/revisie/bron/upload-ID blijven identiek; waar mogelijk teruglezen
om verloren bevestiging zonder nieuwe write te herkennen. Geen retry voor
validatie/toegang/conflicten of na sessiewissel; geen blinde tweede uitnodiging,
accountcreatie of mailactie. Nieuwe mutaties pas toelaten na idempotentiecontrole.

Barrieropstelling en Vloerdruk slaan uitsluitend op na hun Opslaan-/afrondknop:
selecteren, rekenen, typen, blur of detail verlaten verstuurt geen conceptwrite.
Alle standaardbarriers selecteren synchroon Geen risico; Afwijkend ontwerp wist
de voorselectie. Andere risicoklassen blijven handmatig beschikbaar. Lokale
invoer en geselecteerde afwijkende bestanden blijven alleen in sessiegeheugen.
Na Opslaan: zo nodig custom-concept/upload en vervolgens afronding serieel met
actuele revisies; gebruiker mag direct door. Alleen bevestigd afronden telt in
de planning. Dit vervangt de eerdere automatische standaardbarrierafronding.

Showrapportagemail: nieuwe online-report-v3-afleveringen hebben uitsluitend de
onlineknop, geen PDF-bijlage of bijlagevermelding. PDF-generatie/download blijft
bestaan. Oude onzekere v1/v2-afleveringen houden oorspronkelijke header/bijlage
op dezelfde idempotentiesleutel. Onderwerp, ondertekening, afzender, ontvangers,
footer en triggers blijven behouden. Nooit echte testmails versturen voor preview.

## Online rapportagemail en PDF-meldingen (V1.57)

Vanaf 6 november vraagt de gebruiker mail zodra een gevalideerde rapportage op
ESMOJO zichtbaar is, onafhankelijk van PDF-generatie/bestanden/assets. Gebruik
server/online-report-mail.js en OnlineReportMail.gs binnen dezelfde goedgekeurde
vertrouwelijke Drive/Vercel/Resend-route. onlineReports in het bestaande register
heeft eigen afleveringen, leases, stabiele providerkeys, bevroren ontvanger/manager
bij eerste poging, actuele modulecontrole en bestaande 3-pogingen/23u-reviewgrens.
Nieuwe mail heeft uitsluitend de onlineknop, geen PDF. Start vanuit webpublicatie
(incl. backgroundhook bij gebruikerspublicatie) en vóór de PDF-worker. Een mailfout
mag een gevalideerde webpublicatie niet ongeldig maken. PDF blijft een aparte taak.

Geen dubbele mail bij migratie: neem bestaande afleveringen via legacyReportId
over, met oude idempotentiesleutel/inhoud en eventueel oorspronkelijke v1/v2-PDF.
Oude v3-afleveringen hebben geen PDF-bestand of assets meer nodig maar vereisen
wel huidige online beschikbaarheid. Nieuwe PDF-commits maken na omschakeling geen
mailleveringen meer. Een bewuste bestaande verzendactie hergebruikt de online
registratie, geen tweede sleutel. Bij eerste omschakeling bestaande onbekende
filename-archieven niet spontaan terugmailen; nieuwe publicaties daarna wel.
Bestaande canonieke, nog niet gemailde publicaties worden ingehaald. De gebruiker
heeft de inhaalmail voor Don Toliver expliciet geautoriseerd; controleer na livegang
de echte providerbevestiging in Drive zonder incidenten/ontvangers in CI-logs.

Na login vraagt de client report-alerts op de achtergrond op. De read vereist
actieve sessie, MFA en Rapportages; Drive laat meldingen alleen aan beheerders of
ingestelde ontvangers zien. Toon bekende PDF-fouten/assetblokkades voor zichtbare
rapportages in de bestaande centrale melding met directe rapportagelink. Geen
herhaalde poll of vertrouwelijke browseropslag; late antwoorden na afmelden of
rechten-/accountwissel niet tonen. Deze read blokkeert de homepage nooit.

## Actieve showopslag en archivering (V1.58)

De gebruiker heeft op 6 november 2026 Supabase als primaire opslag voor de actieve
showvoorbereiding expliciet goedgekeurd. Dit is een gerichte uitzondering op de
oudere uitsluitend-Drive-regels voor samenvattingen/eindcijfers, beoordelingen,
maatregeltekst, implementatie, briefing en bijbehorende technische/public-statusvelden.
Accountprofielen, uploads, CSV/incidentrapportages, kaartverkoop en bezoekersherkomst
blijven ALTIJD uitsluitend in Drive. De volledige vloerdrukbron bevat aantallen en
blijft daarom ook daar; alleen haar beoordelingssamenvatting mag in de actieve DB.
Alleen bestaande bestandsreferenties/metadata, nooit uploadbytes in Supabase.
Persoonlijke showkoppelingen blijven Drive. Geen nieuwe persistente privébrowsercache.

Zie docs/active-show-storage.md. Serverroutes houden MFA, actuele Drive-moduletoegang,
validaties en revisies. Nieuwe DB-tabellen hebben RLS en uitsluitend serverrechten.
Geen servicekey naar browser of Apps Script. Een databasebevestiging is duurzaam;
Drive-kopie gebeurt onafhankelijk zonder de gebruiker te blokkeren. Geen globale
opslagevents gebruiken om verborgen showprofiel/PDF-widgets opnieuw te creëren.
Terugkeer naar een show gebruikt bevestigde snapshots tijdens lopende writes.

Archiveer vanaf lokale Nederlandse middernacht op laatste showdatum + twee dagen:
2 november → 4 november, een reeks 6/7/8 november → 10 november. Eerst volledig naar
de canonieke Drive-map schrijven en controleren, dan pas DB-show en ontvangstbewijzen
verwijderen. Bij een fout bron behouden, centraal melden en automatisch herstellen.
Na archivering alleen Drive, geen herimport van historische shows. Laat vormgeving,
handmatige barrier/vloeropslag en alle bestaande beoordelings-/afrondregels intact.
Een storing mag nooit stil terugvallen op verouderde Drive-voorbereidingsgegevens.

Ook bij zomertijd geldt minimaal 24 werkelijk verstreken uren na het einde van de
laatste showdag. Archiveer nooit vóór de tweede volgende Nederlandse kalenderdag;
bij een korte zondag kan de grens één uur na middernacht liggen. Herbereken deze
grens uit de brondata vóór verwijderen, ook bij oudere afgeleide DB-cutoffs.

## API-envelop en show-open (V1.60–V1.61)

Technische homePlanning/storageStale-velden worden in auth verwerkt en daarna via
accessResultPayload van de domeinpayload gescheiden. Normaliseer ook raw/injected
responses vóór de showcache. Versoepel strikte keuzevalidators niet om metadata te
accepteren. Productionele HTTP-keuzes geven de homepage-envelop alleen aan clients
met X-ESMOJO-Planning-Envelope: 1; oudere geopende clients krijgen de strikte staat,
zodat hun bewaarde wachtrij ook na publicatie kan hervatten.

Voor een nieuwe actieve show combineert active-open de atomische claim, snapshot en
volledige bundel in één signed read. Bij een race de gecommitteerde DB-stand lezen,
nooit een oude bootstrapbundel tonen. Staged deploy behoudt de oude laadroute zolang
Apps Script de nieuwe operatie nog niet kent. Hergebruik binnen dezelfde read de
canonieke target, filelookups/blobs en reeds geladen finalisatie/risicoprojectie.
Geen persistente privé-cache; na writes cache wissen en echte Drive-readback houden.
De beschermde workercontrole mag een virtuele show-open lezen met technische
storage-worker-read-identiteit; nooit die identiteit of privérespons opslaan/loggen.
Alleen gereedvlag en Drive-rondetijd mogen in de workflow-uitvoer verschijnen.

## Direct rapportagesmenu (V1.62)

Op 6 november heeft de gebruiker expliciet toestemming gegeven uitsluitend
rapportagemenugegevens (artiest, concert-ID, zaal en beschikbare datums) lokaal
in de browser te bewaren. Dit is een gerichte uitzondering op de eerdere
uitsluitend-sessiegeheugenregel voor rapportbeschikbaarheid. Gebruik
report-catalogue-cache.js met een strikte whitelist; geen revisie-/bronhashes,
incidenten, aantallen, foto's, CSV-/rapportinhoud, profielen, tokens of rechten
in deze cache. De menuvelden blijven na afmelden beschikbaar voor volgende
sessies, maar worden pas getoond na actuele sessie-/modulecontrole. Geen
gebundelde openbare catalogus of wijziging van serverautorisatie.

Toon de bekende lijst direct en behoud haar tijdens controles/fouten. Controleer
bij openen/focus/zichtbaar worden altijd opnieuw, zonder minuutwachttijd, en
elke 30 seconden zolang Rapportages zichtbaar is. Deel gelijktijdige aanvragen;
late antwoorden na sessiewissel niet tonen/bewaren. Actuele lege lijsten moeten
de eerdere lijst vervangen. Sortering en week-/periodegroepen blijven lokaal
uit echte beschikbare datums berekend; geselecteerde rapportage niet wisselen
als nieuwe rapportages binnenkomen.

## Eenmalige geautoriseerde bezorgproef (V1.63)

Op 6 november heeft de gebruiker expliciet drie testmails via Resend naar het
eigen zakelijke adres gevraagd om Proofpoint-aflevering te onderzoeken. De vaste
main/OIDC-workflow email-deliverability.yml mag uitsluitend de vaste batch in
server/email-deliverability.js uitvoeren. Geen vrije ontvanger, afzender, inhoud
of provider-ID; statusreads vereisen HMAC-bewijzen voor eigen test-ID's. Sleutel
blijft serverzijdig, IDs/bewijzen uitsluitend tijdelijk workflowgeheugen. Alleen
variantlabels en technische statussen in logs. Geen echte verzending in tests/CI.

De route sluit automatisch op 7 november 00:00 Nederlandse tijd. Vaste
idempotentiesleutels binnen die beperkte periode voorkomen extra mails bij
verloren bevestiging/herhaling. Geen schema, appfunctie of rapportagetrigger
wijzigen. Geen datum/batch automatisch verlengen zonder nieuw gebruikersverzoek.

## Uitsluitend mobiele navigatie (V1.64)

Op 7 november vraagt de gebruiker alleen op mobiel een kleine ronde menuknop
linksboven, met paginavullende fluid-inhoud en kaarten onder elkaar. Tot en met
700 CSS-pixels (en op korte aanraakschermen tot 1000px in liggende stand)
gebruikt mobile-navigation.js dezelfde rail/submenu-elementen in
een native dialoog; geen kopie van catalogus, autorisatie of opslag. Gesloten
menu neemt geen inhoudsbreedte of lange lijst boven de inhoud in. Sectiekeuze
houdt het menu open voor het submenu; een paginakeuze sluit het en focust inhoud.
Bestaande zoek-, laad- en toegangsstatussen blijven leidend. De kleine header
spiegelt bestaande aria-busy-status, zonder nieuwe dataverzoeken.

Behoud de gewone desktopweergave, inclusief oorspronkelijke DOM-positie van beide
menu's bij resizen. Herstel focus en scrollen bij sluiten, Escape, sessieverlies
en viewportwissel. Gebruik een eigen CSS-scroll-lock; overschrijf nooit de
inline scroll-lock van bestaande formulierdialogen. Houd bestaande concepten
en achtergrondopslag intact. Geen schaaltransforms, zoombeperking of andere
lettergroottes voor bestaande inhoud. Horizontale datum-/showtabs mogen binnen
hun eigen rij scrollen; de pagina zelf blijft op telefoonbreedte.

## Mobiele menukop en rapportagevolgorde (V1.65)

Op aanvullend verzoek is het mobiele menu volledig viewportbreed, zonder
rechterstrook of afgeronde zijkant. De oorspronkelijke brand-link zit op mobiel
rechtstreeks in de vaste dialoogkop, buiten de scrollbare lijst; op desktop gaat
hij terug naar de oorspronkelijke railpositie. Alleen de lijst mag scrollen:
geen scrollIntoView op submenu/afstammelingen, omdat dit de buitenste native
modal mee kan scrollen en de sluitknop laat verdwijnen. Verouderde uitgestelde
sectie-/focusacties moeten na sluiten/heropenen of resizen vervallen.

Rapportages op mobiel met foto: titel/zaal, foto, datumtabs. Zonder foto blijven
de datumtabs direct onder de titel staan. Desktopvolgorde en fotoverhoudingen
blijven gelijk. Native dialoog mag zelf geen scrollcontainer worden.


## MFA-poort en Upstash (V1.66)

TOTP blijft bij Supabase Auth via officiële SDK challenge/verify. De gebruiker
heeft Upstash toegevoegd voor gedeelde 30s-replaybescherming; Redis krijgt alleen
HMAC-vingerafdrukken en tijdelijke leases, nooit ruwe codes, tokens, IP-adressen
of profielen. Gebruik de bestaande KV_REST_API_URL/KV_REST_API_TOKEN of de
UPSTASH_REDIS_REST_* varianten uitsluitend server-side. Activeer de extra poort
met MFA_REPLAY_ENABLED=true pas na de vaste OIDC-healthworkflow en bevestigde
Supabase IP address forwarding. Zie docs/mfa-beveiliging.md. Geen procesgeheugen-
fallback of blinde automatische MFA-retries bij onzekere provideruitkomsten.

De private app/API en MCP-beheertoestemming vereisen bij actieve poort een
serverversleuteld, sessiegebonden HttpOnly MFA-bewijs. Bestaande veilige 72u-
sessiecookies blijven geldig. Preview-authenticatie loopt via de productiepoort;
alleen het opaque MFA-bewijs mag beveiligde productie-reads vergezellen, geen
refresh-cookie of Drive-sleutel. Bedrijfswrites blijven in preview uitgeschakeld.

## Rapportages eerst kiezen (V1.67)

Vanuit het hoofdmenu opent /rapportages geen rapportage automatisch. Toon direct
‘Kies eerst een rapportage’, horizontaal en verticaal gecentreerd in het volledige
fluid-inhoudsvlak, donkergrijs in licht thema en leesbaar grijs in donker thema.
Menucache/verversing mag geen selectie maken. Expliciete submenu-keuzes en directe
/rapportages/<concert-ID>-links blijven de betreffende rapportage openen.


## Openingsstatus showmails (V1.68)

De gebruiker heeft klikregistratie per ontvanger/mail en het eerste openingsmoment
expliciet Vertrouwelijk verklaard: bestaande Drive-registers, beveiligde Vercel-
verwerking, uitsluitend beheerdersoverzicht. Geen Supabase-/Redis-/browseropslag
van deze gegevens, geen IP-/apparaatregistratie of trackingpixels.

Beheerder / Email toont de laatste 10 werkelijk verzonden rapportagemailgroepen
met alle verzonden ontvangers in een overlay. Het showprofielmailblok is op
uitdrukkelijk verzoek voorbereid voor een toekomstige, nog niet bestaande flow.
Oude mails zonder registratie krijgen een onbekende status, geen verzonnen vinkje.
Nieuwe ontvangergebonden mail-links bevatten alleen een opaque token in het URL-
fragment. Registratie pas na zichtbaar renderen van de rapportage en login/MFA;
server én Drive controleren actor, module, verzending, concert en token.
Menu-/directe bezoeken zonder mailfragment en automatische scans tellen niet mee.

Nieuwe mailinhoud is gesnapshot als online-report-v4, knop ‘Showrapportage openen’.
Capability-negotiatie laat oude/nieuwe server- en Apps Script-versies veilig naast
elkaar werken. Oude v1/v2/v3-verzendingen en onzekere retries behouden hun inhoud,
ontvanger en idempotentiesleutel. Verzendmoment en ontvangerselectie blijven gelijk.


Accounts met uitsluitend effectieve Rapportages-toegang krijgen geen homepage-
icoon. Een rootbezoek wordt vóór inhoudsrendering vervangen door /rapportages,
met de bestaande gecentreerde keuzehint. Directe rapportagelinks blijven behouden.
Homepage-API's blijven serverzijdig Shows-toegang vereisen; andere accounts en
beheerdersrechten veranderen niet. Pas dit ook toe bij gewijzigde modulerechten.


## Extra filters webrapportage (V1.69)

Op verzoek: Beveiliging bevat Baldadigheid (CSV-Type, hoofdletterongevoelig) onder
Fysieke agressie en boven Uitzettingen. Medisch bevat Contusie / Distorsie onder
Onwelwordingen en boven Ambulancetransporten. Medische Type-waarden met ‘flauwte’
(vb. Benauwd/ Flauwte) tellen ook als Onwelwordingen; geen zoekactie in vrije tekst.
Webtellingen en incidentselectie gebruiken dezelfde gedeelde criteria. Nieuwe
subtypes tellen incidenten; bestaande ambulance/uitzetting/aanhouding blijven
personentellingen. PDF-selectie en berekening blijven behouden; nieuwe waarden
worden alleen in de beveiligde webprojectie toegevoegd.


## Bedrijf/functie en fluid accounteditor (V1.70)

De gebruiker classificeert Bedrijf expliciet als Vertrouwelijk: voeg company toe
aan het bestaande Drive-profiel via de beveiligde Vercel-route. Bedrijf en functie gaan niet naar Supabase Auth-metadata, mails of persistente
browseropslag. jobTitle
blijft het bestaande vertrouwelijke functieveld.

Aanmaken/bewerken gebruikt verplichte voornaam, achternaam, e-mail, bedrijf en
functie. Vaste catalogus shared/account-employment.js en identieke gegenereerde
Drive-validator AccountEmployment.gs: MOJO Concerts → Event Safety Manager /
Productiemanager / CMT Leider; TSC Crowd Management → Projectleider / Management;
Ziggo Dome, AFAS Live en Insomniac → Management. Nieuwe accounts standaard
Gebruiker; alleen MOJO mag handmatig Beheerder worden. Browser, Node en Drive
controleren dit onafhankelijk, inclusief de effectieve bootstrap-/superrol.
Bestaande zelf-/laatste-beheerder-, superbeheerder- en modulebescherming behouden.

Alle bestaande accounts mogen op expliciet verzoek MOJO Concerts krijgen. De
herhaalbare migratie vult ontbrekende company-velden bij beveiligd lezen of
schrijven van het bestaande accountregister en markeert dit één keer. Functie,
rollen, modules, IDs en relaties blijven behouden. Nieuwe externe accounts worden
nooit teruggezet naar MOJO. Een oude functietekst blijft leesbaar, maar bij een
profielwijziging kiest de beheerder een geldige functie uit de nieuwe catalogus.

Fluid kaarten Accountgegevens, Organisatie, Toegang en Profielfoto herschikken
naar één kolom op smal beeld. Bestaande rond uitsnijden, uitnodiging, MFA en
achtergrondopslag blijven werken. Nieuwe bedrijfskeuze maakt de functie leeg;
nooit een oude functie of beheerderrol bij een extern bedrijf laten staan.

## Beveiligingsversterking na onderzoek (V1.72)

Publieke OAuth-register/authorize/token-routes zijn atomair begrensd via de
bestaande Redis-integratie vóór Drive-I/O. Alleen HMAC-IP-vingerafdrukken en
60s-tellers; geen ruwe IP's, profielen of OAuth-geheimen. Falen gesloten bij
cacheproblemen. Ongebruikte clients verlopen na 15 minuten; clients met actieve
codes/grants blijven. Exacte callback/PKCE, scopes en toestemming behouden.

AccountModules weigert ontbrekende modulevelden. De vooraf gepubliceerde,
eenmalige private Drive-migratie maakt bestaande legacytoegang expliciet zonder
expliciet beperkte accounts te verruimen. Nieuwe ontbrekende modulekeuzes geven
geen modules. De vaste superbeheerder-ID en bestaande testmailuitzondering staan
alleen in het private accountregister; geen persoonsadressen in broncode/tests/docs.
Node verwijdert de private extra configuratie uit de browserprofielresponse.

Standaard barrierdiagrammen zijn op expliciet verzoek afgeschermd. De vijf originele
PNG's zijn hash-gecontroleerd geïmporteerd in _esmojo_private_references_v1 onder
de vaste private Drive-root; bytes niet meer opnemen in src, public of Git/builds.
Alleen barrier-reference met MFA/actuele Shows-toegang kan ze lezen. Browsercache
uitsluitend sessiegeheugen en revoke bij afmelden/account-/rechtenwissel. De
gecontroleerde OIDC-importactie is na bevestiging verwijderd, niet heropenen.

Appdocumenten krijgen een CSP met exacte hash voor het bestaande opstartscript,
frame-ancestors none, geen onbekende inline scripts/eval en beperkte bronhosts.
Behoud bestaande inline stijlen omdat fluid UI/grafieken die gebruiken. Genereer
headers na wijziging van het opstartscript met tools/security/browser-headers.mjs
--write; test ook de uiteindelijke dist/index.html. Algemene browserheaders moeten
op iedere specifieke documentregel blijven staan (Vercel-overschrijfgedrag).

Geen force-push of historieherschrijving als normale publicatiestap. Historische
publieke kopieën vragen een afzonderlijk concreet opschoningsvoorstel, inclusief
oude branches/PR-referenties, samenwerking en eventuele GitHub-supportactie.

## Artiestenmodule: catalogus en klikregistratie (8 november 2026)

De gebruiker staat expliciet toe uitsluitend openbare artiestnamen en stabiele
artiest-ID's lokaal in de browser te bewaren voor het directe Artiesten-submenu.
Toon pas na actuele sessie-/Artiestenrechtencontrole. Geen profiel, rechten,
rapportinhoud, top 5 of klikstatistiek in persistente browseropslag.
De gebruiker classificeert anonieme klikregistratie (artiest-ID, tijdstip,
willekeurig gebeurtenis-ID) als Vertrouwelijk, via beveiligde Vercel en bestaande
Redis, met 31-daagse bewaartermijn. Geen accountnamen/IDs, IP's of zoektermen.
Eén gezamenlijke top 5 van echte openkliks in Artiesten, aflopend; alleen typen,
menu laden/verversen en een directe URL openen leveren geen punt op.

## TSC historische rapportages (10 november 2026)

De gebruiker onderscheidt drie brontypen: OnTrack geautomatiseerd, OnTrack historisch
(de eerdere massa-import), TSC historisch (CSV met zes velden vóór de kop).
TSC: aanwezige bezoekers, uitzettingen, aanhoudingen, deuren open, aanvang, einde.
Deze bestaande vertrouwelijke show-/incidentgegevens blijven uitsluitend in Drive.
Bewaar TSC bezoekers als werkelijke bezoekers, niet als verkochte tickets. Sla de zes
waarden eerst op bij de show en lees terug; publiceer daarna pas de incidentenbron.
TSC uitzettingen/aanhoudingen zijn uitsluitend eerste-rijwaarden, nooit berekend
uit incidentregels; null is ontbrekend, expliciete nul blijft nul. Discipline→Division,
EHBO→Medisch bevestigd; overige oorspronkelijke kolommen behouden, ontbrekend leeg,
stabiele technische incident-ID's. Identieke Stereophonics-S2 uit de februari-2020-ZIP
mag vervallen, S1 verliest suffix. Barney-Dome-AFAS is Barney Dome, AFAS Live.
Bij iedere nieuwe inhoudelijke twijfel vraagt de gebruiker eerst te stoppen en
het antwoord af te wachten. Bestaande bronconflicten nooit automatisch overschrijven.

## Historische rapportages (8 november 2026, V1.91)

De gebruiker heeft na de steekproef de gecontroleerde historische collectie
geautoriseerd. Historische incidents_CSV's staan centraal in private OnTrack;
bezoekersdata.json en importcontrole.json blijven in Productie/concertmap.
Registreer historische bron-IDs vóór blootstelling als .csv, zodat normale
mail/PDF-workers ze overslaan, ook bij een afgebroken import. Alle Division-rijen
met Schoonmaak (ook gecombineerde disciplines) worden vóór opslag verwijderd.
Dezelfde native parser en weergave blijven leidend. Bezoekers is ticket_sales,
eenmaal per voorstelling; ook de artiestshow leest dit bestaande veld.
Rapportages-submenu maximaal 45 dagen terug; oude rapporten blijven via artiesten
en directe links beschikbaar. Middag/avond blijven afzonderlijke _S1/_S2-concerten.
Zie docs/historical-report-import.md voor private batches, OIDC en hervatten.
