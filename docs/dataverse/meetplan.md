# Meetplan en acceptatiecriteria

Status: plan. Alle huidige waarden hieronder zijn **NIET GEMETEN**. Er is geen
claim dat Dataverse al sneller is dan de bestaande productieroute. De geslaagde
CRUD-proef bewijst uitsluitend toegang tot de fictieve testtabel.

## Definitie van gereed

T0 is de daadwerkelijke klik of directe navigatie. Gereed is aantoonbaar
bruikbare inhoud; niet alleen een header, lege kaart of verdwenen spinner.
De gebruiker heeft al een geldige ESMOJO/MFA-sessie. Aanmelden/72h-herstel en
access-tokenrefresh worden daarnaast apart gemeten, niet stil uit resultaten gewist.

| Scenario | Gereedcriterium | Streefdoel P95 |
|---|---|---:|
| Show openen | Header/planning/projectteam en benodigde data+code van Showprofiel, Risicoanalyse, Maatregelen bruikbaar | ≤1.000 ms |
| Directe maatregelen-/risicolink | Juiste tab inhoudelijk bruikbaar zonder tussenlanding | ≤1.000 ms |
| Tab wisselen na gereed | Doeltab inhoudelijk bruikbaar; nul nieuwe voorgrondrequests | ≤100 ms |
| Barrierkeuze → voorlopige floorberekening | Bekende vakken en juiste lokale berekening zichtbaar, pending basis herkenbaar | ≤100 ms, zonder read |
| Floor openen bij bevestigde basis | Editor en actuele ticketbasis bruikbaar vanuit bundel | ≤100 ms, zonder read |
| Zelfstandige kleine opslag | Bevestigde versie/afronding ontvangen, geen andere onbevestigde afhankelijkheid | ≤1.000 ms, voorlopig te bewijzen |
| Artiest openen | Vier bezoekerskaarten + juiste beschikbare score/label + historie/showkaarten bruikbaar | ≤1.000 ms |
| Historische showkaart selecteren | Correcte zes compacte kaarten zichtbaar | ≤100 ms als bundel reeds aanwezig |
| Rapport klein/normaal | Totalen/grafieken/tijdschema/filteraantallen en volledige incidentdataset beschikbaar | ≤1.000 ms |
| Rapport groot, uitsluitend toegestane proefvariant | Volledige aggregaten plus werkende eerste incidentpagina en correcte filters | ≤1.000 ms |
| Heropen reeds geladen inhoud | Juiste versie terug, geen onnodige netwerkronde | ≤200 ms |
| Beschikbare PDF downloadstart | Klik → eerste echte bestandsbyte browser | Warm ≤500 ms; koud ≤1.000 ms, nog onbewezen |
| PDF volledig ontvangen | Alle bytes, juiste omvang/hash | Geen universele 1s-eis; afhankelijk van omvang/throughput |

Foto's hebben gereserveerde ruimte. Eerste zichtbare foto/LCP/decode apart meten;
geen 'volledig geladen' claim terwijl een verwachte hero nog ontbreekt. Een
onbereikbare optionele bron mag de bruikbare zakelijke inhoud niet onbeperkt blokkeren.
Generatie van nog ontbrekende AI-bronnen/PDF's is een aparte achtergrondworkflow.

Deze doelen zijn geldig onder een vastgelegde representatieve verbinding en
belasting. Niet elk mobiel netwerk kan fysiek 1s halen; de ruwe meetomstandigheden
blijven daarom bij iedere uitkomst staan. Reële tegenvallers tonen, doelen niet
achteraf herdefiniëren om een groen resultaat te krijgen.

## Baseline en dezelfde proef tegenover elkaar

Maak per scenario drie vergelijkbare paden waar beschikbaar:

- B0: huidige code met synthetische fixtures, alleen om render/CPU/wachtrijen te isoleren.
- B1: huidige echte providerroute onder bevoegde MFA-sessie, read-only en zonder
  kliktelemetrie/mail-/importtrigger. Vereist veilige toegang; nog niet uitgevoerd.
- D1: nieuwe route met dezelfde synthetische functionele inhoud in afgescheiden
  Dataverse/SharePoint-proefomgeving. Geen echte productiegegevens in de huidige US-dev.

B0 is nooit een vervanging voor B1. Een lokale millisecondevergelijking van
fictieve netwerkantwoorden bewijst geen Dataverse-verbetering. Geen actieve
productieshow afronden of herstellen om een benchmark te kunnen uitvoeren.

## Werkloads

Exacte dataset-ID's en inhoud blijven in goedgekeurde private meetopslag, niet in
Git. Onderstaande aantallen zijn synthetische proefmaten, geen productie-inventaris.

| Code | Omvang / noodzakelijke varianten |
|---|---|
| W-SHOW | Eén reeks; 1/3/10 uitvoeringen; vier analysevragen plus artiestvragen; normale en volle risicolijst; maatregelen/bijlagen; concept/definitief |
| W-ARTIST | 1/10/100 historische uitvoeringen; korte/lange naam; vier kaarten aanwezig/ontbrekend; complete/partiële/onbeschikbare score |
| W-REPORT | 0/50/500/5.000 incidentregels en grootste werkelijk ondersteunde bron; korte/lange teksten; OnTrack auto/historisch/TSC |
| W-SLOTS | Meerdere uitvoeringen op dezelfde datum/zaal; afzonderlijke S1/S2-bronnen; identieke bewezen duplicaat apart |
| W-FLOOR | Seated, alle standaardbarriers en afwijkend; upload; ticketbasis ontbreekt/gewijzigd; A→B→A |
| W-PDF | Typische/grootste bestaande omvang na inventaris plus synthetische 1/5/10/25 MiB storageproef |
| W-SKILL | Vier mappen; één nieuwe-show-TXT; twee profielversies; één resultaat per soort; duplicaat, afwijkende bronversie en fout bestand |

Nul incidenten is een geldige zakelijke toestand bij volledige registratie en
betrouwbare bronmetadata. Huidige parser/koppeling mag een ontbrekende registratie
niet als nul behandelen; eventuele bestaande beperking eerst expliciet oplossen.
Geen huidige upload-/rapportgrens automatisch verruimen voor een groot fixture.

## Cache-, netwerk- en belastingmatrix

- Eerste serveraanroep zonder warme runtime of Microsoft-app-token.
- Warme server, koude browserdata; geen voorladen.
- Warme sessie, pagina al geladen; apart herkenbaar als cache-hit.
- Vooraf geladen inhoud; niet als koude eerste laadtijd meetellen.
- Gewijzigde bron, viewherbouw en heropen direct na Opslaan.
- Een gebruiker; voorlopig 5 en 10 gelijktijdige gebruikers. Werkelijke bedrijfspiek
  na inventarisatie vastleggen. Dezelfde S2S-identiteit kan een gedeeld limiet hebben.
- Desktop/netwerkprofiel vastleggen; minimaal normale en vertraagde verbinding,
  bijvoorbeeld 20 Mbit/s/40ms als expliciete proefinstelling. Native mobiele proef apart.
- Voor warme scenario's ten minste 100 metingen per representatieve workload;
  spreid echte coldstarts over afzonderlijke starts, niet 100 warme requests 'koud' noemen.
- Latency/retries/429/5xx afzonderlijk én in eindtijd tellen. Geen fouten uit P95
  verwijderen. Begrensde belasting, respecteer Retry-After en organisatietoestemming.

## Instrumentatievoorstel

Browser: klik, requeststart, eerste byte, JSON klaar, render gereed, doeltab gereed,
foto decode, download eerste/laatste byte waar aantoonbaar observeerbaar. Native
browserdownload is niet zomaar met fetch-marks gelijk te stellen; in proef via
browserprotocol/netwerkmeting en servermeting controleren.

Server: auth/MFA, actuele profiel/rolread, Microsoft-token hit/miss, Dataverse-read,
SharePoint/Graph-hop, projectiehit/dirty/versie, serialisatie en responsebytes.
Server-Timing bevat uitsluitend vaste fasen en durations, geen actor-, show-,
bestandsnamen, querystrings, credentials of recordinhoud. Gebruik publieke
workloadcodes voor rapportage. HAR's bevatten snel tokens/inhoud: geen ruwe HAR
uploaden naar Git/CI/chat; meet via allowlisted metrics en beschermde opslag.
Meetrapport/manifest als beschermd Document en Integratiestatus in de
goedgekeurde omgeving, niet als ruwe productie-export in Git. Nieuwe
productie-instrumentatie eerst op bestaande privacyregels toetsen.

Rapporteer mediane/P95 tijd, aantal externe calls, totale request-/responsebytes,
Dataverse-operations, cold/warm-status, piekgeheugen, foutpercentage en 429's.
Duurzame opslaggroei per incident/show/PDF-/snapshotversie apart meten.
Bij kleine samples geen onnauwkeurige statistische zekerheid suggereren.

Aanvankelijk budget voor een warme data-aanvraag: auth+rollen circa 250ms,
providerdata circa 300ms, transport/serialisatie circa 200ms, render circa 150ms,
reserve 100ms. Dit zijn werkbudgetten, geen providerbenchmarks of optelbare P95-
garanties. End-to-endtijd is de acceptatiemeting; overlap en extra auth/filecalls
moeten zichtbaar blijven. Als de budgets niet haalbaar zijn, ontwerp aanpassen.

## Beslissingsregel voor grote rapportages

De gebruiker accepteert gefaseerde incidentregels **alleen** voor grote rapporten
en alleen wanneer dit aantoonbaar nodig is om 1s te halen.

1. Meet volledige variant F per incidentaantal, gecomprimeerde omvang en tekstlengte.
2. Optimaliseer voorafberekening, queryvelden, payload en rendering zonder splitsing.
3. Meet variant P met dezelfde volledige aggregaten/filteraantallen en eerste pagina.
4. Alleen wanneer F de 1s-eis mist én P die in dezelfde matrix haalt, kan deze
   workloadklasse als groot worden geclassificeerd. Als beide falen: verder
   optimaliseren; pagineren niet als bereikt doel presenteren.
5. Grens niet nu willekeurig op 'meer dan 100 incidenten' vastzetten. Publiceer
   de gemeten omslag, inclusief bytes/tekstlengte en grootste normale rapport.
6. Gelijke sortering, filters over de hele dataset, complete totalen, consistente
   versie-cursors en geen dubbel/verdwenen incident op paginagrens verplicht.
7. Klein/normaal blijft volledig; geen stille toepassing van P op alle rapporten.

## Juistheid en storingen zijn onderdeel van de snelheidsproef

- Huidige gedeelde validators en golden tests voor scores/filters/12 indicatoren.
  Nul versus ontbrekend; bezoekersgewogen noemers; TSC-prefixoverrides; 97,5%-regel;
  geen dubbele bezoekers bij meerdere bronrapporten; afronding alleen voor weergave.
- Directe maatregellink, tab heen/terug en typen terwijl onafhankelijk item opslaat.
- Barrier/floor/Tickets: snelle klik tijdens save, vertraagde upload, onbekende
  writebevestiging, bronwijziging door tweede gebruiker, A→B→A en sessiewissel.
- Geen ongeautoriseerde data bij verkeerde module, geblokkeerd account, ontbrekende
  MFA, verkeerde Showbeheer-link/PIN of documentkoppeling. Nul cachelek tussen gebruikers.
- Laat resultaat kan actuele pagina, score of bronversie niet terugzetten.
- Import/mail/PDF/projectie herhalen maakt geen dubbele effecten. Geen e-mails
  uit benchmark; mailtransport fictief of expliciete bestaande testscope.
- Out-of-order worker/publicatie en grote downloads beïnvloeden normale pagina's niet.
- Eigenaar kan bron en doeltabellen/bestanden inclusief hashes, relaties en historie
  verzoenen. Alleen groene UI is geen migratiecontrole.

## Resultatensjabloon

| Scenario/workload | B1 P50/P95 | D1 P50/P95 | Calls/bytes | Fouten/429 | Juistheid | Uitkomst |
|---|---|---|---|---|---|---|
| Show + directe tab | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | Niet uitgevoerd | Open |
| Barrier → vloer | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | Niet uitgevoerd | Open |
| Artiest + historiedetail | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | Niet uitgevoerd | Open |
| Rapport volledig / groot | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | Niet uitgevoerd | Open |
| PDF start / gereed | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | Niet uitgevoerd | Open |
| Skilluitwisseling | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | NIET GEMETEN | Niet uitgevoerd | Open |

Vóór volledige migratie: inhoudelijke controles slagen, afgesproken P95-doelen
haalbaar, fouten/limieten onder reële piek bekend, omvang/kosten geaccepteerd en
herstel getest. Geen 'significant sneller' claim zonder baseline en relatieve
verbetering per route. Waar huidige code al snel is, minimaal geen regressie.
