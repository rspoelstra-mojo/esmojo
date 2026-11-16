# Inlogachtergrond

De gebruiker heeft de achtergrondfoto en uitsnede als Openbaar bevestigd. De foto
is vóór het inloggen voor iedere bezoeker beschikbaar. Alleen een geactiveerde
beheerder met actuele native accountrechten, een geldige Supabase-sessie en de
bestaande aanvullende MFA-cookie mag instellingen of metadata wijzigen.
Supabase Auth en de modulegrenzen veranderen niet.

## Eenmalige inrichting

Open **Beheerder → Datatransitie → Inlogachtergrond inrichten**. Deze expliciete
actie gebruikt de bestaande beveiligde metadatawerkwijze, vaste ESMOJO-oplossing,
publisher en Dataverse-omgeving. Iedere stap controleert opnieuw de actuele
beheerder. Bestaande afwijkende definities worden niet overschreven. De knop wacht
op een Actieve unieke sleutel; Pending is geen succes. Je kunt de stappen veilig
herhalen. Houd de pagina open tot de bevestiging.

De geïsoleerde tabel `esmojo_websiteinstelling` bevat Naam, Sleutel, Revisie,
Configuratie JSON, Bestand (File), SHA-256, Bestandsgrootte en MIME-type. Het vaste
contract staat in `server/website-settings-schema.js`. De unieke sleutel is
`esmojo_sleutel`. Er zijn geen nieuwe keuzes of relaties. Het actieve Shows-schema
en de betekenis van gedeelde tabellen blijven intact.

Na de schemacontrole slaat de knop uitsluitend als nog geen achtergrond bestaat
de aangeleverde podiumfoto op, met de voorbereide desktop-/mobiele uitsnede. Een
bestaande instelling wordt niet vervangen. De foto in de public-map is door de
gebruiker expliciet bestemd voor de openbare login. Deze initiële presentatie
werkt ook voordat de setup is uitgevoerd; dit betekent niet dat de foto dan al
in Dataverse is opgeslagen. Geen metadata- of opslagwrites bij deployment,
paginaladen of anonieme verzoeken.

## Aanpassen

**Beheerder → Instellingen → Achtergrondfoto** accepteert JPG/PNG/WebP tot 3 MiB
(passend binnen Vercels verzoeklimiet). Sleep de foto of gebruik de pijltjestoetsen;
Shift vergroot de stap. Zoom is 100–300%. Vervaging is instelbaar van 0 (uit) tot 12 px, standaard 3 px. De blur geldt alleen voor de achtergrond; formulier en logo blijven scherp. Dit openbare presentatieveld staat in de bestaande JSON-config, zonder nieuw schema. Bestaande configuraties zonder dit veld gebruiken de standaard van 3 px. Desktop en mobiel hebben eigen uitsneden.
De preview gebruikt dezelfde geometrie, vormgeving en formulierafmetingen als de
login. Wijzigingen worden na het loslaten automatisch serieel opgeslagen. Een
gelijktijdige wijziging door een andere beheerder geeft een conflict, geen stille
overschrijving. Bij een fout kun je opnieuw opslaan of de actuele achtergrond laden.
Previewbytes en bewerkingen staan uitsluitend in sessiegeheugen.

Iedere oorspronkelijke upload blijft onveranderd in Dataverse File bewaard.
De weergave is een gedraaide, metadata-vrije WebP op kwaliteit 95, maximaal 3840 px,
zonder vergroting. De browser schaalt voor de gewenste uitsnede. Dat kan geen
extra details aan het origineel toevoegen. De uitsnede wordt niet destructief in
de foto uitgesneden. Afbeeldingen zijn inhoudelijk geadresseerd op SHA-256;
bestandsbytes worden onafhankelijk teruggelezen vóór configuratiepublicatie.
Vorige foto's blijven bewaard. Configuratiepublicatie gebruikt revisie/ETag-CAS,
een exacte verzoekfingerprint en volledige terugleescontrole, ook bij verloren
writebevestigingen. De verbinding behoudt tijdige tokenvernieuwing.

## Openbare uitlezing

`GET /api/login-background` geeft uitsluitend openbare presentatiegegevens:
revisie, beeldafmetingen, beide uitsneden en de vaste foto-URL. De metadata wordt niet gecachet, zodat een nieuwe foto meteen kan worden opgehaald. `?image=<sha256>` accepteert uitsluitend de
huidige gepubliceerde weergave in deze aparte tabel; geen vrije native tabel,
Document-ID, origineel of URL. De server leest en verifieert de bestandshash vóór
versturen. Deze openbare bytes hebben een onveranderlijke hash-URL en mogen een
jaar worden gecachet. Er zijn geen anonieme upload-/setup-/schrijfoperaties.
Gereserveerde `_vercel_`-queryparameters van platformtoegangslinks worden uitsluitend genegeerd; ze beïnvloeden geen bestandskeuze of appautorisatie. Beheerresponses blijven private/no-store. Previewdeployments schrijven niets.

De login wacht nooit op de optionele achtergrond-API. De initiële foto blijft
zichtbaar bij een fout; de dienst meldt een echte fout in plaats van dat een
mislukte Dataverse-read als geslaagde opslag wordt voorgesteld. Het ophalen van
de achtergrond verandert geen sessies, authenticatie, MFA of accountrechten.
De aparte zaal-/Showbeheer-achtergrond blijft ongewijzigd.

## Verificatie

Servertests controleren public/private routing, beheerder/MFA/activatie, geweigerde
toegang, alleen-lezen previewomgevingen, bestanden/MIME/limieten, geen vergroting,
oorspronkelijke bestanden, CAS-conflicten, verloren bevestigingen en geometrie.
De lokale browsercontrole gebruikt uitsluitend een componentfixture met
gesimuleerde opslag, geen productieauthenticatiebypass of bedrijfsgegevens.
Een live schema-/bestandscontrole volgt na de expliciete setupklik; een groene
deployment alleen is geen bewijs dat de nieuwe tabel al is ingericht.
