# Websitebreed opslaan op de achtergrond

Eigenaar Codex, branch task/background-saves-20261106. Centrale verwerkingsteller,
afsluitwaarschuwing en zichtbare fouten; bestaande queues blijven in sessiegeheugen.
Risico's/maatregelen direct verlaten bij afronden, overige Opslaan-formulieren ook
vrijgeven na lokale validatie. Behoud bevestigde serverstatus, revisiechecks en
account-/MFA-/modulecontroles. Geen vertrouwelijke persistente browseropslag.
Onderzoek alle opslagflows inclusief tickets, profiel/accounts en beheerinstellingen.
Authenticatie blijft daadwerkelijk bevestigd voordat toegang wordt verleend.

Gebruikersaanvullingen tijdens uitvoering meegenomen: direct autosave-tekstvak
Beheersmaatregel, na afronding vergrendeld (UI/server), geen statustekst onder de
knop, briefing Nee links/Ja rechts, gedeelde uitgelijnde terugpijl op alle relevante
detailpagina's, webincidenttypes top vijf en tijdtooltip/geplande grafiekgrenzen.

Implementatie omvat centrale sessiegeheugen-activiteit/foutmelding, queueproviders,
actuele revisies, navigatievriendelijke risico/maatregel/account/analyse/ticket-
flows, leasebehoud, sessiegeneratie en standaard beforeunload. Geen nieuwe diensten,
persistente browseropslag, testmails of productiewrites. Vertrouwelijke routes en
bestaande mail-/PDF-/KPI-logica behouden. Browser bepaalt bij native afsluiten de
precieze waarschuwingstekst. Versie V1.54; publicatie via PR #100.

Controles: relevante bestaande CI-suite; nieuwe centrale queue/afsluit-/sessie-
tests en tijdschema-as-tests. Browser met echte showpagina en signed Drive-fixture:
vertraagde afronding, onmiddellijke andere tab, native afsluitwaarschuwing, autosave,
fouten/herpoging, definitieve tekst, pijluitlijning, gelijke kaarten en 1920/1440/
900/700/390px in licht/donker. Aparte formulierenbrowser voor account/ticket/analyse,
plus rapportagebrowser voor top vijf, tooltip, keyboard, asgrenzen en PDF-selectiebehoud.
