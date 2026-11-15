# Gecontroleerde Rapportages-activering

Eigenaar huidige Codex-sessie, branch task/reports-native-activation-20261115 vanaf
actuele main ee3c09f (#177, V1.118). Gebruiker autoriseert publicatie en activering;
andere uitvoering is gestopt, niemand anders gebruikt/wijzigt de site tijdens dit
werk. De ingelogde gebruikerstest doet de gebruiker later zelf.

Scope: vaste main/OIDC-cutover starten na afzonderlijke bevestiging van Vercel en
Apps Script op bestaande deployment; elf minuten drain, volledige read-only
bron/doel/File-eindvalidatie, conditionele authority en onafhankelijke teruglezing.
Geen nieuwe bedrijfsgegevens/testmails, geen schemawijziging of opruiming.
Workflow en voortgangs-/publicatiebewijzen, websiteversie V1.119. De bestaande
originele delegatie-eindtijd blijft strikt gelden. Een conflict wordt niet gerepareerd.

Registratie vóór implementatie; beide productiepublicaties worden nu gecontroleerd.

Publicatievoorwaarde geslaagd op 15 november:
- Vercel productie ee3c09f READY, versie V1.118 daadwerkelijk teruggelezen.
- Cutoverroute geeft uitsluitend protocolmarker 1 op publieke GET/405.
- Apps Script-run 43689986563 geslaagd: versie 93 op dezelfde bestaande webapp,
  56 bronbestanden teruggelezen en gelijk aan geteste main.

Deze branch voegt uitsluitend de eigen main-pushtrigger en een publieke
protocolcontrole vóór OIDC/start toe. De backend/provider uit #177 blijft gelijk.
Eindvergelijking en activering zijn nog niet als geslaagd gemeld.

Gewijzigde expliciete opdracht van de gebruiker: laatste schrijfstop overslaan en
nu publiceren; gebruiker meldt eventuele fouten later. Daarom geen elfminuten-
drain/urenlange eindvergelijking. De volledige eerder voltooide read-only controle
blijft het bewijs. Voeg een onmiddellijke atomische writerwissel toe, met korte
metadata-/checkpointcontrole en onafhankelijke teruglezing. Presenteer dit niet
als een nieuwe volledige eindvalidatie onder schrijfstop. Scope nu ook eigen
cutover/authority/protocol en bestaande Apps Script-fence; oorspronkelijke begrensde
machtiging, actuele rechten, geen dubbele schrijvers/verzending blijven gelden.

Directe route gebouwd: protocol 2 wacht op de native/Google-capability en verwijst
naar het oorspronkelijke complete read-only checkpoint. Geen freeze/drain/full
final-validator; flags maken dat onderscheid expliciet. Atomische metadata-/lease-
check plus writerwissel gebruikt één ScriptLock, inclusief web-commit. Daarna CAS
van de native authority en serverteruglezing. Beide autoriteiten ondersteunen deze
expliciete modus; oorspronkelijke machtiging wordt niet verlengd.
