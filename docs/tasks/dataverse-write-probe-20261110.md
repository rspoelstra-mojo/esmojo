# Dataverse schrijfproef

Eigenaar Codex, task/dataverse-write-probe-20261110. Gebruiker bevestigt expliciet
één fictief record aanmaken, teruglezen, wijzigen en controleren in crf9f_tabel1.
Geen echte gegevens of migratie. Eén vaste technische test-ID; create-only en
ETag-controle voorkomen duplicaten en overschrijven van onbekende inhoud.
Geen verwijderen; testrecord blijft herkenbaar in de testtabel. Zelfde beheerder,
MFA, bevestigde ontwikkelhost en servergeheimen; geen tokens/records in logs.
Scope huidige Dataverse-testservice, actievalidatie, testpagina en controles.
PR API niet beschikbaar; taakbranch als registratie. Website blijft V1.99.

Uitgevoerd: derde knop Schrijfproef uitvoeren, alleen op bewuste klik. Server
bepaalt primaire naamkolom uit metadata. PATCH met If-None-Match:* maakt alleen
de vaste test-ID aan; teruglezen controleert herkenbare testinhoud. PATCH met
ETag wijzigt de testnaam; laatste GET bevestigt de wijziging. Herhalen gebruikt
dezelfde ID en toetst het schrijfrecht opnieuw. Geen automatische herpogingen
of verwijderen. Onbekende inhoud, versieconflict en rechtenfouten falen gesloten.

Gecontroleerd: 13 service-/integratietests (inclusief herhalen, concurrency en
behoud onbekende inhoud), bestaande accounttests plus schrijfautorisatie,
browser expliciete juiste actie/singleflight/negen resultaatregels, build,
bestaande Apps Script-/Drive-/publicatietests en git diff --check. Echte
Microsoft-schrijfproef start uitsluitend via de eigen beheerderssessie van
gebruiker na publicatie; resultaat nog niet bekend.
