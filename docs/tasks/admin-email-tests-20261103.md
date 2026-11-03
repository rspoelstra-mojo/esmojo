# Beheerder → Email en automatisch template-overzicht

Eigenaar: Codex, deze chat. Branch: task/admin-email-tests-20261103.

Voeg submenu Email toe en een compacte fluid-pagina met templatekeuze en knop
Testmail versturen. Alleen beheerder met geldige MFA/sessie, ontvanger uitsluitend
het actuele eigen accountadres uit Drive. Testonderwerp gemarkeerd en geen
account/token-aanmaak. Hergebruik centrale opmaak en bestaande Resend-afzender.

Alle templates staan in server/email-templates/*.js; het serveroverzicht ontdekt
de modules automatisch. Een nieuw geldig template verschijnt zonder UI- of
lijstwijziging. Huidig accounttemplate krijgt een veilige testvariant; bestaande
accounttriggers blijven behouden. Toekomstige showtemplates gebruiken echte
gekoppelde concertmetadata. Geen andere zakelijke mailtypen toevoegen.

Voorkom dubbelklikken en gebruik een idempotentiesleutel bij Resend voor herpoging
van dezelfde testaanvraag. Geen echte mails sturen vanuit de ontwikkeltests.
Bestanden: registry/service, accounttemplate-module/compatibiliteitsexport, API,
admin-UI/router, mailtransport, relevante tests en documentatie. Versie V1.19.
Publicatie volgens de doorlopende expliciete toestemming in AGENTS.md.

Aanvullend verzoek: Bezoekersanalyse en Artiestanalyse krijgen exact gelijke
breedtes wanneer ze naast elkaar staan. Wijzig alleen de 1:1.15-verhouding in
de fluid-showprofielkolommen naar 1:1; zijbalk, lettertypen en breakpoints behouden.
Extra bestand: src/layouts/fluid-layout.css.

Controles: accounts-API 25 tests, centrale renderer/transport 7 tests, automatisch
register/testservice 3 tests en productiebuild geslaagd. Browser met uitsluitend
fictieve API-fixtures: automatisch extra template, showkeuze, geen verzending bij
openen, expliciete enkele verzending/dubbelklikblokkering en eigen ontvanger.
Geen overflow op 390/1280/1920px. Analysekaarten op 1280/1440/1920/2560px exact
even breed (618/778/599/919px); laatste twee naast elkaar, eerste twee gestapeld.
Geen echte e-mails verzonden tijdens ontwikkeling.
