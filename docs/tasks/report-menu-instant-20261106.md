# Rapportagesmenu direct zichtbaar en actueel

Eigenaar Codex; branch task/report-menu-instant-20261106.

Gebruikersvraag: bekende rapportages direct zichtbaar zoals Shows, nieuwe
rapportages op elk moment kunnen ontdekken. Behoud vormgeving, selectie, zoeken,
modulecontrole en beveiligde rapportinhoud. Onderzoek huidige sessiecache en
verversing; voorkom minuutblokkade bij heropenen/focus en behoud bestaande lijst
tijdens een achtergrondcontrole. Gebruiker heeft uitsluitend lokale menupersistentie
(artiest, concert-ID, zaal en beschikbare datums) expliciet toegestaan. Scope report-catalogue-cache, reports-page, main-opstart en
bijbehorende regressie-/browsertests. Geen incidenten of accounts cachen.

Gebouwd binnen bestaande sessieopslag: openen/focus/zichtbaar worden controleert
meteen opnieuw, gelijktijdige aanvragen worden gedeeld, zichtbaar menu blijft
staan en controle iedere 30 seconden. Ook buiten Rapportages blijft de bestaande
sessie-/modulecontrole de inventaris op de achtergrond voorladen. Bevestigd met
unit-/catalogus-/opstarttests, build en echte browser: oude links synchroon,
nieuwe link zonder selectiesprong, focus zonder minuutwachttijd, geen timers of
focusacties na verlaten. De aanvullende persistente whitelist is inmiddels eveneens gecontroleerd met
een echte browserrefresh en expliciete tests voor uitgesloten gegevens.

Gebruiker heeft nu expliciet ingestemd: “Ja, alleen deze menugegevens lokaal
bewaren”. Whitelist voor artiest/ID/zaal/datums geïmplementeerd, zonder
revisiehashes, accountscope of rapportinhoud. Cache wordt vóór sessie-/modulecheck
niet getoond; succesvolle lege respons vervangt oude lijst. Corrupte/geblokkeerde
opslag blijft optioneel. Publicatie V1.62 na de volledige controles.
