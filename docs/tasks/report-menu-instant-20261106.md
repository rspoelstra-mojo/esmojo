# Rapportagesmenu direct zichtbaar en actueel

Eigenaar Codex; branch task/report-menu-instant-20261106.

Gebruikersvraag: bekende rapportages direct zichtbaar zoals Shows, nieuwe
rapportages op elk moment kunnen ontdekken. Behoud vormgeving, selectie, zoeken,
modulecontrole en beveiligde rapportinhoud. Onderzoek huidige sessiecache en
verversing; voorkom minuutblokkade bij heropenen/focus en behoud bestaande lijst
tijdens een achtergrondcontrole. Lokale menupersistentie is als expliciete
classificatie-/opslagvraag aan de gebruiker voorgelegd; nog niet implementeren
zonder antwoord. Scope report-catalogue-cache, reports-page, main-opstart en
bijbehorende regressie-/browsertests. Geen incidenten of accounts cachen.

Gebouwd binnen bestaande sessieopslag: openen/focus/zichtbaar worden controleert
meteen opnieuw, gelijktijdige aanvragen worden gedeeld, zichtbaar menu blijft
staan en controle iedere 30 seconden. Ook buiten Rapportages blijft de bestaande
sessie-/modulecontrole de inventaris op de achtergrond voorladen. Bevestigd met
unit-/catalogus-/opstarttests, build en echte browser: oude links synchroon,
nieuwe link zonder selectiesprong, focus zonder minuutwachttijd, geen timers of
focusacties na verlaten. Persistente opslag en publicatie wachten op het antwoord
op de expliciete lokale-opslagvraag; geen privédata naar browseropslag geschreven.
