# Datamodel: 36 eigen tabellen

Status: ontwerp v1, 11 november 2026. Geen tabel aangemaakt. Aantal exclusief
Dataverse-systeemtabellen, Supabase Auth en de wegwerp-testtabel crf9f_tabel1.
De eerste proef gebruikt een subset; dit is de voorgestelde volledige doelscope.

Gebruik één eigen solution/publisher met voorgestelde prefix `esmojo`. Logische
namen hieronder zijn ontwerpwaarden. EntitySetName wordt uit metadata gelezen,
niet door meervouden te raden. Definitieve verplichte velden/kolomtypen komen
in het schema-contract vóór implementatie.

Dezelfde inventaris is beschikbaar als [CSV](tabellen.csv).

## 01. Artiest — `esmojo_artiest`

- Eenheid: Eén canonieke artiest.
- Gegevens: Naam; huidige beschrijving; bron/ophaalmoment; foto-document; publicatiestatus.
- Relaties: Document.
- Huidige bron: Artiestenindex, biografieën en MOJO-metadata.

## 02. Locatie — `esmojo_locatie`

- Eenheid: Eén zaal/locatie.
- Gegevens: Naam; stad; configuratieversie; toepasbaarheidsregels; verwijzingen naar beschermde schema’s.
- Relaties: Document.
- Huidige bron: MOJO/OnTrack-catalogus; barrierreferenties.

## 03. Concertreeks — `esmojo_concertreeks`

- Eenheid: Eén aaneengesloten reeks met gedeelde voorbereiding.
- Gegevens: Artiest; locatie; eerste/laatste datum; stabiele reeks-ID; actuele voorbereidingsgeneratie.
- Relaties: Artiest; Locatie.
- Huidige bron: algemeen.json; generalConcertId; actieve snapshot.

## 04. Concert — `esmojo_concert`

- Eenheid: Eén daadwerkelijke uitvoering, ook bij meerdere uitvoeringen op dezelfde dag.
- Gegevens: Reeks; artiest; locatie; datum; middag/avond/uitvoeringssleutel; bestaande concert-ID; bronlink.
- Relaties: Concertreeks; Artiest; Locatie.
- Huidige bron: concert.json; beide agenda-indexen; historische registers.

## 05. Medewerker — `esmojo_medewerker`

- Eenheid: Eén medewerker/contact, met optionele Supabase Auth-koppeling.
- Gegevens: Auth-user-ID indien aanwezig uniek; naam; e-mail; bedrijf; functie; rol; geactiveerd/geblokkeerd; avatar-document.
- Relaties: Document.
- Huidige bron: _esmojo_accounts_v1.json; géén wachtwoord/MFA.

## 06. Modulerecht — `esmojo_modulerecht`

- Eenheid: Eén expliciet modulerecht per medewerker.
- Gegevens: Medewerker; module; toegestaan; rechtenversie; wijzigingsmoment.
- Relaties: Medewerker.
- Huidige bron: Accountmodules en actuele Drive-profielrechten.

## 07. Projectteamkoppeling — `esmojo_projectteam`

- Eenheid: Eén medewerkerfunctie binnen reeks of concert.
- Gegevens: Medewerker; reeks/concert; functie; geldigheid; oorspronkelijke koppeling.
- Relaties: Medewerker; Concertreeks; Concert.
- Huidige bron: _esmojo_show_assignments_v1.json.

## 08. Bezoekersgegeven — `esmojo_bezoekersgegeven`

- Eenheid: Eén actuele veldwaarde per concert en veldsoort.
- Gegevens: Verkocht aantal; herkomstvelden als begrensde gestructureerde inhoud; bron; controle-/afrondstatus; revisie; waardeherkomst; tel-/rekenbasis.
- Relaties: Concert; Medewerker.
- Huidige bron: bezoekersdata.json; ticket workflow; showgegevens-tsc.json.

## 09. Analyse — `esmojo_analyse`

- Eenheid: Eén actuele analysevraag binnen een reeks.
- Gegevens: Categorie; vraag-ID; samenvatting; concept/afgerond; scorevoorbereiding; revisie; auteur; bronverwijzingen.
- Relaties: Concertreeks; Medewerker.
- Huidige bron: showprofiel.json; actieve profile-snapshot.

## 10. Analyseafronding — `esmojo_analyseafronding`

- Eenheid: Eén bezoekers-/artiestafronding per reeks en categorie.
- Gegevens: Definitief cijfer/toelichting; afgerond door/op; geldige bronversies; ingetrokken-status.
- Relaties: Concertreeks; Medewerker.
- Huidige bron: analyseafronding.json; actieve final-snapshot.

## 11. Onderzoeksresultaat — `esmojo_onderzoeksresultaat`

- Eenheid: Eén onderzoeksvraag/run/versie.
- Gegevens: Vraag; uitkomst; bronverwijzingen; model-/promptversie; status; gekoppelde brondocumenten.
- Relaties: Concertreeks; Document.
- Huidige bron: onderzoek_XX.json; onderzoeks-/AI-bestanden.

## 12. Productiekeuze — `esmojo_productiekeuze`

- Eenheid: Eén zelfstandige productie-instelling per reeks.
- Gegevens: Vaste onderwerpcode; Ja/Nee/NVT of gevalideerde configuratie; revisie.
- Relaties: Concertreeks.
- Huidige bron: productionele-risicos.json; production.choices.

## 13. Barrierbeoordeling — `esmojo_barrierbeoordeling`

- Eenheid: Eén actuele barrierbeoordeling per reeks.
- Gegevens: Opstelling; schemaversie/bijlage; inhoudshash; risicoklasse; toelichting/maatregel; revisie; afronding.
- Relaties: Concertreeks; Document; Medewerker.
- Huidige bron: BarrierLayout; actieve production.barrier; historie afzonderlijk.

## 14. Vloerdrukbeoordeling — `esmojo_vloerdrukbeoordeling`

- Eenheid: Eén actuele vloerdrukbeoordeling per reeks.
- Gegevens: Barrierbron/signatuur/revisie; ticketversievector; gebruikte dagwaarden/max; risicobeoordeling; afronding.
- Relaties: Concertreeks; Barrierbeoordeling; Medewerker.
- Huidige bron: FloorPressure; vertrouwelijke vloer-/ticketbasis.

## 15. Publieksvak — `esmojo_publieksvak`

- Eenheid: Eén vak binnen een vloerdrukbeoordeling.
- Gegevens: Naam; volgorde; bezoekers; netto m²; bronversie; geen automatisch risiconiveau.
- Relaties: Vloerdrukbeoordeling.
- Huidige bron: Vloerdruk rows; vaste/afwijkende vakken.

## 16. Operationeel risico — `esmojo_operationeelrisico`

- Eenheid: Eén risico binnen een vastgestelde risicobronversie.
- Gegevens: Reeks; stabiele risico-ID; definitie; gevolg; bron; beoordeling; notitie; revisie; afhandelstatus.
- Relaties: Concertreeks; Medewerker.
- Huidige bron: ShowProfileRisks; operationalReviews.

## 17. Beheersmaatregel — `esmojo_beheersmaatregel`

- Eenheid: Eén maatregel per risico of vast productieonderwerp.
- Gegevens: Risico/onderwerp; tekst; implementatiestatus; score na implementatie; briefingkeuze; afronding; bijlagen.
- Relaties: Concertreeks; Operationeel risico; Document.
- Huidige bron: measureImplementations; measureUploads.

## 18. Bronrapport — `esmojo_bronrapport`

- Eenheid: Eén afzonderlijk geïmporteerd bronrapport en bronversie.
- Gegevens: Concert; importtype; origineel CSV-document; hash; bron-ID/bestandsidentiteit; volledigheid; TSC-voorregelwaarden; parseversie; koppelstatus.
- Relaties: Concert; Document.
- Huidige bron: OnTrack automatisch/historisch; TSC historisch; S1/S2 behouden.

## 19. Incident — `esmojo_incident`

- Eenheid: Eén incidentregel binnen één bronrapportversie.
- Gegevens: Stabiele bronregel-ID; datum/tijd; discipline/division; type; zone; prioriteit; omschrijving/notitie; filterkenmerken.
- Relaties: Bronrapport.
- Huidige bron: CSV-inhoud via bestaande parser/velddefinities.

## 20. Tijdschemaregel — `esmojo_tijdschemaregel`

- Eenheid: Eén tijdschemapunt met bron en versie.
- Gegevens: Concert; volgorde; soort; oorspronkelijke/publicatietekst; tijd/null; gepland/feitelijk; vastgelegd op.
- Relaties: Concert; Bronrapport.
- Huidige bron: Tijdschema_*.json; TSC-voorregel.

## 21. Incidentreferentiedag — `esmojo_incidentreferentiedag`

- Eenheid: Eén gepubliceerde Nederlandse dagstand per rekenmodel.
- Gegevens: Bronset/versie; unieke concerten; bezoekersbasis; twaalf tellers/noemers en niet-afgeronde verhoudingen; publicatiemoment.
- Relaties: Bronrapport via bronmanifest.
- Huidige bron: _esmojo_incident_daily_v1.json; metrics-register.

## 22. Artiestenscore — `esmojo_artiestenscore`

- Eenheid: Eén berekende scoreversie per artiest/bronset/referentiedag.
- Gegevens: Vier onderdelen; 25/10 incidentonderdelen; volledig/onvolledig/onbeschikbaar; ruwe waarden; klasse; modelversie; bronvector.
- Relaties: Artiest; Incidentreferentiedag.
- Huidige bron: Bestaande centrale scorelogica; geen nieuwe formule.

## 23. Document — `esmojo_document`

- Eenheid: Eén fysieke bestandsversie.
- Gegevens: Opslagsoort; Dataverse File/Image voor niet-PDF; SharePoint site/drive/item/versie voor PDF en skillbestanden; type; logische documentgroep; versie; bestandsgrootte/MIME/SHA-256; status; bronfingerprint; eigenaar/koppelingen.
- Relaties: Reeks/concert/medewerker/maatregel/bronrapport/onderzoek via expliciete lookups.
- Huidige bron: Alle CSV/PDF/afbeeldingen/bijlagen; definitieve versies immutable.

## 24. Showbeheer — `esmojo_showbeheer`

- Eenheid: Eén externe Showbeheer-toegang per bestaande show/reeks-scope.
- Gegevens: Bestaande UUID/linkhash; versleutelde credentials; PIN-hash; enabled; vier statusverwijzingen; versie.
- Relaties: Concertreeks; Concert indien nodig.
- Huidige bron: esmojo_show_management; bestaande links behouden.

## 25. Zaalbijdrage — `esmojo_zaalbijdrage`

- Eenheid: Eén sectie per Showbeheer.
- Gegevens: Personele bezetting/Omgevingsbeeld/Veiligheidsbeleid/Rapportages; sectiestatus; begrensde formulierinhoud; revisie.
- Relaties: Showbeheer; Document.
- Huidige bron: Nu lege secties; toekomstige inhoud krijgt expliciet veldontwerp/classificatie.

## 26. Ontvangersgroep — `esmojo_ontvangersgroep`

- Eenheid: Eén mailingconfiguratie per doel/locatie.
- Gegevens: Doel; locatie; expliciete medewerkerontvangers; templatekeuze; instellingenversie.
- Relaties: Locatie; Medewerker.
- Huidige bron: _esmojo_ontrack_v1.json; mailinginstellingen.

## 27. Verzending — `esmojo_verzending`

- Eenheid: Eén versiegebonden mailbezorging per ontvanger.
- Gegevens: Rapport/document; ontvanger; templateversie; idempotentiesleutel; provider-ID; verzend-/openstatus; tellingen; tokenhash.
- Relaties: Medewerker; Document; Bronrapport.
- Huidige bron: OnTrackReports; OnlineReportMail; openingsstatus.

## 28. Integratiestatus — `esmojo_integratiestatus`

- Eenheid: Eén configuratie/cursor per integratie of importbatch.
- Gegevens: Bronsoort; veilige configuratie; laatste cursor; schemaversie; synchronisatiestatus; mappingmanifest; geen client secrets.
- Relaties: Concert/Artiest/Document waar nodig.
- Huidige bron: MOJO-, OnTrack-, historie- en importcontrole-indexen.

## 29. OAuth-client — `esmojo_oauthclient`

- Eenheid: Eén bestaande MCP/OAuth-clientregistratie.
- Gegevens: Client-ID; gevalideerde callbacks; vertrouwelijkheidskenmerken; clientsecrethash indien aanwezig; vervaldatum.
- Relaties: Medewerker waar van toepassing.
- Huidige bron: _esmojo_mcp_oauth_v1.json; geen nieuwe identiteitprovider.

## 30. OAuth-toestemming — `esmojo_oauthgrant`

- Eenheid: Eén scoped grant/code-/refresh-tokenhashregistratie.
- Gegevens: Client; actor; scopes; consent; PKCE; gehashte codes/tokens; geldigheid/intrekking.
- Relaties: OAuth-client; Medewerker.
- Huidige bron: Bestaande MCP-grants; login zelf blijft Supabase Auth.

## 31. Historieversie — `esmojo_historie`

- Eenheid: Eén expliciete historische versie/handeling.
- Gegevens: Entiteitsoort; oorspronkelijke record-ID; revisie; actor; tijd; bron; begrensde snapshot/veldwijziging; classificatie.
- Relaties: Bestaande entiteit en Medewerker via gevalideerde koppeling.
- Huidige bron: Snapshot-historie, final history, Drive-bestandsversies waar vereist.

## 32. Opdracht — `esmojo_opdracht`

- Eenheid: Eén idempotent commando/achtergrondopdracht.
- Gegevens: Resource; command-ID; bronversie; afhankelijkheden; lease; status; poging; vaste foutcode; ontvangstbewijs; payload volgens classificatie.
- Relaties: Document/bronrapport/reeks/concert.
- Huidige bron: DB-receipts; PDF/import/mail/projection jobs; geen duplicerende cronacties.

## 33. Routealias — `esmojo_routealias`

- Eenheid: Eén bestaande externe of oude ESMOJO-identificatie.
- Gegevens: Soort; oude concert-ID/artist-ID/slug; canonieke doel-ID; bron; redirectbeleid.
- Relaties: Artiest; Concert; Concertreeks; Document indien nodig.
- Huidige bron: Oude URLs/aliases; nieuwe namen veranderen bestaande links niet.

## 34. Artiestbezoek — `esmojo_artiestbezoek`

- Eenheid: Eén anoniem bestaand klik-event.
- Gegevens: Artiest; tijdstip; willekeurige event-ID uniek; verloopt na bestaande 31 dagen; geen account/IP.
- Relaties: Artiest.
- Huidige bron: Redis artist-views: blijvende 31-daagse eventgegevens verhuizen.

## 35. Paginaweergave — `esmojo_paginaweergave`

- Eenheid: Eén versiegebonden weergave per eigenaar/soort/rechtenscope.
- Gegevens: Soort; eigenaar; scope; contract-/bronversie; dirty-generatie; gepubliceerd op; compact JSON; geen grote bytes.
- Relaties: Artiest/reeks/concert via gevalideerde eigenaar.
- Huidige bron: Showbundle; artistlanding; reportsummary; menus; dagranking; homepage.

## 36. Technische status — `esmojo_technischestatus`

- Eenheid: Eén technische guard/teller per resource en doel.
- Gegevens: Soort; scope-key; generatie/ETag; tijdvenster; teller/lease; verloopmoment; uitsluitend noodzakelijke status.
- Relaties: Showbeheer/Opdracht/eigenaar.
- Huidige bron: Pogingslimiet uit SQL; generatie-/bronbewaking; atomaire implementatie te bewijzen.

## Grenzen en keuzes

- Gegevens blijven geclassificeerd zoals nu. Dataverse-opslag voor vertrouwelijke
  inhoud is de beoogde migratierichting; de productieomgeving en concrete
  toestemmingen moeten vóór kopiëren vastgesteld zijn. Afgeleide inhoud erft de
  strengste bronclassificatie en komt niet automatisch in een publieke projectie.
- Canonieke entiteiten zijn bewerkbaar; Paginaweergave en score/dagresultaten zijn
  reproduceerbare, automatisch opgebouwde resultaten. Paginaweergave deelt één
  tabel omdat publicatie, scope, versiecontrole en levenscyclus gelijk zijn.
  Dit rechtvaardigt geen generieke alles-in-één-tabel voor de brongegevens.
- De bestaande code-/configgebonden superbeheerderpolicy blijft behouden; een
  bewerkbare rolkolom of nieuwe Microsoft-rol mag die toekenning niet verruimen.
- Kolom-/JSON-/bestandlimieten worden vóór import per type getoetst. Geen stille
  afkapping van lange omschrijvingen, historische JSON of bronbestanden. Een
  noodzakelijke afwijkende opslag-/laadroute eerst expliciet ontwerpen en testen.
- Nieuwe relaties zijn GUID-lookups. Bestaande IDs, slugs en concert-URLs blijven
  via unieke alternatieve sleutels/Routealias bestaan. Geen naam als primaire sleutel.
- Geen uniekheid afdwingen op alleen artiest+datum+zaal: meerdere uitvoeringen
  op één dag en afzonderlijke S1/S2-bronrapporten blijven onderscheidbaar.
- Medewerker kan een bestaande contactpersoon zijn zonder ESMOJO-login. Alleen
  expliciet geautoriseerde Auth-gekoppelde profielen krijgen apprechten. Maak geen
  nieuwe Auth-accounts om historische auteurs of zaalcontacten te migreren.
- Een appgebruiker verwijst naar Supabase Auth user-ID; wachtwoord, MFA en refreshsessie
  blijven bij Supabase Auth. Dataverse CreatedBy is de technische app en vervangt
  niet de echte ESMOJO-auteur: handelende medewerker/tijd worden apart vastgelegd.
- Bezoekerswaarden zijn per concert/veldversie. Eén bestaande meerdaagse veldactie
  kan meerdere dagrecords in één platformtransactie bijwerken. Het bestaande
  definitieve veld-/analysecontract en de gebruikte versievector moeten daarbij
  behouden blijven. De vloerreferentie blijft het maximum van relevante dagen.
- Werkelijke TSC-telling, historisch ticket-as-bezoekers en 97,5%-regel krijgen
  expliciete herkomst. Ontbrekend is niet nul. Een geldige nul blijft nul.
- Historie is append-only volgens afgesproken retentie; niet automatisch onbeperkt.
  Native Dataverse-audit is aanvullend, geen garantie dat oude bestandsbytes of
  alle oorspronkelijke ESMOJO-revisies ermee behouden worden.
- Document kan veel bestandsversies bevatten. Eén versie heeft één canonieke
  binary-opslag: SharePoint voor PDF/skillbestanden of Dataverse File/Image voor
  overige bestanden. Dezelfde PDF wordt voor mail, download en skill hergebruikt.
  Alleen metadata/verwijzingen in Dataverse bij SharePoint-bestanden; geen dubbele PDF.
  De vier SharePoint-mappen vereisen geen extra Dataverse-tabellen: Document,
  Onderzoeksresultaat, Opdracht en Integratiestatus dekken die gegevensstromen.
- Incidenten per bronrapportversie; alleen de gepubliceerde datasetversie doet mee.
  Een concert krijgt één geldige bezoekersbasis per daadwerkelijke uitvoering.
  Twee bronrapporten verdubbelen die bezoekersbasis niet automatisch.
- Zaalbijdrage beschrijft de vier afgesproken secties. Nieuwe persoonsvelden of
  formulieren zijn geen onderdeel van deze migratieopdracht en vragen eigen keuzes.
- OAuth-tabellen behouden bestaande scoped toestemmingen en gehashte tokens;
  Microsoft-appsecrets en certificaatsleutels blijven beveiligde deploymentconfiguratie.
- Technische status is een gecoördineerde guard, geen tweede bron van bedrijfsinhoud.
  Platformtransacties/Custom API en CAS-races moeten in de proef bewezen worden.
- Bestaande kortdurende MFA-/OAuth-replay- en rate-limitcaches in Redis kunnen
  tijdelijk blijven. Ze bevatten alleen de al toegestane technische waarden en
  horen niet bij de te behouden Supabase-applicatietabellen of Drive-bestanden.
  Andere duurzame Redis-gegevens (artiestbezoeken) gaan wel naar Dataverse.
- Niet iedere status/keuzelijst krijgt een tabel: vaste codes blijven gevalideerde
  choices/kolommen; geen lookupverzoek voor iedere kleine vaste keuze.
- Concept/definitief, stabiele onderwerp-ID, domeinrevisie, technische RowVersion
  en bronfingerprint zijn verschillende zaken en worden niet door één datum vervangen.
