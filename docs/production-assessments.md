# Barrieropstelling en Vloerdruk

Binnen Risicoanalyse → Productionele risico’s → Zaalindeling zijn uitsluitend
Barrieropstelling en Vloerdruk uitgebreid. Andere onderwerpen behouden hun gedrag.
De bestaande componentstijlen, contentbox en systeemthema blijven leidend.

## Interface en afbeeldingen

`src/barrier-layout-page.js` toont één compact formulier, links selectie/upload/
toelichting/handmatige beoordeling en rechts een vaste preview. Op smalle schermen
stapelen de kolommen. De primaire afrondactie staat rechtsonder. Een expliciete
bewerkactie heropent een afgeronde beoordeling en bewaart de oude versie in historie.

`shared/barrier-layout.js` bevat de zes exacte labels en vijf exacte bestandsnamen.
`src/barrier-images.js` koppelt deze centraal via Vite aan
`src/assets/barrier-layouts/*.png`. Plaats de vijf later aangeleverde bestanden
met hun exacte namen in die map; de volgende normale build/publicatie neemt ze
zonder verdere logica-aanpassing op. Tot die tijd is er een neutrale placeholder,
zonder ontbrekende bestanden op te vragen. Ontbrekende afbeeldingen blokkeren niet.
Afbeeldingen blijven volledig zichtbaar met object-fit contain.

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
Geen risico en afgerond. De barrierbeoordeling blijft handmatig.

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
