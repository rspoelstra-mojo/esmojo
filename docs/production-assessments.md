# Barrieropstelling en Vloerdruk

Binnen Risicoanalyse → Productionele risico’s → Zaalindeling zijn uitsluitend
Barrieropstelling en Vloerdruk uitgebreid. Andere onderwerpen behouden hun gedrag.
De bestaande componentstijlen, contentbox en systeemthema blijven leidend.

## Interface en afbeeldingen

`src/barrier-layout-page.js` toont de selectie/upload/toelichting en de preview
in het linkerblok. Rechts staat de herbruikbare `src/risk-review-card.js`, even
breed als de bestaande Showprofiel-zijkaart; op kleine schermen stapelen deze
blokken. Het blok “Risico beoordeling” toont vier gekleurde keuzes in twee kolommen
en de primaire knop Opslaan. De algemene kaart start zonder selectie. Geen risico
vereist normaal Toelichting; Midden/Hoog vereisen
Beheersmaatregel; Laag toont geen tekstveld. Opslaan voert de bestaande complete-
actie uit, met behoud van gebruiker, tijdstip en revisiecontrole. Een expliciete
bewerkactie heropent de beoordeling en bewaart de oude versie in historie.
Dit nieuwe blok wordt voorlopig uitsluitend bij Barrieropstelling gebruikt.

Uitzondering op bewuste selectie: Seated en de vier standaard-barrieropstellingen
worden direct als Geen risico afgerond opgeslagen, zonder toelichting. Dit gaat
via dezelfde complete-actie met de actuele revisie, na eventuele eerdere
conceptwrites. Herselectie na Bewerken is een expliciete actie, ook bij ongewijzigde
gegevens. Lezen of verversen start nooit een automatische afronding. Afwijkend
ontwerp blijft handmatig; Midden/Hoog houden altijd hun verplichte maatregel.
Het vierkante schema en het label zijn rechts uitgelijnd in het linkerblok.

De beoordelingstekst staat als `riskNote` in hetzelfde Vertrouwelijke Drive-record,
los van `notes` voor het afwijkende ontwerp. Beide runtimes valideren lengte, type
en verplichte inhoud. Historische afgeronde records zonder deze nieuwe eigenschap
blijven zonder migratie leesbaar; nieuwe afrondingen krijgen geen uitzondering.

`shared/barrier-layout.js` bevat de zes exacte labels en vijf exacte bestandsnamen.
De vijf originele PNG's staan sinds V1.72 uitsluitend in de private Drive-map
`_esmojo_private_references_v1` onder de vaste ESMOJO-root. Het manifest
`shared/barrier-reference-manifest.js` bevat alleen vaste namen, maten en hashes.
`src/barrier-images.js` haalt beelden via de MFA-/Shows-beveiligde
`barrier-reference`-route op; geen bytes in Git, publieke assets of browseropslag.
Een sessiecache houdt eerder getoonde beelden direct beschikbaar en revokeert
blob-URL's bij afmelden of wijziging van account/rechten. De weergave blijft
object-fit contain; ontbrekende beelden blokkeren de beoordeling niet.

De afwijkende opstelling vereist een PNG/PDF-upload en niet-lege toelichting.
De huidige ondertekende JSON-transportarchitectuur ondersteunt bestanden tot 2 MiB;
de limiet wordt voor upload zichtbaar en aan beide kanten gecontroleerd. De browser
verwerkt bestandsinhoud uitsluitend tijdelijk. PNG wordt beschermd opgehaald en via
een tijdelijke object-URL getoond; PDF krijgt bestandsnaam, icoon en Openen-link.
Geen openbare Drive-links. Object-URL’s worden opgeruimd bij navigatie.

## Drive en API

`server/accounts-api.js` gebruikt dezelfde geactiveerde account-, sessie- en MFA-
controle als de bestaande website. De server bepaalt de actor. `barrier-layout` en
`floor-pressure` sturen alleen strikt gevalideerde acties via de bestaande HMAC-
ondertekende shows-store naar Apps Script. Geen extra OAuth of opslagdienst.

`google-apps-script/BarrierLayout.gs` en `FloorPressure.gs` bewaren beoordelingen
in **het bestaande** `productionele-risicos.json` in de canonieke show/reeksmap,
classificatie Vertrouwelijk. Eigen beoordelingen hebben een revisie; de globale
productierevisie en historie blijven intact. Iedere write wordt teruggelezen en
gecontroleerd. Locking, broncontrole, revisieconflicten en identieke herpogingen
voorkomen dubbele registraties en onbedoelde overschrijvingen. Afronding bevat
completedBy en completedAt. Een technisch onzekere opslag stopt vervolgwrites;
de invoer blijft in het formulier totdat bewust opnieuw wordt geladen.

Uploads staan als losse private Drive-bestanden naast het JSON. Een uploadregister
bevat fileId, uploadId, oorspronkelijke naam, MIME, grootte en SHA-256, geen bytes.
Download/afronding controleren register, bestandsnaam, beheerkenmerk, MIME, hash en
map-parentketen. De bestaande Drive-map wordt hergebruikt. Een verwijderd concept-
bestand wordt ontkoppeld en waar mogelijk naar de prullenbak verplaatst. Bestanden
uit afgeronde historie blijven bewaard. Canonieke mapverplaatsingen nemen beheerde
bijlagen mee. Geen log-, analytics-, Supabase- of persistente browseropslag.

## Vloerdruk en ticketgegevens

`src/floor-pressure-page.js` gebruikt alleen de opgeslagen barrierkeuze. De gedeelde
`shared/floor-pressure.js` bepaalt vaste vakken en berekent bezoekers / netto m²,
zichtbaar met twee Nederlandse decimalen. Beide runtimes gebruiken dezelfde
gegenereerde validators. Geen dichtheidsdrempels of automatische risico-indeling.
Afwijkend ontwerp ondersteunt extra unieke vaknamen en verwijderbare extra regels;
er is geen vast aantal vakken, wel een technische payloadgrens van 80.000 tekens.

Tickets komen uitsluitend uit het bevestigde, gestructureerde ticket_sales-veld in
`bezoekersdata.json` dat ook de PDF-generator gebruikt. Meerdere dagen: maximum,
geen som. Referentie toont ook de afzonderlijke dagen; ontbrekende tickets worden
expliciet gemeld. Niets wordt ingevuld in bezoekersvelden. Totaalverschillen zijn
informatief en blokkeren afronding niet. De gebruikte ticketversie en waarden
worden bij afronding in dezelfde vertrouwelijke beoordeling vastgelegd.

Geen risico vereist toelichting; Midden/Hoog vereisen beheersmaatregelen; Laag
vereist geen aanvullende tekst. Seated is uitsluitend bij Vloerdruk automatisch
Geen risico en afgerond. Voor Barrieropstelling geldt de hierboven beschreven
uitzondering voor een bewust gekozen standaardopstelling.

Een gewijzigde barrier-signatuur (type of hash van afwijkend ontwerp) archiveert de
oude vloerdrukbeoordeling en maakt een nieuw concept. Passende vakgegevens blijven
behouden, ontbrekende vakken beginnen leeg en de risicoklasse wordt gewist.
De interface meldt dat opnieuw gecontroleerd/afgerond moet worden. Bij overgang
naar Seated worden geen staande vakken gebruikt; terugschakelen vereist nieuwe
invoer. Beoordelingen bevatten de bron-signatuur en afronding controleert actuele
ticketversies. Het overzicht toont afgerond/concept; de samenvatting bevat active
alleen voor een afgeronde beoordeling met een relevante risicoklasse. Maatregelen
blijven bij de betreffende productiebeoordeling. Bestaande risicoscores wijzigen niet.

## Controles

`server/production-assessments.test.js` test gedeelde validators, alle vakindelingen,
berekeningen, invoer, unieke namen, verplichte tekst, ondertekende Drive-roundtrips,
private uploads, herpogingen, historie, verplaatsingen, Seated, wijzigingen en de
hoogste ticketreferentie met bronrevisiecontrole. Accounttests controleren beide
routes zonder authenticatie/MFA en weigeren een aangeleverde actor.
De bestaande CI-suite blijft lopen. Een lokale Chromium-controle met uitsluitend
fictieve Drive-fixtures controleert beide echte formuliermodules: desktopkolommen,
PDF-upload, verversen, dynamische vakken, afronding, dark mode en mobiel. Geen
productiebestanden zijn voor deze controles geschreven. Authenticated live Drive-
werking vereist een ingelogde ESMOJO-sessie en is niet als productie-roundtrip geclaimd.

V1.56: standaardbarrier kiest direct Geen risico maar slaat niets automatisch op.
Afwijkend ontwerp wist de selectie; invullen/typen/blur schrijft geen concept.
Vloerdruk berekent direct maar schrijft pas via afronden. Lokale invoer wordt
in tijdelijk sessiegeheugen bewaard. Nieuwe custombestanden worden pas na Opslaan
serieël geüpload vóór afronden. Geen automatische planningafronding door selectie.
