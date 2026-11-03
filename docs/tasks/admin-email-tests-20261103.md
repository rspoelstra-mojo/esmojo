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
