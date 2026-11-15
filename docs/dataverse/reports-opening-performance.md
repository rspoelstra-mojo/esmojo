# Rapportages openen binnen 1,5 seconde

Doel is klik tot bruikbare rapportinhoud, ook bij het eerste rapport. Volledig
gevalideerde gegevens, KPI's, grafieken, datumtabs, filters en alle incidenten blijven
behouden. Supabase Auth/MFA, huidige native autoriteiten en oorspronkelijke bestanden
veranderen niet. Geen private inhoud in browseropslag, logs, Git of analytics.

## Bestaande vertraging

Het oorspronkelijke webpad downloadde bij iedere read de CSV opnieuw, valideerde
alle getypeerde rijen/tekstblokken/context/relaties, parseerde de CSV en las de volledige
catalogus en canonieke foto. API en service lazen daarnaast beide het volledige
profiel inclusief profielfoto. Een directe rapportagelink wachtte ook op het menu;
het eerste verse menu kon vervolgens dezelfde rapportage opnieuw laten laden.

## Native leesprojectie

`server/dataverse-reports/opening.js` bewaart de bestaande web-DTO als afgeleide
AES-GCM/gzip-leesprojectie in de bestaande Integratiestatus. Eigen key/AAD, vaste
namespace, schema/parser/rekencontract en 95.000-tekenlimiet. Geen tweede canonieke
bron, CSV-bestand of gewijzigd schema. Bump `reports-opening-v1` bij wijziging van
server-DTO/filter-/berekeningsbetekenis; de voorbereidingsmanifesthash bevat dit
contract zodat een nieuwe contractversie alle bestaande projecties opnieuw doorloopt.

Opbouw gebruikt het volledige bestaande native CSV/File-/parser-/rijencontrolepad.
Vóór en ná opbouw worden complete ID/ETag-sets vergeleken. Vóór iedere snelle read
worden die sets opnieuw sterk gelezen in één read-only OData-batch: alle actuele
rapportheaders/versies/bronnen voor datum-/artiestcatalogus; geselecteerde context,
incidenten, tekstblokken, tijdpunten, oorspronkelijke File-document en gekoppelde
Concert/Concertreeks/Artiest voor de canonieke foto. Ook toegevoegde/verwijderde
rijen, verplaatste relaties en File-wijzigingen maken de projectie ongeldig. Geen
verkorte count, vaste `$top`-truncatie of rechten-TTL. Paging blijft volledig en
gebonden aan dezelfde host/entityset. Een toekomstige rapportdatum in de betreffende
artiestreeks legt een Nederlandse kalendergrens aan de projectie op.

De tijdens volledige controle geverifieerde technische entityset/primary-ID-metadata
is versleuteld in de projectie gebonden. Een koude read hoeft deze elf schema-
requests niet opnieuw te doen. Contract-/rijcontrole blijft actueel. Onbekende of
ongeldige projecties vallen terug op volledige native hercontrole en heropbouw van
alleen de afgeleide cache. Zakelijke conflicten worden niet gerepareerd.

Writes zijn create-only of echte ETag-CAS. Bij verloren bevestiging alle verwachte
velden onafhankelijk teruglezen. Gelijktijdige cachebouwers mogen alleen een exact
logisch gelijk ontsleuteld resultaat gebruiken nadat ook heldere metadata, contract,
queries en actuele bronproof onafhankelijk overeenkomen; geen blinde writeherhaling.

## Rechten en verzoekpad

De normale Supabase-user/factor/MFA-poort blijft staan. Rapportreads vragen een verse
native autorisatiebatch met profielbeleid, profielpointer, ACL, medewerker en alle
getypeerde modulerechten, zonder avatarbytes. Zowel blokkering als incoherente rechten
falen gesloten. Het binnen hetzelfde HTTP-verzoek gevalideerde profiel mag aan de
private native renderer worden doorgegeven; geen clientveld, persistente context
of tweede accountrechtenbron. Andere API-verzoeken valideren zelfstandig opnieuw.
De native Reports-autoriteit en oorspronkelijke activatiebewijzen worden eveneens
in een verse batch gecontroleerd. Alleen OAuth/schema-metadata kan parallel aan
Auth warmen; er wordt dan nog geen account- of rapportinhoud gelezen.

Backend-`Server-Timing` bevat uitsluitend auth/access/report-duren. De browser zet
alleen een technische `esmojo-report-ready` Performance-entry na echte inhoud, foto-decode en twee
paintframes, plus een niet-zichtbare duur op de rapport-DOM. Geen rapport-ID's,
incidenten, namen of nieuwe analytics. Directe links openen parallel aan het menu.
De eerste revisievulling veroorzaakt geen dubbele rapportread. Alle data/filters
blijven gereed; alleen layout/paint van incidentkaarten buiten beeld wordt met
`content-visibility` uitgesteld. Ondersteuning ontbreekt: normale CSS-renderfallback.

## Voorbereiding en meten

De bestaande vaste main/OIDC incidentroute heeft uitsluitend `inventory`, `prepare`,
`baseline`, `measure` als vaste performance-operaties. Iedere ronde gebruikt actuele
worker-/beheerder-/Reportsrechten. Een versleuteld servercheckpoint bewaart alleen
manifesthash, index en technische steekproefindices; lease/CAS/readback. Geen actor,
bron-ID, query of browsercursor; geen oorspronkelijke taakgrant heropenen/vernieuwen.
Afgeleide cachevoorbereiding is geen businessmigratie of nieuwe bronactivering.

De publicatieworkflow bereidt alle huidige rapportages voor. Daarna meten alle drie
bronsoorten, de oudste en grootste rapportage via dezelfde native renderer, inclusief
verse gebruikersflags; ook een nieuwe verbinding zonder warme verbindingscache.
De 1.000ms backendbegroting laat ruimte voor Supabase/network/browser. Een mislukte
begroting is geen geslaagd prestatiebewijs. De baseline meet het oorspronkelijke
native download-/parserpad. Deze metingen bevatten geen echte browser/MFA-login.

De Chrome-test gebruikt de echte router/pagina met 500 fictieve incidenten, foto,
950ms nagebootste backend en een menu dat twee seconden later komt, op390/1440px,
licht/donker. Ze controleert echte DOM/filters en geen dubbele read. Het is een
synthetische klik-tot-painttest, geen productiegebruikerstest. Een live eindmeting
vraagt een geldige beschikbare browsersessie; geen tijdelijke authbypass bouwen.

Nieuwe toekomstige Power Automate-inname moet de afgeleide leesprojectie na volledige
native validatie voorbereiden als onderdeel van publicatie. Die nog te bouwen inname
wordt hier niet toegevoegd. Een ontbrekende/gewijzigde projectie blijft correct via
het volledige native pad lezen, maar mag niet als bewezen snelle opening gelden.
