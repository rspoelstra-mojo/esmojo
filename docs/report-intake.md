# CSV-rapportageaanlevering (SharePoint → Power Automate → Dataverse → ESMOJO)

Doel: een incidents-CSV die in de SharePoint-map verschijnt, wordt automatisch een Rapportage in ESMOJO.
Bestandsnaam: `incidents_<artiest>_<locatie>_DDMMYYYY[_s1|_s2].csv` (slug met koppeltekens, bv. `incidents_good-charlotte_AFAS-Live_16112026.csv`).

## Rolverdeling
- **Power Automate** bewaart het originele bestand in Dataverse-tabel Rapportageontvangsten (`esmojo_rapportontvangst`):
  `sleutel`, `bestandsnaam`, `bronid`, `bronversie`, het bestand in de File-kolom, `bronbytes` (SharePoint-grootte)
  en als allerlaatste stap `status = ontvangen`. De flow zet nooit een andere status.
- **ESMOJO** (workflow `report-intake.yml`, elke 5 minuten, route `api/report-intake-sync`, GitHub OIDC main) verwerkt
  alleen ontvangsten met status `ontvangen` (of een verwerking waarvan de 15-minutenlease verlopen is).

## Statussen
`upload-bezig` (flow bezig) → `ontvangen` (flow klaar) → `verwerken` (ESMOJO, lease via ETag) →
`verwerkt` | `handmatig` (bestandsnaam/zaal/dubbelzinnig, niets gegokt) | `ongeldig` (CSV-fout) | `fout` (na 5 pogingen).
`resultaat` bevat alleen een kort JSON-resultaat zonder CSV-inhoud.

## Controle op volledige overdracht
Het bestand wordt in 1 MiB-blokken teruggelezen en moet gelijk zijn aan de aangegeven grootte én aan `bronbytes`
(als de flow die levert); ESMOJO berekent zelf de SHA-256 (`bestandshash`) en parseert de CSV met de bestaande parser.
Bij een mislukte check wordt niets gepubliceerd; de ontvangst blijft opnieuw verwerkbaar.

## Concert en artiest
Bestaande match op concert-ID/artiest/zaal/datum (S1/S2 = middag/avond). Staat het concert nog niet in ESMOJO,
dan koppelt ESMOJO de rapportage aan de bestaande artiest of maakt die aan zoals de 05:00-import
(`a_<sha256 van genormaliseerde naam>`), met een rapport-only concertreeks/concert (`tooninshows=false`).
Een nieuwe artiestnaam wordt uit de bestandsnaam afgeleid (hoofdletter per woord). De latere 05:00-import hergebruikt dat concert.
Dubbelzinnige of onbekende gevallen krijgen status `handmatig`.

## Publicatie
Hergebruikt de bewezen migratie-bouwstenen (`server/reports-migration/*`): Document + File, rapportbron, versie,
context, incidenten (17 originele kolommen, bronpositie, lange tekst in blokken). Alles create-only met
terugleescontrole; pas na verificatie van alle rijen wordt de versie `verified` en de rapportage beschikbaar.
De bestaande online-rapportmail pakt een nieuw beschikbare rapportage zelf op (geen aparte mail vanuit de intake).

## Beheer
Beheerder → Datatransitie: "CSV-rapportages ontvangen" (schema, ook de nieuwe kolommen `bronbytes`, `bestandshash`,
`concert`) en "Ontvangen CSV's controleren" (alleen-lezen overzicht).
Nog niet ondersteund: een tweede, afwijkende CSV voor een al gepubliceerde rapportage (blijft `fout`/handmatig).

## Leescontract (V1.193)
De Rapportages-lezer (`server/dataverse-reports/read.js`) eist in de bronrij `validation.context` gelijk aan `source.context`.
V1.192 schreef dat veld niet: de eerste ontvangst (Tove Lo) was daardoor onleesbaar en kon het menu verstoren.
V1.193 schrijft het veld, toetst de geplande bron vóór publicatie met dezelfde lezerfunctie (`assertReadable`) en
herstelt een door V1.192 geschreven bron exact in-place (`repairLegacySource`, ETag + readback). Ontvangsten met
`resultaat.v=1` en status `verwerkt` worden daarom één keer opnieuw (idempotent) verwerkt; nieuw resultaat is `v=2`.
