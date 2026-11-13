# Native lees- en schrijflaag voor Shows

De provider is gebouwd. Publicatie start de omschakeling niet automatisch. De bestaande
website houdt zijn huidige opslag tot de afzonderlijke gecontroleerde omschakeling.
`server/shows-store.js` kiest expliciet één provider; onbekende instellingen stoppen.

## Contracten en opslag

| Bestaande functionaliteit | Native implementatie |
|---|---|
| Menu, primaire reeks, uitvoeringen, oude URLs | Concertreeks, Concert, Routealias, Artiest en Locatie; `catalogue.js` |
| Agenda-import | Geteste publieke MOJO-snapshot, opeenvolgende data groeperen, bestaande analyses behouden; geen stil samenvoegen van twee bestaande reeksen |
| Show openen en eigen analyses | Bestaande regels/DTO's, Analyse en categorieafronding; `service.js`, `rules.js`, `state.js` |
| Verkoop, herkomst en reserveringen | Bezoekersgegeven en Ticketverkoop; token/actor van veldlease uitsluitend versleuteld in afzonderlijke Opdracht |
| Productiekeuzes, barrier en vloer | Getypeerde keuzes, beoordelingen en publieksvakken; bestaande basis-/revisiecontrole |
| Operationele risico's en maatregelen | Bronversie, beoordelingen, tekst, expliciete briefingkeuze, implementatie en heropenen |
| PDF's en bijlagen | Bestaande jobs/versies, staged native File, volledige hash-/omvangcontrole, pas daarna actieve Documentkoppeling |
| Showbeheer | Bestaande cryptografische ID/AAD, versleutelde link/PIN, voortgang en tien pogingen per vijftien minuten met ETags |
| Planning en foto's | Technische, bronversiegebonden projectie met actuele afrondcriteria; geen inventie van importtijd |
| Bestaande research-MCP | Native Onderzoeksresultaat-Markdown; create-only, teruglezen, oorspronkelijke gestructureerde metadata als scoped Historie |
| Aangrenzende modules | Incident-/rapportagebronnen behouden; native Shows-voorbereiding overschrijft verouderde voorbereidende gegevens in artiest-/incidentweergave |

Authenticatie, MFA, activatie, actuele accountrol en modulerechten blijven aan de
bestaande Node-poort gecontroleerd. De getypeerde medewerkerkopie geeft geen rechten.
Nieuwe bevestigde profielmetadata mag vanuit die poort worden gesynchroniseerd;
nooit een profiel of actor uit de browser vertrouwen. Sessies blijven buiten deze laag.

`rules.js` voert uitsluitend vaste, vertrouwde projectbronbestanden lokaal uit in
Node. De Drive-vormige objecten bestaan alleen in werkgeheugen en vertegenwoordigen
de gekozen native reeks; geen Google-service of netwerk is beschikbaar. Dit is
hergebruik van bestaande businessregels, geen uitvoerbare gebruikerscode en geen
beveiligingssandbox voor onbetrouwbare scripts. Vercel bundelt de vaste bronnen
uitsluitend als serverbestanden. De frontend en schermindeling blijven ongewijzigd.

## Consistentie en veilige herhaling

`state.js` reconstrueert de bestaande logische documenten uit de geïmporteerde,
hashgecontroleerde Historie en de daaropvolgende native documentprojecties.
Iedere read/write vergelijkt de relevante getypeerde rijen met die projectie.
Een afwijking stopt; er is geen terugval naar een oude Drive-/Supabase-snapshot.
De reeksrevisie, getypeerde mutaties, nieuwe scoped Historie, pointer en het
ontvangstbewijs gaan in één Dataverse changeset. De geladen ETags blijven leidend.
Een verloren antwoord wordt uitsluitend via het concrete ontvangstbewijs bevestigd.

Bestandsbytes worden eerst apart create-only opgeslagen en teruggelezen. De zakelijke
transactie publiceert daarna pas de koppeling. Afgebroken staging kan een ongekoppeld
bestand achterlaten; het wordt niet ontsloten. Ontkoppelen bewaart het origineel en
maakt de oude actieve download ongeldig. Geen purge of bronopruiming.

Veldleases gebruiken een eigen domeingescheiden versleutelde Opdracht, CAS en een
reeks-ETag. Geen tokens in zakelijke historie of browseropslag. Originele oude leases
uit de kopie worden niet opnieuw actief. De cutover moet alle oude schrijvers en
bestaande reserveringen eerst laten uitlopen.

## Productiecontrole zonder omschakeling

GitHub Actions → **Verify native Shows runtime** → Run workflow → `main`.
De workflow gebruikt alleen GitHub OIDC naar de vaste productie-route
`/api/shows-runtime-sync`; de route controleert exacte repository, workflow en main.
Geen nieuwe credentials delen of installeren. De workflow is handmatig, niet bij
deploy of pagina laden. Preview weigert deze route.

Eerst een technische Opdracht-transactie: write/readback, concurrerende verouderde
ETag en aantoonbare volledige rollback. Vervolgens per bestaande primaire reeks de
native typed/projectiecontrole, bestaande leescontracten en actieve bestandsbytes.
Alleen tellingen en veilige foutcodes/kolomnamen verlaten de route; geen showinhoud,
account-ID, native token of providerfout. Elke ronde controleert dezelfde catalogushash.
Deze controle vervangt geen eindvalidatie tegen de oude bron en verricht geen normale
zakelijke productie-write. Bewijs van een werkende API is evenmin een ingelogde UI-test.

Lokaal: `node --test server/dataverse-shows/*.test.js`, bestaande account-/module-,
MCP-, research-, Showbeheer-, migratie- en domeintests, `npm run build` en
`git diff --check`. Nieuwe tests worden ook door Check application uitgevoerd.

## Activeren is een afzonderlijke gecontroleerde stap

1. Onafhankelijke bron/doel-eindvalidatie werkelijk volledig afronden; een groene
   workflowronde die op `waiting` eindigt is niet voldoende.
2. Runtimecontrole op de echte kopie laten slagen; native zakelijke schrijfpariteit
   volgt uit synthetische domeintests, technische transacties en de eerste echte
   bevoegde opslag bij de rookproef. Geen fictieve show schrijven voor een test.
3. Legacy-interactieve en automatische Shows-writers sluiten, in-flight werk en
   leases laten uitlopen, laatste delta/version-watermarks vergelijken en verwerken.
   De providerselectie alleen kan geen oude, al lopende instantie stilzetten.
4. Vanuit die gecontroleerde serverprocedure de catalogusklok vullen met de werkelijke
   `checkedAt` van de bevestigde bron en de native planningprojectie opbouwen. Gebruik
   `catalogue.persistClock` en `home-rebuild`; geen zelfbedachte migratiedatum.
5. Pas na die bewijzen de vaste Integratiestatus met identiteit
   `native-authority/v1` publiceren: integratiecode `shows-native-runtime-v1`, status
   succeeded, configuratie met mode dataverse, contract, actuele schemafingerprint,
   werkelijk voltooide validation-task-ID plus epoch en sequence, legacyWritersStopped=true,
   deltaVerified=true en activatedAt. `authority.js` controleert dit contract.
   De provider leest ook het bijbehorende versleutelde checkpoint terug en eist
   complete, exact dezelfde epoch/sequence en geen resterende lease.
   Geen browserroute kan dit record of deze vlag nu vrij instellen.
6. Eén gecoördineerde productie-uitrol met servervariabele
   `SHOWS_STORAGE_PROVIDER=dataverse`; geen VITE-prefix. Alle normale Shows-workers
   kiezen dezelfde provider. Legacy-export voor eindcontrole is expliciet `legacy:true`.
7. Ingelogde bevoegde lees-/schrijfrookproef en vergelijking van oude URLs, menu,
   verkoop, beoordelingen, PDF, bijlagen en Showbeheer. Originele bronnen behouden.

Deze implementatie biedt geen automatische cutover of knop die de freeze/delta
overslaat. Na native bedrijfswrites is het terugzetten van de vlag geen veilig
herstel: eerst native wijzigingen bewaren/verzoenen of gecontroleerd fail-forward.

Bestaande encryptiesleutels blijven server-only nodig: de bestaande server-root voor
veldleases/checkpoints en de bestaande Showbeheer-cryptosleutel/AAD niet verwijderen
als Drive-bedrijfsopslag vervalt. Rotatie vereist afzonderlijke herencryptie; geen
credentials naar frontend of gedeelde cloudomgeving kopiëren.

## Goedgekeurde gecontroleerde omschakeling

Gebruiker heeft publicatie en activering expliciet toegestaan. De productie-router
kiest de bron aan de hand van het vaste getoetste technische authority-record:
legacy → freeze → dataverse. Hiervoor hoeven beide Codex-accounts geen productie-
credentials te kopiëren of Vercel-variabelen te wijzigen. De bestaande expliciete
serverinstelling blijft beschikbaar, maar kan een actieve native autoriteit niet
naar oude schrijvers omleiden. Er is geen foutgestuurde terugval.

GitHub Actions → Controlled Shows Dataverse cutover → main. `status` leest veilige
voortgang; `start` voert de expliciet goedgekeurde procedure uit; `resume` herhaalt
na een inhoudelijk opgeloste blokkade. Geen taak bij deploy of pagina laden.
Elke ronde gebruikt de actuele rechten van de initiatiefnemer van de afgeronde
kopie en diens oorspronkelijke machtiging; geen verversing van de48u-termijn.
De workflow deelt het globale uitvoeringsslot met andere achtergrondtaken.

De procedure vergelijkt eerst alle actuele bronvelden, relaties en bestandsbytes.
Daarna sluit zij beide opslagproviders voor normale Shows-verzoeken, wacht elf
minuten op oude Vercel/GAS-verzoeken en vergelijkt opnieuw onder deze schrijfstop.
De bestaande migratie heeft het schema en de sleutels al bewezen: de nieuwe
onafhankelijke eindcontrole herhaalt geen honderden metadata-setupverzoeken.
Afwijkende gegevens worden niet stil overschreven. Bij een bevestigde fout vóór
activering wordt de oude site vrijgegeven en de controle geblokkeerd. Bij een
onbevestigde uitkomst of na native activering geldt geen blinde terugschakeling.

Daarna worden native planning en de werkelijke agenda-checkedAt opgebouwd. Alleen
na volledige verificatie wordt een echt versleuteld completed-validatiecheckpoint
vastgelegd en de authority gepubliceerd. Normale API-, research-, Showbeheer- en
workerfactory’s gebruiken vervolgens dezelfde native provider. Oude actieve
Supabase-mirror/archivewriters en oude bronmigratiestarts zijn dan afgesloten.
De procedure leest aansluitend alle bestaande native showprofielen/tickets/risico’s.
Dit bewijst serverroutes; een persoonlijke ingelogde browsercontrole moet afzonderlijk
als zodanig worden gerapporteerd.

### Archivering en broncontinuïteit

De echte controle vond een verschil in de technische voorbereidingsgeneratie na
het verwijderen van een gearchiveerde tijdelijke Supabase-rij. De terminale,
servergebonden archiveringsmarker bewaart de laatste bronrevisie. De eindvergelijking
behoudt de oorspronkelijke kopiegeneratie en het oude auditbewijs; zij vergelijkt
alle actuele bedrijfsvelden, documenten, relaties en bytes onafhankelijk opnieuw.
Alleen dezelfde productiehistorie in chronologische volgorde en oude verlopen
veldleases worden genormaliseerd. Een inhoudelijke keuze-/tekst-/bestandswijziging
blijft blokkeren. De historische importfingerprint wordt niet vervangen door een
verzonnen actuele fingerprint. Gemeten archiveringscontinuïteit blijft uitsluitend
in het versleutelde definitieve validatiecheckpoint bewaard. De controle zelf
schrijft geen bedrijfsgegevens. Een preflight-resume bewaart eerder strenger
gecontroleerde voortgang; de volledige controle onder schrijfstop begint opnieuw.

Onder de aantoonbaar gesloten en uitgelopen schrijfroutes leest de eindcontrole
elke bronshow eenmaal, met de bestaande voor/na-Supabase-revisiecontrole en native
bestandsblokhashes. De dubbele volledige Drive-export blijft vóór de schrijfstop
behouden. Ook de gedeelde tijdschema-opname respecteert de schrijfstop, zodat deze
gedurende de eindcontrole geen ondersteunende Shows-bron kan wijzigen. Dit halveert
de langzaamste bron-I/O tijdens het onderhoud zonder velden of bytes over te slaan.

Dezelfde continuïteitsregel geldt voor een gevalideerde, nog actieve Supabase-
snapshot: een monotone opslagrevisie mag opschuiven bij synchronisatie zonder dat
bedrijfsdocumenten of getypeerde velden wijzigen. Eerst worden die inhoud en de
native snapshotintegriteit volledig bewezen. De historische kopiegeneratie blijft
behouden; de actuele actieve/archief-bronrevisie en haar hash blijven afzonderlijk
in het versleutelde broncontinuïteitsbewijs. Een lagere bronrevisie of een echte
inhoudswijziging wordt nooit onder deze regel toegelaten.
