# Centrale meldingen voor opslagfouten

Eigenaar Codex, branch task/unified-save-errors-20261106. Vervang losse rode
opslagmeldingen in de pagina door de bestaande melding rechtsonder. Ondersteun
een optionele tekstactie Opnieuw proberen met dezelfde vorm als Bekijken.
Hergebruik expliciete herstelacties met bestaande revisiechecks; geen automatische
herhaling van onzekere writes. Behoud invoer, sessiebeveiliging en afsluitwaarschuwing.
Onderzoek overige paginafeedback voor een consistente presentatie; lokale
veldvalidatie en echte workflowstatussen blijven eigen bediening.
Verwacht clientmodules, centrale meldingen/queues, relevante tests/documentatie;
geen nieuwe opslagdienst, geen echte mail of productiewrite voor tests.

Gebruikersaanvulling: barrierkeuze direct lokaal bijwerken (standaard = Geen risico,
Afwijkend ontwerp = geen voorselectie) en geen automatische concept-/afrondwrites
bij selecteren of typen. Pas Opslaan in risicobeoordeling bevestigt de beoordeling;
de bewuste opslag blijft op de achtergrond. Behoud afwijkend ontwerp/uploadvalidatie.

Vloerdruk krijgt eveneens uitsluitend expliciete opslag via de afrondknop, zonder
conceptwrites door typen/blur/keuzes. Gebruiker vraagt bovendien één automatische
tweede poging vóór foutmelding. Alleen tijdelijke netwerk-/dienstfouten opnieuw
behandelen met hetzelfde verzoek en bestaande idempotentie/revisiecontroles;
waar mogelijk eerst teruglezen. Geen conflicten/rechten/validatiefouten blind
herhalen of nieuwe account-/mailacties dupliceren.

Nieuwe gebruikersaanvulling: verwijder PDF-bijlage uit nieuwe showrapportagemails;
blauwe onlineknop behouden. Nieuwe versie van mailsnapshot vastleggen; oude
onzekere afleveringen behouden oorspronkelijke inhoud/bijlage op dezelfde sleutel.
PDF-generatie/download zelf blijft bestaan. Geen echte testmails versturen.

Uitgevoerd in V1.56. Centrale feedback met resource-deduplicatie, expliciete
herstelacties en sessiegebonden callbacks; alleen toegestane tijdelijke showwrites
krijgen één stille herpoging. Risico-/maatregel-/showprofiel-/ticket-/account-/
beheerfeedback gebruikt de centrale presentatie. Barrier en vloerdruk bewaren
lokale invoer zonder conceptrequests; standaard Geen risico en custom-deselectie
zijn synchroon. Custombestanden gaan pas bij Opslaan serieel naar Drive.
Nieuwe rapportagemails gebruiken v3 zonder bijlage; bestaande v1/v2-herpogingen
behouden hun oorspronkelijke bytes/inhoud. Afzender/knop/onderwerp/trigger behouden.

Validatie: lokale CI-suite met hercontrole van aangepaste VM-fixtures; build en
diff-check. Nieuwe tests voor centrale acties, dubbelklikken, afmelden en één
stille retry; signed Drive-fixtures bewijzen teruglezen zonder dubbele write en
één historieregel na verloren afrondbevestiging. Chromium test directe selecties,
geen write vóór expliciet Opslaan (ook bij blur/navigatie), lokale invoer,
custombestand pas bij Save (draft/upload/complete), directe berekeningen,
transiente/blijvende fouten, toastacties en licht/donker 390–1440px. Bestaande
maatregel- en formulierbrowsers slagen inclusief achtergrondnavigatie, foutbehoud,
revisies en leases. E-mailpreviews 320–1024px; serialized providerfixture heeft
geen PDF-bijlage. Geen echte accounts, mails of vertrouwelijke productiewrites.
