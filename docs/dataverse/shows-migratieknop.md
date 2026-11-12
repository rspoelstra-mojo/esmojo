# Shows kopiëren naar Dataverse

De knop **Alle Shows-gegevens overzetten** staat op `/beheerder/datatransitie`.
Dit is een bewuste, hervatbare kopieeractie achter actuele beheerder-, Shows-,
activatie- en MFA-controles. Niet automatisch starten bij paginaladen. De gebruiker
heeft vanaf 12 november 2026 een venster van 24 uur zonder handmatige Shows-wijzigingen
aangegeven. De code blijft ook automatische bronwijzigingen controleren.

## Gebruik

Klik één keer en houd het tabblad open. Alle 52 unieke sleutelindexen worden eerst
gelezen, inclusief de vier nog lopende indexen voor Historieversie, Opdracht (twee)
en Routealias. Zolang één niet Actief is, volgt geen datawrite. Daarna controleert
dezelfde server de volledige 564 stappen van het vaste schema, in uitsluitend
leesmodus: geen aanmaak, reparatie, solution-associatie of publicatie.

De verwerking gaat vervolgens in kleine batches door. De knop toont de huidige
fase en aantallen teruggelezen records/bestanden. Bij onderbreking hervat dezelfde
knop vanuit een versleutelde, actor- en contractgebonden cursor in paginageheugen.
Na herladen begint de controle opnieuw en worden aanwezige records en bestanden
herkend. Geen migratie-inhoud of cursor in localStorage, logs of analytics.

## Bronnen en mapping

| Bron | Bestemming |
|---|---|
| Productie-index, reeksdatums en algemene showmetadata | Artiest, Locatie, Concertreeks, Concert en Routealias, inclusief bestaande Dataverse-showroutes |
| Shows met onderzoek in Dataverse die nog geen Drive-showmap hebben | Zelfde catalogustabellen, zonder Drive-mappen aan te maken of onderzoekinhoud te dupliceren |
| Huidige gekoppelde artiestbiografie en publieke foto-URL | Artiest; externe foto blijft een bron-URL |
| Bestaande accountprofielen, expliciete modules en avatars | Medewerker, Modulerecht, Document en Documentkoppeling; Auth, wachtwoorden, MFA, sessies en accountnonces blijven buiten deze migratie |
| Persoonlijke showtoewijzingen | Projectteam met echte Medewerker-/Concert-/Concertreeksrelaties |
| Actieve Supabase-profiel/final/productiestand; anders Drive | Analyse, Analyseafronding, Productiekeuze, Barrierbeoordeling, Operationeel risico en Beheersmaatregel |
| Volledige Drive-vloerbron en bezoekersbestanden | Vloerdrukbeoordeling, Publieksvak, Bezoekersgegeven en Ticketverkoop; expliciete nul blijft nul, ontbrekend blijft ontbrekend |
| Bestaande PDF-registers, risicoanalysebronnen en bijlagenledgers | Document met Dataverse File, Documentkoppeling, Risicoanalysebron en Operationeel risico; bronrevisie, SHA-256, versies, bewijs en bronbasis blijven behouden |
| Vijf vaste beschermde barrierbeelden | Document/File met bestaande vaste hashes; geen nieuwe publieke assets |
| Showbeheer | Showbeheer en Zaalbijdrage; bestaande hashes, versleutelde gegevens en oorspronkelijke crypto-AAD-ID blijven exact behouden; pogingslimiet naar Technische status |
| Gepubliceerde tijdschema's voor de betreffende shows | Tijdschemaregel, plus volledige oorspronkelijke snapshot in Historie |
| Bronbestanden en oorspronkelijke voor/na-historie | Historie met volledige snapshots en hashes, naast de gewone genormaliseerde rijen |
| Recente bevestigde Supabase-commando's | Opdracht met oorspronkelijke commandosleutel en resultaat, geen nieuwe uitvoeringsopdracht |
| Succesvol gecontroleerde showoverdracht | Integratiestatus, pas na records, bestanden en onderzoekrelaties |
| Bestaande onderzoeksresultaten | Markdown/bronnen/bronnamespace/opruimstatus behouden; uitsluitend lege Concertreeks-relatie aanvullen met ETag-controle |

Geen alle-in-één show-snapshot als vervanging van de doeltabellen: gewone gegevens
worden in de echte kolommen en relaties geschreven. De extra Historie-snapshots
bewaren de oorspronkelijke gegevens en technische herkomst voor controle.

Actieve Supabase-gegevens gaan vóór een oudere Drive-kopie. Bij lopende leases,
onzekere commando's of een nog niet naar Drive gespiegelde actieve stand stopt de
kopie; er wordt geen verouderde Drive-stand als nieuwste waarheid gekozen.
Onbekende showbestanden, onduidelijke verkoopkoppelingen, ontbrekende relaties,
niet-representeerbare waarden en te grote batches blokkeren expliciet. Er is
geen stille afkapping of melding 'klaar' na een onvolledige kopie.

De overige tabellen worden alleen gevuld als er bijpassende bestaande gegevens
zijn. Tijdelijke applicatiecaches/paginaweergaven en nieuwe integratie-opdrachten
worden niet uitgevonden. Incident-CSV's, rapportagemailregisters en rapportages uit
de afzonderlijke Rapportages-module vallen buiten deze Shows-overdracht.

## Schrijf- en bestandscontrole

De server gebruikt uitsluitend het vaste schema en haalt echte EntitySetName,
primaire ID en navigatie-eigenschappen uit metadata. Stabiele sleutel en GUID
komen uit een domeingescheiden bronidentiteit. Voor ieder record wordt eerst
gelezen. Ontbrekende records krijgen een create-only PATCH met `If-None-Match: *`;
bestaande afwijkende gegevens worden nooit automatisch overschreven.

Elke bedoelde kolom en lookup wordt na aanmaak teruggelezen. Alleen de twee
expliciete aanvullingen mogen bestaande records aanpassen: een lege relatie
invullen, of een migratiedocument na succesvolle bytecontrole van Pending naar
Verified zetten. Beide gebruiken `If-Match` en terugleescontrole.

Dataverse File-upload gebruikt native Initialize/UploadBlock/Commit. Batches zijn
1 MiB; tot de bestaande schemagrens van 128 MiB. Daarna native DownloadBlock en
vergelijking met elk bronblok. De bronhash en grootte blijven bij iedere stap
gebonden. Een reeds aanwezig bestand wordt uitsluitend vergeleken; bij een
verschil stoppen. Native continuatietokens blijven versleuteld in de cursor.

## Wat dit niet uitvoert

Geen bronverwijdering, SharePoint-opruiming, e-mails, nieuwe AI-analyses, nieuwe
MFA-/Auth-gebruikers of omschakeling van website-readers/writers. De bestaande
opslagroutes blijven functioneren. Na een geslaagde kopie volgt afzonderlijke
validatie en omschakeling van de Shows-module. De nieuwe Apps Script-exporter
wordt via de bestaande beveiligde main-publicatieworkflow uitgerold.
