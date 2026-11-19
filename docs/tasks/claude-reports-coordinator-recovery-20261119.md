# Herstel van de vastgezette Rapportages-coördinatie

Eigenaar: Claude Code. Branch: task/claude-reports-coordinator-recovery-20261119. Bestanden: server/dataverse-reports/operational.js (+ test), server/dataverse-reports/service.js, api/ontrack-reports-sync.js, .github/workflows/ontrack-reports.yml, server/online-report-mail.test.js, server/ontrack-report/service.test.js.

Aanleiding: de showrapportagemail-run faalt sinds 19 november ~00:34 UTC met REPORT_WRITE_UNCONFIRMED. De technische coördinatie van Rapportages (reports-runtime-coordination-v1) staat vast na een onzekere schrijfactie (`uncertain`), zoals ontworpen ("een onopgeloste write blijft gefenced voor gecontroleerde inspectie"), maar er was geen herstelroute. Alle bewerkingen via `operational.exclusive` falen daardoor (mail, mailselectie, CSV-verwerking, PDF-werk).
Gebruikersbesluit 19 november 2026: de controle en de herstelstap bouwen en uitvoeren.
Wijziging:
- `operational.inspect()` (alleen lezen, vaste niet-gevoelige velden) en `operational.recover()`: heft de fence alleen op als `uncertain` vaststaat, er geen actieve lease is, minstens de volledige leasetijd (15 min) sinds de laatste wijziging verstreken is en de coördinatorstatus geldig is. Eén conditionele write op de technische status; geen zakelijke gegevens gewijzigd, cursor ongewijzigd.
- Nieuwe workeroperaties `coordinator-inspect` en `coordinator-recover` in de Rapportages-service (worker-autorisatie zoals de mailsync). `reportsCoverage` (en dus de bestaande coverage-hash van de activatie) is bewust niet gewijzigd.
- /api/ontrack-reports-sync: strikte invoer: leeg = mail versturen, of exact `{coordinator:'inspect'|'recover'}`; alles anders geeft 400 VALIDATION. Foutcodes blijven vaste codewoorden.
- ontrack-reports.yml: handmatige invoer `operation` (mail | inspect | recover); standaard mail; de 15-minutenrun blijft mail.
Beperking: de herstelcontrole controleert de coördinatorinvarianten; of een eerdere afleveringsmail al is verstuurd, wordt niet opnieuw bepaald maar blijft beschermd door de bestaande vaste providersleutels en de 23-uursreviewgrens. De oorzaak van de oorspronkelijke onzekere write is onbekend; keert hij terug, dan zichtbaar via inspect.
