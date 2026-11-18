# CSV-rapportageaanlevering: ontvangst naar rapportage (overname)

Eigenaar: Claude Code (overname van Codex: PR #249 ontvangsttabel gepubliceerd; PR #250 concertkoppeling is een onvoltooide draft).
Branch: task/claude-csv-intake-20261117-2240. Overlap: PR #250 (branch task/rapportage-concertkoppeling-20261117) wordt niet teruggemerged;
geschikte code (bestandsnaamherkenning) wordt gecontroleerd overgenomen. Raakt: Dataverse-schema/setup (Datatransitie), Reports-runtime, workers.

Doel: CSV in SharePoint -> Power Automate -> Dataverse-ontvangst -> ESMOJO koppelt aan één bestaand concert en verwerkt automatisch tot rapportage.
Bestaande parser/berekeningen/weergave blijven; Dataverse is de opslagautoriteit; geen Drive/Apps Script.

## Toegang (geverifieerd 17 november 2026)
GitHub (lezen/schrijven/PR's) en Vercel (runtimelogs) werken. In deze omgeving zijn géén Dataverse-gegevens beschikbaar: de ontvangstregel en de
bytes kan ik niet rechtstreeks teruglezen. Dat gebeurt uitsluitend via de beveiligde ESMOJO-routes (Datatransitie-knop/worker).

## Fasen (elk met eigen tests en publicatie)
1. Schema v2 van de ontvangst (bron-bytes, optionele bronhash, geverifieerde SHA-256, concert-lookup, status/pogingen) via de bestaande Datatransitie-knop.
2. Ontvangstservice: veilige lijst/controle van ontvangsten (rechten), volledige-bestandscontrole, concertkoppeling (eenduidig, geen overschrijven),
   statusovergangen met ETag/CAS en onafhankelijke teruglezing, hervatten en idempotentie.
3. Native publicatie: parser (bestaand) -> rapportage-rijen in de bestaande Dataverse-tabellen (CSV17, posities, identiteiten, oorspronkelijke CSV,
   versies, herkomst); pas publiceren na volledige controle; geen dubbele mails.
4. Worker/route (GitHub OIDC) + status in Datatransitie; manuele hervatting.
5. Power Automate-stappen samen met de gebruiker (één stap tegelijk).

Voortgang en concrete volgende stap staan in de PR-beschrijving.

## Voortgang (V1.190)

Fase 1a gebouwd: alleen-lezen ontvangstcontrole (server/report-intake/: repository, check, concertmatch
uit PR #250 herzien en overgenomen). Beheerder → Datatransitie krijgt de kaart "Ontvangen CSV's
controleren": leest de laatste 10 ontvangsten terug (File in 1 MiB-blokken, grootte, SHA-256 (eerste 16 tekens),
CSV-validatie met bestaande parser, concertmatch). Geen schrijfacties, geen inhoud. Nog niet gebouwd:
schema v2, status/koppeling schrijven, publicatie naar rapporttabellen, worker.
