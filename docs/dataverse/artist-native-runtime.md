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
