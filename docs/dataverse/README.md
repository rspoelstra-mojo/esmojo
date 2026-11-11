# ESMOJO: Dataverse-ontwerp en meetplan

Ontwerp v1 — 11 november 2026. Alleen documentatie; geen migratie, schema-aanmaak
of wijziging van live gedrag. Broncodebasis: `555d807` op main. De broninventaris
beschrijft aantoonbaar codegebruik; echte aantallen, bestandsgroottes en latency
zijn nog niet uit productie geïnventariseerd of gemeten.

## Besluiten en ontwerpvoorstel

Bevestigd door gebruiker:

- Supabase Auth blijft voor aanmelden, wachtwoordbeveiliging, MFA en sessies.
- Overige blijvende applicatiegegevens moeten naar Dataverse; PDF’s en de vier
  skillmappen naar SharePoint binnen Microsoft, met
  uiteindelijk geen applicatiedata achter in Supabase of Google Drive.
- Meerdere brontabellen en kleine vooraf samengestelde pagina-antwoorden.
- Eerste bruikbare show-, artiest- en rapportagepagina: streefdoel 1 seconde.
- Showprofiel, Risicoanalyse en Maatregelen direct wisselbaar; directe links werken.
- Op artiestlanding onmiddellijk de vier bezoekerskaarten én beschikbare score.
- Rapporten daarna stil nieuwste-eerst, één gecontroleerde wachtrij, klikprioriteit.
- Kleine/normale rapportages volledig. Alleen grote rapportages mogen incidentregels
  later ophalen, en uitsluitend bij bewezen noodzaak en bewezen 1s-resultaat.

Voorstel in dit plan:

- **36 eigen Dataverse-tabellen** voor de volledige huidige scope, inclusief
  historie, bestanden, mail, bestaande MCP-toestemmingen en technische status.
  De eerste proef gebruikt slechts een subset. Geen 36 nieuwe API-aanroepen per pagina.
- **Document** bewaart metadata en versieverwijzingen. PDF-bytes komen centraal
  in SharePoint; overige bronbestanden/afbeeldingen kunnen in Dataverse File/Image.
  Geen blijvende dubbele PDF in beide systemen. Zie de aparte SharePoint-uitwerking.
- **Paginaweergave** bewaart kleine, geautoriseerde JSON-antwoorden. Ze zijn
  reproduceerbaar en worden nooit handmatig als tweede bron bijgehouden.
- Lichte wijzigingen worden direct in de betreffende showweergave verwerkt;
  zware berekeningen/generatie via versiegebonden opdrachten op de achtergrond.
- Geen nieuwe gedeelde inhoudscache buiten Dataverse in de eerste proef.
  Tijdelijke server-/browsergeheugencache wel, binnen bestaande privacygrenzen.

## Documenten

1. [Volledig datamodel: 36 tabellen](datamodel.md) en [tabeloverzicht als CSV](tabellen.csv).
2. [Huidige bronnen en migratiebestemming](broninventaris.md).
3. [Architectuur, laadpaden en barrier → vloerdruk](architectuur.md).
4. [PDF- en bestandsopslag, versies en downloadprestaties](bestanden-en-pdf.md).
5. [Meetplan, meetdefinities en acceptatiecriteria](meetplan.md).
6. [SharePoint en vier ChatGPT-skillmappen](sharepoint-en-skill.md).
7. [Proefmigratie, omschakeling, terugval en volledige opruiming](migratieplan.md).

## Eerstvolgende uitvoerbare fase

Een afgeschermde verticale proef met fictieve gegevens: één artiest, een reeks,
meerdere concerten, de drie showtabbladen, barrier/vloer, kleine én grote
rapportages en bestaande PDF-versies. De bestaande live gegevensroute blijft
leidend. Geen productiegegevens naar de huidige Amerikaanse ontwikkelomgeving.

De proef moet zowel prestatie- als correctheidseisen bewijzen, niet alleen CRUD.
Daarna volgen een echte volume-inventarisatie en gecontroleerde bronvergelijking
in een goedgekeurde omgeving. De huidige `crf9f_tabel1`-proef bewijst alleen
verbinding/lees-/schrijftoegang op die testtabel, niet het volledige ontwerp.

## Blokkerende keuzes vóór productie

| Onderwerp | Status en vereiste uitkomst |
|---|---|
| Productieomgeving en regio | Huidige omgeving is Ontwikkelaar, Verenigde Staten. Productie/regio en verwerking van vertrouwelijke gegevens nog vaststellen. |
| Licenties en indirect gebruik | Microsoft-beheerder moet Vercel + Supabase-gebruikers + externe PIN-gebruikers toetsen. Een S2S-app omzeilt licentievoorwaarden niet. |
| Capaciteit en limieten | Werkelijke DB-/file-/auditvolumes, groei, API-toewijzing en service protection meten. |
| Toegangsbeleid | Beperkte productie-app-rol; System Customizer is alleen tijdelijke testinrichting. Geen eindgebruikertoegang tot ruwe tabellen buiten appbeleid. |
| Cross-record transacties | Bronwijziging/floorafronding, opdrachtregistratie en publicatie onder races bewijzen. Eventueel Dataverse Custom API/plug-in nodig. |
| SharePoint en skill | Site/bibliotheek, Graph-sitegrant en ChatGPT-tool met lees-/schrijfmogelijkheid nog aantonen. Dataverse-S2S is hiervoor geen bewijs. |
| PDF-downloadtransport | Geauthenticeerd streamen en eventueel Range/chunk-gedrag via echte Graph/SharePoint-route bewijzen. Geen geheime downloadtokens in URL/log. |
| Werkelijke inventaris | Geen productietelling/manifest beschikbaar in deze omgeving; toegestane read-only export door bevoegde gebruiker/worker nodig. |
| Bewaartermijnen en terugvalvenster | Eigenaar moet termijnen, herstelpad en definitieve verwijdering van bronnen/back-ups vaststellen. |

Er wordt in dit plan geen onbekende keuze als goedgekeurd of technisch bewezen
gepresenteerd. De daadwerkelijke migratie en verwijdering vallen buiten deze opdracht.
