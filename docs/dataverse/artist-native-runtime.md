# Native artiestenruntime — herstel dagstand

PR191 neemt de gestopte account-A-registratie PR190 over. Profiel en risicoscore
worden in de bestaande UI parallel geladen en samen getoond. De risicoscore vroeg
nog `incident-daily-read` via Drive; de definitieve brugafsluiting liet daardoor
de hele artiestpagina falen. Drive wordt niet heropend.

De vier `incident-daily-*`-operaties lopen nu via de native Reports-router en
`createNativeIncidentDaily`. Een versleutelde, gecomprimeerde afgeleide leesprojectie
staat onder een eigen Integratiestatus-identiteit. Canonieke concerten, artiesten,
Shows-voorbereiding en getypeerde Rapportages/KPI's blijven op hun bestaande bron.
Geen nieuw schema of tweede concertregister. De configuratie blijft onder 95.000
tekens en decompressie onder de oorspronkelijke 3MB; grensoverschrijding stopt.

Lezen vereist actuele rechten en leest alleen de dagstand. Geen rapportscan,
reparatie, publicatie of bronfallback op een gebruikersread. Alleen referenties
zijn beschikbaar voor Artiesten; het volledige beheeroverzicht vereist beheerder.
Schrijven vereist de bestaande fixed main/OIDC-worker en diens actuele
beheer-/Rapportagesrechten. Een afzonderlijke identiteit/bestaande taakgrant wordt
niet gestart of verlengd. CAS en volledige onafhankelijke veldvergelijking
bevestigen ook een verloren writeantwoord. De eerste complete dagpublicatie wint.

Dagregels zijn gelijk aan IncidentDaily.gs: eerste initialisatie mag direct;
volgende dag uitsluitend tijdens Nederlands middernachtuur starten, of een al
gestarte ronde maximaal vier uur voortzetten. Reads overdag herberekenen niets.
De eerste native dagstand wordt opnieuw afgeleid uit actuele native bedrijfsdata;
geen bytegelijke kopie van de oude Drive-dagstand claimen. Originelen blijven staan.

Bij artiestgebonden `incident-read` worden alleen die artiestrows teruggegeven.
Dezelfde referenties/KPI's en rekenfuncties blijven gelden, maar de Shows-wrapper
hoeft niet alle andere voorbereidingen te laden. Ontbrekende beoordelingen blijven
ontbrekend; geen fictieve scores of data.

De bestaande incidentworker initialiseert na publicatie de dagstand en doet een
vaste read-only controle van menu, profielen, risicolezing en een historische
rapportagekoppeling. Geen vrije actor/query/bron-ID of inhoud in response/logs;
alleen tellingsvelden, booleans en vaste foutcode/stage. Dit bewijst serverreads,
geen ingelogde browser/MFA-gebruikerstest. Bestaande synthetische Chrome-tests
dekken profiel/score samen en 390/1440px licht/donker. Supabase Auth blijft behouden.
Redis-activering en fysieke dienstafsluiting staan los van deze reparatie.

## Snelle gezamenlijke opening (16 november 2026)

`artist-open` bundelt het volledige profiel en dezelfde risicoscore in één
beveiligde HTTP-read. De actuele accountstatus, rol en Arts-modulerechten worden
met de bestaande native autorisatiebatch gelezen. Supabase Auth, MFA, sessietermijn
en serverrechten blijven behouden. Alleen OAuth/schema mag alvast technisch
opwarmen; er zijn geen private bronreads voordat de huidige rechten vaststaan.

Een afgeleide, domeingescheiden versleutelde/gzip-gecomprimeerde Integratiestatus-
projectie bevat dezelfde oorspronkelijke `detail`/`risk`-uitkomsten. Geen nieuw
schema, gegevensdoel of bedrijfsbron. Iedere read vergelijkt verse volledige
rij-identiteitsets en ETags van de bronafhankelijkheden. Publieke catalogusvelden
worden inhoudelijk vergeleken; alleen irrelevante wijzigingen aan andere reeksen
mogen hun ETag wijzigen zonder een andere artiest ongeldig te maken. Eigen
reeksen, getypeerde beoordelingen, historie, gekoppelde documenten, native
state-pointers, onderzoek, canonieke Reports-versies/context/KPI's, dagelijkse
referenties en autoriteitsbewijzen blijven aan de versiecontrole gebonden.
Lidmaatschap van reeksen en documenten wordt onafhankelijk opnieuw afgeleid.
Nieuwe/verdwenen relaties mogen niet buiten een vooraf opgehaalde scope vallen.

Een ontbrekende of verouderde projectie wordt alleen uit opnieuw gecontroleerde
canonieke gegevens opgebouwd. Bronnen blijven read-only. Een gewijzigde bron,
corruptie of geweigerde toegang is geen toestemming om bedrijfsgegevens te
repareren. Een bronfence vóór/na de oorspronkelijke berekening, CAS en exacte
onafhankelijke teruglezing bewijzen de afgeleide write, ook bij verloren antwoord.
Interne metadata in de versleutelde projectie voorkomt losse schemarondritten bij
een koude read; tabel- en filterkeuzes blijven vaste servercode. Geen rechten-TTL,
browseropslag van privédata of terugval naar Google/Redis. Wijzig de openings-
contractversie als de afleidingsbetekenis verandert.

De bestaande main/OIDC-incidentworker bereidt alle artiesten voor via de vaste
`artistPerformance`-commando's. Cursor/lease/ETag en bronfingerprint bewaken het
onderhoud; iedere ronde controleert actuele beheer-/Reports-/Arts-rechten. Dit
is uitsluitend cacheonderhoud, geen nieuwe of verlengde taakmachtiging. Het
nachtelijke onderhoud en de bestaande vijfminutenroute houden afleidingen bij
na reguliere native wijzigingen. Gewone mails blijven hun bestaande route en
selectieregels volgen; de performancecontrole verzendt geen testmails.

De browser toont profiel en score samen, wacht voor de voltooiingsmeting ook op
de gekozen publieke foto en meet tot de volgende zichtbare frames. De foto
gebruikt één stabiele 750×338 WebP-CDN-variant. Menuverversing, klikstatistiek en
rapportagevoorladen krijgen daarna ruimte. Rapportages blijven nieuwste-eerst
stil laden, met bestaande klikprioriteit, annulering en foutafhandeling.
De numerieke `esmojo-artist-opening`-meting blijft uitsluitend in het lokale
Performance-geheugen; geen inhoud of identificaties naar analytics/logs.

Validatie: afzonderlijke browserproef met een API-respons van 750 ms en budget
1000 ms, plus onafhankelijke native productieproeven voor baseline, voorbereiding,
warme en koude autorisatie+opening. De backend heeft een budget van 750 ms om
ruimte voor netwerk, foto en rendering te houden. Testresultaten met een fixture
bewijzen geen echte ingelogde productiebrowser; rapporteer die apart.

De eerste productieproef (PR207/V1.147) bereidde alle 199 artiesten voor, maar
haalde het backendbudget niet: oude volledige lezing 2739 ms, warme p50 791/max
836 ms en koude verbinding 2862 ms. PR208 laat de zes onafhankelijke technische
bootstrap-GETs gelijktijdig lopen; alle verificaties blijven verplicht voordat
metadata/verbinding beschikbaar komen. De artiestenbroncontrole verdeelt dezelfde
complete descriptorlijst in parallelle batches van acht. Cachecontract en
fingerprint wijzigen niet. Alleen vaste fasen, aantallen en numerieke timings
van de geautoriseerde onderhoudswerker worden gelogd; geen broninhoud of IDs.
Autorisatie- en openingstijden worden afzonderlijk gemeten voor verdere diagnose.
Dit voorbereidende resultaat is nog geen geslaagde éénsecondeproductieproef.
